import { useEffect, useMemo } from 'react'
import { computeHashes, hashEnvFor } from '@shared/graph'
import type { NodeStatus, Timeline } from '@shared/types'
import { displayStatus } from '../lib/util'
import { fetchOutput, useStore } from './store'

export function useHashes(): Map<string, string> {
  const workflow = useStore((s) => s.project?.workflow)
  const media = useStore((s) => s.project?.media)
  const settings = useStore((s) => s.settings)
  return useMemo(
    () => (workflow && media && settings ? computeHashes(workflow, media, hashEnvFor(settings)) : new Map<string, string>()),
    [workflow, media, settings]
  )
}

export function useNodeStatus(nodeId: string): NodeStatus {
  const hashes = useHashes()
  const rt = useStore((s) => s.runtimes[nodeId])
  return displayStatus(rt, hashes.get(nodeId))
}

/** Timeline in uscita dal nodo (null se non ancora eseguito). */
export function useNodeOutput(nodeId: string | null | undefined): Timeline | null {
  const out = useStore((s) => (nodeId ? s.outputs[nodeId] : undefined))
  const status = useStore((s) => (nodeId ? s.runtimes[nodeId]?.status : undefined))
  useEffect(() => {
    if (nodeId && out === undefined && status === 'done') void fetchOutput(nodeId)
  }, [nodeId, out, status])
  return out ?? null
}
