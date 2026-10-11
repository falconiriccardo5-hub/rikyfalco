import { newId } from '@shared/graph'
import type { MediaItem, Workflow } from '@shared/types'

/** Copia un modello con nuovi id e collega automaticamente il primo video del progetto. */
export function cloneWorkflowForProject(wf: Workflow, media: MediaItem[]): Workflow {
  const map = new Map<string, string>()
  const nodes = wf.nodes.map((n) => {
    const id = newId(n.type.slice(0, 3))
    map.set(n.id, id)
    const copy = JSON.parse(JSON.stringify(n)) as typeof n
    copy.id = id
    if (copy.type === 'import' && !copy.settings.mediaId) {
      const v = media.find((m) => m.kind === 'video' && !m.missing)
      if (v) copy.settings.mediaId = v.id
    }
    return copy
  })
  const edges = wf.edges
    .filter((e) => map.has(e.source) && map.has(e.target))
    .map((e) => ({ id: newId('e'), source: map.get(e.source)!, target: map.get(e.target)! }))
  return { nodes, edges }
}
