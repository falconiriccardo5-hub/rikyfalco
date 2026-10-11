import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background, BackgroundVariant, Controls, MiniMap, ReactFlow, applyNodeChanges, useReactFlow,
  type Edge, type EdgeChange, type Node, type NodeChange, type Connection
} from '@xyflow/react'
import { ArrowDown, ArrowUp, Copy, LayoutGrid, Maximize, Play, PlayCircle, Power, RotateCcw, Trash2 } from 'lucide-react'
import { NODE_DEFS } from '@shared/nodeDefs'
import { parentOf, topoOrder } from '@shared/graph'
import type { NodeType, Workflow } from '@shared/types'
import { useHashes } from '../store/hooks'
import { displayStatus } from '../lib/util'
import {
  addNode, connect, deleteEdges, deleteNodes, duplicateNode, moveInChain, patchNode, runNodes, selectNode,
  setPositions, toast, updateNodeSettings, useStore
} from '../store/store'
import { FlowNode } from './FlowNode'

const nodeTypes = { flow: FlowNode }

/** Disposizione automatica: colonne per profondità, a capo ogni 4 colonne. */
function autoLayout(wf: Workflow): { id: string; position: { x: number; y: number } }[] {
  const depth = new Map<string, number>()
  for (const n of topoOrder(wf)) {
    const p = parentOf(wf, n.id)
    depth.set(n.id, p ? (depth.get(p.id) ?? 0) + 1 : 0)
  }
  const perCol = new Map<number, number>()
  const out: { id: string; position: { x: number; y: number } }[] = []
  const maxRows = Math.max(1, ...[...depth.values()].map((d) => [...depth.values()].filter((x) => x === d).length))
  for (const n of topoOrder(wf)) {
    const d = depth.get(n.id) ?? 0
    const row = perCol.get(d) ?? 0
    perCol.set(d, row + 1)
    const block = Math.floor(d / 4)
    out.push({ id: n.id, position: { x: (d % 4) * 290, y: block * (maxRows * 200) + row * 200 } })
  }
  return out
}

interface Menu {
  x: number
  y: number
  nodeId: string
}

