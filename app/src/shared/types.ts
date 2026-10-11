// Tipi condivisi tra processo principale (motore) e interfaccia.
// Tutti i tempi sono in secondi. Salvo dove indicato, i tempi si riferiscono
// al video ORIGINALE ("tempo sorgente"): la mappatura verso il tempo del video
// finale avviene in fase di compilazione (vedi shared/timeline.ts).

export interface Range {
  start: number
  end: number
}

export interface MediaInfo {
  path: string
  sizeBytes: number
  mtimeMs: number
  formatName: string
  duration: number
  hasVideo: boolean
  hasAudio: boolean
  width: number
  height: number
  fps: number
  videoCodec?: string
  pixFmt?: string
  rotation?: number
  audioCodec?: string
  sampleRate?: number
  channels?: number
  bitRate?: number
}

export type MediaKind = 'video' | 'audio' | 'image'

export interface MediaItem {
  id: string
  kind: MediaKind
  path: string
  name: string
  info?: MediaInfo
  missing?: boolean
}

export interface Word {
  start: number
  end: number
  text: string
}

export interface Transcript {
  language: string
  engine: string
  words: Word[]
  text: string
}

export interface Cue {
  id: string
  start: number
  end: number
  text: string
  /** Parole con tempi (tempo sorgente). Assenti se il testo è stato modificato a mano. */
  words?: Word[]
}

export type SubtitleAnimation = 'none' | 'fade' | 'pop' | 'highlight' | 'karaoke' | 'word'
export type VerticalPosition = 'top' | 'center' | 'bottom'

export interface SubtitleStyle {
  font: string
  /** Dimensione riferita a un'altezza di 1080 px; viene scalata sulla risoluzione finale. */
  fontSize: number
  bold: boolean
  uppercase: boolean
  color: string
  outlineColor: string
  outline: number
  shadow: number
  boxed: boolean
  boxColor: string
  boxOpacity: number
  position: VerticalPosition
  /** Margine verticale in percentuale dell'altezza. */
  marginV: number
  animation: SubtitleAnimation
  highlightColor: string
  keywords: string[]
}

export interface SubtitleTrack {
  cues: Cue[]
  style: SubtitleStyle
  burn: boolean
  exportSrt: boolean
  maxChars: number
}

export type TextPreset = 'minimal' | 'bold' | 'box' | 'accent' | 'lowerthird'
export type OverlayAnimation = 'none' | 'fade' | 'slide-up' | 'slide-left' | 'pop' | 'typewriter'

export interface Keyframe {
  /** Secondi dall'inizio dell'elemento. */
  t: number
  /** Posizione in percentuale della larghezza/altezza finale. */
  x: number
  y: number
  /** Scala percentuale (100 = dimensione normale). */
  scale: number
  /** Opacità 0-100. */
  opacity: number
}

export interface Overlay {
  id: string
  kind: 'text' | 'image'
  text: string
  /** Percorso immagine (solo kind=image). */
  imagePath?: string
  start: number
  duration: number
  preset: TextPreset
  /** Centro dell'elemento in percentuale (0-100). */
  x: number
  y: number
  /** Dimensione font riferita a 1080p (testo) o larghezza percentuale (immagine). */
  size: number
  color: string
  animationIn: OverlayAnimation
  animationOut: OverlayAnimation
  animDuration: number
  keyframes: Keyframe[]
  font?: string
}

export interface ZoomEffect {
  id: string
  start: number
  end: number
  scale: number
  /** Centro dello zoom in percentuale. */
  x: number
  y: number
  /** Durata della rampa di entrata/uscita (0 = stacco netto). */
  ease: number
}

export interface ZoomKeyframe {
  /** Tempo sorgente. */
  t: number
  scale: number
  x: number
  y: number
}

export interface AudioFx {
  denoise: 'off' | 'light' | 'medium' | 'strong'
  highpass: number
  deesser: boolean
  compressor: boolean
  normalize: boolean
  targetLufs: number
  truePeak: number
  voiceGainDb: number
  /** Valori misurati dalla prima passata di loudnorm (JSON di FFmpeg). */
  measured?: Record<string, string>
}

export interface MusicTrack {
  path: string
  volumeDb: number
  fadeIn: number
  fadeOut: number
  ducking: 'off' | 'light' | 'medium' | 'strong'
  startOffset: number
  loop: boolean
  coverEndscreen: boolean
}

export type XfadeType =
  | 'fade' | 'fadeblack' | 'fadewhite' | 'dissolve' | 'zoomin' | 'slideleft' | 'slideright'
  | 'slideup' | 'wipeleft' | 'wiperight' | 'circleopen' | 'circleclose' | 'smoothleft'
  | 'pixelize' | 'radial' | 'hblur' | 'distance'

export interface TransitionSpec {
  type: XfadeType
  duration: number
  /** Punti di taglio (tempo sorgente = fine del segmento che precede il taglio). */
  cutPoints: number[]
  fadeInStart: number
  fadeOutEnd: number
}

export interface EndScreen {
  duration: number
  bgColor: string
  bgImagePath?: string
  title: string
  subtitle: string
  cta: string
  accentColor: string
  logoPath?: string
  logoSize: number
  fade: number
  font: string
}

export interface AnalysisData {
  audioPath?: string
  waveformPath?: string
  meanVolume?: number
  maxVolume?: number
  integratedLufs?: number
  scenes?: number[]
  thumbnails?: string[]
}

