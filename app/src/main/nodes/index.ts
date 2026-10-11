import type { NodeType } from '../../shared/types'
import type { NodeImpl } from '../engine/context'
import { audioNode, musicNode } from './audio'
import { silenceNode, transitionsNode, zoomNode } from './edit'
import { exportNode } from './export'
import { endscreenNode, subtitlesNode, textsNode } from './graphics'
import { analyzeNode, importNode } from './source'
import { transcribeNode } from './transcribe'
import { voiceoverNode } from './voiceover'

export const NODE_IMPLS: Record<NodeType, NodeImpl> = {
  import: importNode,
  analyze: analyzeNode,
  transcribe: transcribeNode,
  silence: silenceNode,
  subtitles: subtitlesNode,
  texts: textsNode,
  zoom: zoomNode,
  audio: audioNode,
  music: musicNode,
  transitions: transitionsNode,
  endscreen: endscreenNode,
  export: exportNode,
  voiceover: voiceoverNode
}