export function WorkflowEditor(): React.JSX.Element {
  const workflow = useStore((s) => s.project!.workflow)
  const selected = useStore((s) => s.selected)
  const runtimes = useStore((s) => s.runtimes)
  const running = useStore((s) => s.running)
  const hashes = useHashes()
  const rf = useReactFlow()
  const [nodes, setNodes] = useState<Node[]>([])
  const [menu, setMenu] = useState<Menu | null>(null)
  const [selEdges, setSelEdges] = useState<string[]>([])

  useEffect(() => {
    setNodes((prev) =>
      workflow.nodes.map((n) => {
        const old = prev.find((p) => p.id === n.id)
        return { id: n.id, type: 'flow', position: old?.dragging ? old.position : n.position, data: {}, selected: n.id === selected, dragging: old?.dragging }
      })
    )
  }, [workflow, selected])

  const edges: Edge[] = useMemo(
    () =>
      workflow.edges.map((e) => {
        const ts = displayStatus(runtimes[e.target], hashes.get(e.target))
        const ss = displayStatus(runtimes[e.source], hashes.get(e.source))
        const cls = ts === 'running' ? 'e-running' : ts === 'queued' ? 'e-queued' : ss === 'done' && ts === 'done' ? 'e-done' : ''
        return { id: e.id, source: e.source, target: e.target, className: cls, animated: false, selected: selEdges.includes(e.id) }
      }),
    [workflow.edges, runtimes, hashes, selEdges]
  )

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setSelEdges((cur) => {
      let next = cur
      for (const c of changes) {
        if (c.type !== 'select') continue
        next = c.selected ? [...next.filter((x) => x !== c.id), c.id] : next.filter((x) => x !== c.id)
      }
      return next
    })
  }, [])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes.filter((c) => c.type !== 'remove' && c.type !== 'select'), nds))
  }, [])

  const onConnect = useCallback((c: Connection) => {
    if (c.source && c.target) connect(c.source, c.target)
  }, [])

  const onDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    const position = rf.screenToFlowPosition({ x: e.clientX - 118, y: e.clientY - 40 })
    const type = e.dataTransfer.getData('application/flowcut-node') as NodeType
    if (type && NODE_DEFS[type]) {
      addNode(type, position, null)
      return
    }
    const mediaId = e.dataTransfer.getData('application/flowcut-media')
    if (mediaId) {
      const m = useStore.getState().project?.media.find((x) => x.id === mediaId)
      if (!m) return
      if (m.kind === 'image') return toast('Le immagini si aggiungono dal nodo "Testi e grafiche" o "Schermata finale".')
      const id = addNode(m.kind === 'video' ? 'import' : 'music', position, null)
      if (id) updateNodeSettings(id, { mediaId: m.id })
    }
  }

  const node = menu ? workflow.nodes.find((n) => n.id === menu.nodeId) : undefined
  const st = node ? displayStatus(runtimes[node.id], hashes.get(node.id)) : 'idle'

  return (
    <div className="flow-wrap" onDragOver={(e) => e.preventDefault()} onDrop={onDrop} onClick={() => setMenu(null)}>
      <div className="canvas-toolbar">
        <button className="btn ghost sm" onClick={() => rf.fitView({ padding: 0.12, maxZoom: 1, duration: 300 })} title="Adatta alla vista">
          <Maximize size={14} /> Adatta
        </button>
        <button
          className="btn ghost sm"
          onClick={() => {
            setPositions(autoLayout(workflow))
            setTimeout(() => rf.fitView({ padding: 0.12, maxZoom: 1, duration: 300 }), 50)
          }}
          title="Riordina automaticamente i nodi"
        >
          <LayoutGrid size={14} /> Riordina
        </button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, n) => selectNode(n.id)}
        onPaneClick={() => {
          selectNode(null)
          setMenu(null)
        }}
        onNodeDragStop={(_, __, dragged) => setPositions(dragged.map((d) => ({ id: d.id, position: d.position })))}
        onNodesDelete={(ns) => deleteNodes(ns.map((n) => n.id))}
        onEdgesDelete={(es) => deleteEdges(es.map((e) => e.id))}
        onNodeContextMenu={(e, n) => {
          e.preventDefault()
          selectNode(n.id)
          setMenu({ x: e.clientX, y: e.clientY, nodeId: n.id })
        }}
        deleteKeyCode={['Delete', 'Backspace']}
        fitView
        fitViewOptions={{ padding: 0.12, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'default' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.6} color="var(--canvas-dot)" />
        <Controls showInteractive={false} position="bottom-right" />
        <MiniMap pannable zoomable position="top-right" nodeColor="var(--panel-3)" maskColor="rgba(0,0,0,0.25)" style={{ width: 150, height: 96 }} />
      </ReactFlow>
      {!workflow.nodes.length && <div className="canvas-hint">Trascina i nodi dalla scheda "Nodi" per costruire il workflow</div>}
      {menu && node && (
        <div className="ctx-menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <button disabled={running} onClick={() => { setMenu(null); void runNodes([node.id], st === 'done') }}>
            <Play size={14} /> {st === 'done' ? 'Riesegui nodo' : 'Esegui fino a qui'}
          </button>
          <button disabled={running} onClick={() => { setMenu(null); void runNodes([node.id], true) }}>
            <RotateCcw size={14} /> Forza riesecuzione
          </button>
          <button disabled={running} onClick={() => { setMenu(null); void runNodes() }}>
            <PlayCircle size={14} /> Esegui tutto il workflow
          </button>
          <hr />
          <button onClick={() => { setMenu(null); moveInChain(node.id, -1) }}>
            <ArrowUp size={14} /> Sposta prima
          </button>
          <button onClick={() => { setMenu(null); moveInChain(node.id, 1) }}>
            <ArrowDown size={14} /> Sposta dopo
          </button>
          <button onClick={() => { setMenu(null); duplicateNode(node.id) }}>
            <Copy size={14} /> Duplica <span className="spacer" /> <kbd>Ctrl D</kbd>
          </button>
          {NODE_DEFS[node.type].hasInput && NODE_DEFS[node.type].hasOutput && (
            <button onClick={() => { setMenu(null); patchNode(node.id, { bypass: !node.bypass }) }}>
              <Power size={14} /> {node.bypass ? 'Riattiva' : 'Disattiva (bypass)'}
            </button>
          )}
          <hr />
          <button className="danger" onClick={() => { setMenu(null); deleteNodes([node.id]) }}>
            <Trash2 size={14} /> Elimina <span className="spacer" /> <kbd>Canc</kbd>
          </button>
        </div>
      )}
    </div>
  )
}