/** Dati che scorrono tra i nodi del workflow. */
export interface Timeline {
  source: MediaInfo
  previewPath: string
  analysis: AnalysisData
  transcript?: Transcript
  /** Intervalli mantenuti del video sorgente (ordinati, non sovrapposti). */
  segments: Range[]
  subtitles?: SubtitleTrack
  overlays: Overlay[]
  zooms: ZoomEffect[]
  zoomKeyframes: ZoomKeyframe[]
  zoomSmooth: boolean
  audio?: AudioFx
  music?: MusicTrack
  transitions?: TransitionSpec
  endscreen?: EndScreen
}

// ---------------------------------------------------------------- workflow

export type NodeType =
  | 'import' | 'analyze' | 'transcribe' | 'silence' | 'subtitles' | 'texts'
  | 'zoom' | 'audio' | 'music' | 'transitions' | 'endscreen' | 'export'

export type NodeSettings = Record<string, unknown>

export interface WorkflowNode {
  id: string
  type: NodeType
  label?: string
  position: { x: number; y: number }
  settings: NodeSettings
  /** Nodo disattivato: viene attraversato senza modifiche. */
  bypass?: boolean
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
}

export interface Workflow {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export interface ProjectDoc {
  version: 1
  name: string
  createdAt: string
  updatedAt: string
  media: MediaItem[]
  workflow: Workflow
}

export type NodeStatus = 'idle' | 'queued' | 'running' | 'done' | 'error' | 'stale' | 'cancelled'

export interface ResultItem {
  label: string
  value: string
}

/** Riepilogo leggibile del risultato di un nodo. */
export interface NodeResult {
  summary: string
  items: ResultItem[]
  /** File prodotti dal nodo (percorso assoluto + etichetta). */
  files: { label: string; path: string }[]
  /** Dati specifici del nodo (es. elenco tagli proposti). */
  data?: Record<string, unknown>
  warnings?: string[]
}

export interface NodeRuntime {
  nodeId: string
  status: NodeStatus
  hash?: string
  progress?: number
  message?: string
  error?: string
  result?: NodeResult
  startedAt?: number
  finishedAt?: number
}

export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug'

export interface LogEntry {
  time: number
  level: LogLevel
  nodeId?: string
  message: string
}

export type EngineEvent =
  | { kind: 'status'; runtime: NodeRuntime }
  | { kind: 'progress'; nodeId: string; progress: number; message?: string }
  | { kind: 'log'; entry: LogEntry }
  | { kind: 'run-finished'; ok: boolean; cancelled: boolean }
  | { kind: 'download-progress'; id: string; received: number; total: number; done?: boolean; error?: string }

export interface RunRequest {
  projectDir: string
  project: ProjectDoc
  /** Nodi da eseguire (con i loro antenati se non aggiornati). Vuoto = tutto. */
  targets?: string[]
  /** Forza la riesecuzione dei nodi target anche se aggiornati. */
  force?: boolean
}

export interface PreviewRequest {
  projectDir: string
  project: ProjectDoc
  nodeId: string
  /** Inizio dell'anteprima nel tempo sorgente (null = dall'inizio). */
  fromSource?: number
  /** Durata in secondi (0 = intero video). */
  seconds: number
}

export interface AudioPreviewRequest {
  projectDir: string
  project: ProjectDoc
  nodeId: string
  fromSource: number
  seconds: number
}

export interface AppSettings {
  ffmpegPath: string
  ffprobePath: string
  whisperCliPath: string
  whisperModelPath: string
  pythonPath: string
  defaultLanguage: string
  theme: 'dark' | 'light' | 'system'
  threads: number
  recentProjects: string[]
  /** Accesso dal telefono (server sulla rete locale). */
  remoteEnabled: boolean
  remotePort: number
  /** Token dei dispositivi abbinati. */
  remoteTokens: string[]
}

export interface ToolStatus {
  ffmpeg: { ok: boolean; path: string; version?: string; error?: string }
  ffprobe: { ok: boolean; path: string; version?: string; error?: string }
  whisperCpp: { ok: boolean; path: string; error?: string }
  whisperModel: { ok: boolean; path: string; error?: string }
  fasterWhisper: { ok: boolean; python: string; error?: string }
  encoders: string[]
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  createdAt: string
  workflow: Workflow
}

export interface OpenProjectResult {
  dir: string
  project: ProjectDoc
  runtimes: NodeRuntime[]
}

// ---------------------------------------------------------------- accesso dal telefono

export interface RemoteStatus {
  enabled: boolean
  running: boolean
  port: number
  urls: string[]
  pairingCode: string
  devices: number
  error?: string
}

export type JobStatus = 'uploaded' | 'queued' | 'running' | 'done' | 'error' | 'cancelled'

export interface JobNodeState {
  id: string
  type: NodeType
  label: string
  status: NodeStatus
  progress?: number
  message?: string
  error?: string
  summary?: string
}

export interface JobOptions {
  /** Id del modello di workflow ('' = workflow predefinito). */
  templateId: string
  language: string
  /** Risoluzione di esportazione ('' = quella del modello). */
  resolution: string
  title: string
}

export interface RemoteJob {
  id: string
  name: string
  status: JobStatus
  createdAt: number
  finishedAt?: number
  options: JobOptions
  nodes: JobNodeState[]
  warnings: string[]
  error?: string
  resultName?: string
  resultSize?: number
  resultDuration?: number
}
