import {
  AudioLines, Blend, Captions, Download, Film, Flag, Music, ScanSearch, Scissors, SlidersHorizontal, Speech, Type, ZoomIn,
  type LucideIcon
} from 'lucide-react'
import type { NodeType } from '@shared/types'
import { NODE_DEFS } from '@shared/nodeDefs'

const MAP: Record<string, LucideIcon> = {
  Film, ScanSearch, AudioLines, Scissors, Captions, Type, ZoomIn, SlidersHorizontal, Music, Blend, Flag, Download, Speech
}

export function NodeIcon({ type, size = 16 }: { type: NodeType; size?: number }): React.JSX.Element {
  const I = MAP[NODE_DEFS[type].icon] ?? Film
  return <I size={size} strokeWidth={1.9} />
}
