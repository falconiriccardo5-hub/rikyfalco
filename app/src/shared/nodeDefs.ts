// Catalogo dei nodi: nome, descrizione, icona, impostazioni predefinite e
// schema dei campi usato dal pannello proprietà.

import type { NodeSettings, NodeType } from './types'
import { PIPER_VOICES } from './voices'

export type FieldVisibility = (s: NodeSettings) => boolean

interface FieldBase {
  key: string
  label: string
  help?: string
  visibleIf?: FieldVisibility
}

export type Field =
  | (FieldBase & { kind: 'number'; min?: number; max?: number; step?: number; unit?: string })
  | (FieldBase & { kind: 'slider'; min: number; max: number; step: number; unit?: string })
  | (FieldBase & { kind: 'select'; options: { value: string | number; label: string }[] })
  | (FieldBase & { kind: 'text'; placeholder?: string })
  | (FieldBase & { kind: 'textarea'; placeholder?: string; rows?: number })
  | (FieldBase & { kind: 'color' })
  | (FieldBase & { kind: 'toggle' })
  | (FieldBase & { kind: 'media'; mediaKind: 'video' | 'audio' | 'image' })
  | (FieldBase & { kind: 'savePath'; extension: string })
  | (FieldBase & {
      kind: 'custom'
      editor: 'cuts' | 'ranges' | 'cues' | 'overlays' | 'zooms' | 'zoomKeyframes' | 'transitionPoints'
    })
  | { kind: 'section'; key: string; label: string; visibleIf?: FieldVisibility }

export interface NodeDef {
  type: NodeType
  name: string
  description: string
  /** Nome dell'icona lucide-react. */
  icon: string
  category: 'Sorgente' | 'Analisi' | 'Montaggio' | 'Grafica' | 'Audio' | 'Uscita'
  hasInput: boolean
  hasOutput: boolean
  inputLabel?: string
  outputLabel?: string
  defaults: NodeSettings
  fields: Field[]
  /** Funzione completamente implementata (nessun nodo "finto"). */
  implemented: boolean
  requires?: string
}

const fontOptions = [
  'Montserrat', 'Inter', 'Arial', 'Segoe UI', 'Helvetica', 'Verdana', 'Impact', 'Arial Black', 'Georgia'
].map((f) => ({ value: f, label: f }))

const animOptions = [
  { value: 'none', label: 'Nessuna' },
  { value: 'fade', label: 'Dissolvenza' },
  { value: 'slide-up', label: 'Scorrimento dal basso' },
  { value: 'slide-left', label: 'Scorrimento da destra' },
  { value: 'pop', label: 'Pop (scala)' },
  { value: 'typewriter', label: 'Macchina da scrivere' }
]

export const XFADE_OPTIONS = [
  { value: 'fade', label: 'Dissolvenza incrociata' },
  { value: 'fadeblack', label: 'Dissolvenza al nero' },
  { value: 'fadewhite', label: 'Dissolvenza al bianco' },
  { value: 'dissolve', label: 'Dissolvenza a grana' },
  { value: 'zoomin', label: 'Zoom in' },
  { value: 'smoothleft', label: 'Scorrimento morbido' },
  { value: 'slideleft', label: 'Slide a sinistra' },
  { value: 'slideright', label: 'Slide a destra' },
  { value: 'slideup', label: 'Slide in alto' },
  { value: 'wipeleft', label: 'Tendina a sinistra' },
  { value: 'wiperight', label: 'Tendina a destra' },
  { value: 'circleopen', label: 'Cerchio (apertura)' },
  { value: 'circleclose', label: 'Cerchio (chiusura)' },
  { value: 'radial', label: 'Radiale' },
  { value: 'pixelize', label: 'Pixel' },
  { value: 'hblur', label: 'Sfocatura orizzontale' },
  { value: 'distance', label: 'Distanza' }
]

export const LANGUAGES = [
  { value: 'auto', label: 'Rilevamento automatico' },
  { value: 'it', label: 'Italiano' },
  { value: 'en', label: 'Inglese' },
  { value: 'es', label: 'Spagnolo' },
  { value: 'fr', label: 'Francese' },
  { value: 'de', label: 'Tedesco' },
  { value: 'pt', label: 'Portoghese' }
]

export const RESOLUTIONS: { value: string; label: string; w: number; h: number }[] = [
  { value: 'source', label: 'Come la sorgente', w: 0, h: 0 },
  { value: '2160p', label: '4K 3840×2160', w: 3840, h: 2160 },
  { value: '1440p', label: '1440p 2560×1440', w: 2560, h: 1440 },
  { value: '1080p', label: 'Full HD 1920×1080', w: 1920, h: 1080 },
  { value: '720p', label: 'HD 1280×720', w: 1280, h: 720 },
  { value: 'v1080', label: 'Verticale 1080×1920 (Shorts/Reels)', w: 1080, h: 1920 },
  { value: 'v720', label: 'Verticale 720×1280', w: 720, h: 1280 },
  { value: 'sq1080', label: 'Quadrato 1080×1080', w: 1080, h: 1080 }
]

export const NODE_DEFS: Record<NodeType, NodeDef> = {
  import: {
    type: 'import',
    name: 'Importa video',
    description: 'Seleziona il video sorgente, legge durata, risoluzione e tracce. Crea un proxy se il formato non è riproducibile.',
    icon: 'Film',
    category: 'Sorgente',
    hasInput: false,
    hasOutput: true,
    outputLabel: 'Timeline',
    implemented: true,
    defaults: { mediaId: '', proxy: 'auto' },
    fields: [
      { kind: 'media', key: 'mediaId', label: 'Video sorgente', mediaKind: 'video' },
      {
        kind: 'select',
        key: 'proxy',
        label: 'Proxy di anteprima',
        help: 'Copia leggera (720p H.264) usata solo per la riproduzione nell\'app. L\'originale non viene mai modificato.',
        options: [
          { value: 'auto', label: 'Automatico (solo se necessario)' },
          { value: 'always', label: 'Sempre' },
          { value: 'never', label: 'Mai' }
        ]
      }
    ]
  },
  analyze: {
    type: 'analyze',
    name: 'Analisi contenuto',
    description: 'Estrae l\'audio, calcola forma d\'onda, volume e loudness, genera miniature e rileva i cambi scena.',
    icon: 'ScanSearch',
    category: 'Analisi',
    hasInput: true,
    hasOutput: true,
    implemented: true,
    defaults: { thumbnails: 12, loudness: true, scenes: false, sceneThreshold: 0.35 },
    fields: [
      { kind: 'number', key: 'thumbnails', label: 'Miniature', min: 0, max: 60, step: 1 },
      { kind: 'toggle', key: 'loudness', label: 'Misura volume e loudness (EBU R128)' },
      { kind: 'toggle', key: 'scenes', label: 'Rileva cambi scena', help: 'Richiede la decodifica completa del video.' },
      {
        kind: 'slider', key: 'sceneThreshold', label: 'Sensibilità cambi scena', min: 0.1, max: 0.8, step: 0.05,
        visibleIf: (s) => !!s.scenes
      }
    ]
  },
  transcribe: {
    type: 'transcribe',
    name: 'Trascrizione',
    description: 'Riconoscimento vocale locale con Whisper (whisper.cpp o faster-whisper). Produce le parole con i tempi.',
    icon: 'AudioLines',
    category: 'Analisi',
    hasInput: true,
    hasOutput: true,
    implemented: true,
    requires: 'whisper.cpp (whisper-cli + modello ggml) oppure Python con faster-whisper. Vedi Impostazioni.',
    defaults: { engine: 'whisper.cpp', language: 'it', model: 'small', prompt: '' },
    fields: [
      {
        kind: 'select',
        key: 'engine',
        label: 'Motore',
        options: [
          { value: 'whisper.cpp', label: 'whisper.cpp (consigliato su Windows)' },
          { value: 'faster-whisper', label: 'faster-whisper (Python)' }
        ]
      },
      { kind: 'select', key: 'language', label: 'Lingua', options: LANGUAGES },
      {
        kind: 'select',
        key: 'model',
        label: 'Modello faster-whisper',
        visibleIf: (s) => s.engine === 'faster-whisper',
        options: ['tiny', 'base', 'small', 'medium', 'large-v3'].map((m) => ({ value: m, label: m }))
      },
      {
        kind: 'textarea', key: 'prompt', label: 'Prompt iniziale (opzionale)', rows: 2,
        help: 'Nomi propri o termini tecnici che aiutano il riconoscimento.'
      }
    ]
  },
  silence: {
    type: 'silence',
    name: 'Taglio pause',
    description: 'Rileva silenzi e pause, propone i tagli e li applica mantenendo le parole riconosciute.',
    icon: 'Scissors',
    category: 'Montaggio',
    hasInput: true,
    hasOutput: true,
    implemented: true,
    defaults: {
      thresholdMode: 'auto',
      thresholdDb: -35,
      minSilence: 0.6,
      padding: 0.12,
      minKeep: 0.25,
      useWords: true,
      protectedRanges: [],
      manualCuts: [],
      disabledCuts: []
    },
    fields: [
      {
        kind: 'select',
        key: 'thresholdMode',
        label: 'Soglia di silenzio',
        options: [
          { value: 'auto', label: 'Automatica (dal volume medio)' },
          { value: 'manual', label: 'Manuale' }
        ]
      },
      {
        kind: 'slider', key: 'thresholdDb', label: 'Soglia', min: -70, max: -10, step: 1, unit: 'dB',
        visibleIf: (s) => s.thresholdMode === 'manual'
      },
      { kind: 'slider', key: 'minSilence', label: 'Durata minima da eliminare', min: 0.2, max: 3, step: 0.05, unit: 's' },
      { kind: 'slider', key: 'padding', label: 'Margine attorno al parlato', min: 0, max: 0.5, step: 0.01, unit: 's' },
      { kind: 'slider', key: 'minKeep', label: 'Frammento minimo da mantenere', min: 0, max: 1.5, step: 0.05, unit: 's' },
      { kind: 'toggle', key: 'useWords', label: 'Non tagliare dentro le parole (usa la trascrizione se presente)' },
      { kind: 'section', key: 's1', label: 'Tagli proposti' },
      { kind: 'custom', key: 'disabledCuts', label: 'Tagli', editor: 'cuts' },
      { kind: 'section', key: 's2', label: 'Intervalli manuali' },
      { kind: 'custom', key: 'protectedRanges', label: 'Da conservare sempre', editor: 'ranges' },
      { kind: 'custom', key: 'manualCuts', label: 'Da rimuovere manualmente', editor: 'ranges' }
    ]
  },
  voiceover: {
    type: 'voiceover',
    name: 'Voce narrante',
    description: 'Genera una voce parlata dal testo che scrivi (sintesi vocale locale con Piper) e la inserisce nel video. Può creare i sottotitoli dallo stesso testo.',
    icon: 'Speech',
    category: 'Audio',
    hasInput: true,
    hasOutput: true,
    implemented: true,
    requires: 'Piper e una voce: installali da Impostazioni → Voce narrante (gratis, funziona offline).',
    defaults: {
      script: '',
      voice: 'it_IT-paola-medium',
      speed: 1,
      startAt: 0.5,
      gap: 0.5,
      volumeDb: 0,
      original: 'duck',
      subtitlesFromText: true
    },
    fields: [
      {
        kind: 'textarea', key: 'script', label: 'Testo da leggere', rows: 7,
        placeholder: 'Ciao e benvenuti!\n0:20 Ora vediamo come si fa.',
        help: 'Una frase per riga. Facoltativo: all\'inizio della riga il momento del video finale in cui farla partire (es. 1:05). Le righe senza tempo vengono lette una dopo l\'altra.'
      },
      { kind: 'select', key: 'voice', label: 'Voce', options: PIPER_VOICES.map((v) => ({ value: v.id, label: v.label })) },
      { kind: 'slider', key: 'speed', label: 'Velocità', min: 0.7, max: 1.4, step: 0.05, unit: '×' },
      { kind: 'slider', key: 'startAt', label: 'Inizio della prima frase', min: 0, max: 30, step: 0.5, unit: 's' },
      { kind: 'slider', key: 'gap', label: 'Pausa tra le frasi', min: 0, max: 3, step: 0.1, unit: 's' },
      { kind: 'slider', key: 'volumeDb', label: 'Volume voce', min: -12, max: 12, step: 0.5, unit: 'dB' },
      {
        kind: 'select', key: 'original', label: 'Audio originale del video',
        options: [
          { value: 'duck', label: 'Abbassalo mentre parla la voce' },
          { value: 'keep', label: 'Mantienilo' },
          { value: 'mute', label: 'Toglilo' }
        ]
      },
      { kind: 'toggle', key: 'subtitlesFromText', label: 'Crea i sottotitoli da questo testo (al posto della trascrizione)' }
    ]
  },
  subtitles: {
    type: 'subtitles',
    name: 'Sottotitoli',
    description: 'Genera sottotitoli sincronizzati dalla trascrizione, con stile e animazioni. Esporta SRT e li incide nel video.',
    icon: 'Captions',
    category: 'Grafica',
    hasInput: true,
    hasOutput: true,
    implemented: true,
    defaults: {
      maxChars: 32,
      maxWords: 7,
      maxDuration: 4,
      font: 'Montserrat',
      fontSize: 70,
      bold: true,
      uppercase: false,
      color: '#FFFFFF',
      outlineColor: '#000000',
      outline: 4,
      shadow: 0,
      boxed: false,
      boxColor: '#000000',
      boxOpacity: 60,
      position: 'bottom',
      marginV: 9,
      animation: 'highlight',
      highlightColor: '#FF8A1F',
      keywords: '',
      burn: true,
      exportSrt: true,
      editedCues: null
    },
    fields: [
      { kind: 'section', key: 's0', label: 'Segmentazione' },
      { kind: 'number', key: 'maxChars', label: 'Caratteri max per riga', min: 8, max: 80, step: 1 },
      { kind: 'number', key: 'maxWords', label: 'Parole max per sottotitolo', min: 1, max: 20, step: 1 },
      { kind: 'number', key: 'maxDuration', label: 'Durata max', min: 0.5, max: 10, step: 0.5, unit: 's' },
      { kind: 'section', key: 's1', label: 'Stile' },
      { kind: 'select', key: 'font', label: 'Font', options: fontOptions },
      { kind: 'slider', key: 'fontSize', label: 'Dimensione (rif. 1080p)', min: 20, max: 160, step: 1, unit: 'px' },
      { kind: 'toggle', key: 'bold', label: 'Grassetto' },
      { kind: 'toggle', key: 'uppercase', label: 'Maiuscolo' },
      { kind: 'color', key: 'color', label: 'Colore testo' },
      { kind: 'color', key: 'outlineColor', label: 'Colore contorno' },
      { kind: 'slider', key: 'outline', label: 'Spessore contorno', min: 0, max: 12, step: 0.5 },
      { kind: 'slider', key: 'shadow', label: 'Ombra', min: 0, max: 10, step: 0.5 },
      { kind: 'toggle', key: 'boxed', label: 'Riquadro di sfondo' },
      { kind: 'color', key: 'boxColor', label: 'Colore riquadro', visibleIf: (s) => !!s.boxed },
      { kind: 'slider', key: 'boxOpacity', label: 'Opacità riquadro', min: 0, max: 100, step: 5, unit: '%', visibleIf: (s) => !!s.boxed },
      {
        kind: 'select', key: 'position', label: 'Posizione',
        options: [
          { value: 'bottom', label: 'In basso' },
          { value: 'center', label: 'Al centro' },
          { value: 'top', label: 'In alto' }
        ]
      },
      { kind: 'slider', key: 'marginV', label: 'Margine verticale', min: 0, max: 40, step: 1, unit: '%' },
      {
        kind: 'select', key: 'animation', label: 'Animazione',
        options: [
          { value: 'none', label: 'Nessuna' },
          { value: 'fade', label: 'Dissolvenza' },
          { value: 'pop', label: 'Pop' },
          { value: 'highlight', label: 'Parola attiva evidenziata' },
          { value: 'karaoke', label: 'Karaoke (riempimento)' },
          { value: 'word', label: 'Una parola alla volta' }
        ]
      },
      { kind: 'color', key: 'highlightColor', label: 'Colore evidenziazione' },
      {
        kind: 'text', key: 'keywords', label: 'Parole da evidenziare',
        placeholder: 'separate da virgola', help: 'Vengono sempre colorate con il colore di evidenziazione.'
      },
      { kind: 'section', key: 's2', label: 'Uscita' },
      { kind: 'toggle', key: 'burn', label: 'Incidi nel video' },
      { kind: 'toggle', key: 'exportSrt', label: 'Esporta file SRT accanto al video' },
      { kind: 'section', key: 's3', label: 'Testo e tempi' },
      { kind: 'custom', key: 'editedCues', label: 'Sottotitoli', editor: 'cues' }
    ]
  },
  texts: {
    type: 'texts',
    name: 'Testi e grafiche',
    description: 'Titoli, parole chiave, spiegazioni e immagini con preset tipografici, posizione, animazioni e keyframe.',
    icon: 'Type',
    category: 'Grafica',
    hasInput: true,
    hasOutput: true,
    implemented: true,
    defaults: {
      items: [],
      autoGap: false,
      gapTexts: '',
      minGap: 1.2,
      gapPreset: 'box',
      gapMaxDuration: 3
    },
    fields: [
      { kind: 'custom', key: 'items', label: 'Elementi', editor: 'overlays' },
      { kind: 'section', key: 's1', label: 'Testi automatici nelle pause' },
      { kind: 'toggle', key: 'autoGap', label: 'Inserisci testi nei momenti senza parlato' },
      {
        kind: 'textarea', key: 'gapTexts', label: 'Testi (uno per riga)', rows: 4,
        visibleIf: (s) => !!s.autoGap, help: 'Assegnati in ordine alle pause rilevate dalla trascrizione.'
      },
      { kind: 'slider', key: 'minGap', label: 'Pausa minima', min: 0.5, max: 5, step: 0.1, unit: 's', visibleIf: (s) => !!s.autoGap },
      { kind: 'slider', key: 'gapMaxDuration', label: 'Durata max testo', min: 0.5, max: 8, step: 0.5, unit: 's', visibleIf: (s) => !!s.autoGap },
      {
        kind: 'select', key: 'gapPreset', label: 'Stile', visibleIf: (s) => !!s.autoGap,
        options: [
          { value: 'minimal', label: 'Minimal' },
          { value: 'bold', label: 'Bold' },
          { value: 'box', label: 'Riquadro' },
          { value: 'accent', label: 'Accento' },
          { value: 'lowerthird', label: 'Sottopancia' }
        ]
      }
    ]
  },
  zoom: {
    type: 'zoom',
    name: 'Zoom e animazioni',
    description: 'Zoom automatici (sui tagli o sulle parole chiave) e manuali, con keyframe di posizione e scala.',
    icon: 'ZoomIn',
    category: 'Montaggio',
    hasInput: true,
    hasOutput: true,
    implemented: true,
    defaults: {
      auto: 'jumpcut',
      scale: 1.12,
      ease: 0.0,
      everyN: 2,
      keywords: '',
      keywordHold: 1.2,
      x: 50,
      y: 45,
      smooth: false,
      zooms: [],
      keyframes: []
    },
    fields: [
      {
        kind: 'select',
        key: 'auto',
        label: 'Zoom automatico',
        options: [
          { value: 'off', label: 'Disattivato (solo manuale)' },
          { value: 'jumpcut', label: 'Alternato sui tagli (punch-in)' },
          { value: 'keywords', label: 'Sulle parole chiave' }
        ]
      },
      { kind: 'slider', key: 'scale', label: 'Intensità zoom', min: 1.02, max: 2, step: 0.01, unit: '×' },
      { kind: 'slider', key: 'ease', label: 'Rampa (0 = stacco netto)', min: 0, max: 1.5, step: 0.05, unit: 's' },
      { kind: 'number', key: 'everyN', label: 'Ogni N segmenti', min: 1, max: 10, step: 1, visibleIf: (s) => s.auto === 'jumpcut' },
      {
        kind: 'text', key: 'keywords', label: 'Parole chiave', placeholder: 'separate da virgola',
        visibleIf: (s) => s.auto === 'keywords'
      },
      { kind: 'slider', key: 'keywordHold', label: 'Durata zoom parola', min: 0.3, max: 4, step: 0.1, unit: 's', visibleIf: (s) => s.auto === 'keywords' },
      { kind: 'slider', key: 'x', label: 'Centro orizzontale', min: 0, max: 100, step: 1, unit: '%' },
      { kind: 'slider', key: 'y', label: 'Centro verticale', min: 0, max: 100, step: 1, unit: '%' },
      { kind: 'toggle', key: 'smooth', label: 'Qualità alta (zoom più fluido, più lento)' },
      { kind: 'section', key: 's1', label: 'Zoom manuali' },
      { kind: 'custom', key: 'zooms', label: 'Intervalli', editor: 'zooms' },
      { kind: 'section', key: 's2', label: 'Keyframe inquadratura' },
      { kind: 'custom', key: 'keyframes', label: 'Keyframe', editor: 'zoomKeyframes' }
    ]
  },
  audio: {
    type: 'audio',
    name: 'Miglioramento audio',
    description: 'Riduzione rumore, filtro passa-alto, de-esser, compressione e normalizzazione loudness della voce.',
    icon: 'SlidersHorizontal',
    category: 'Audio',
    hasInput: true,
    hasOutput: true,
    implemented: true,
    defaults: {
      denoise: 'medium',
      highpass: 80,
      deesser: false,
      compressor: true,
      normalize: true,
      targetLufs: -14,
      truePeak: -1.5,
      voiceGainDb: 0
    },
    fields: [
      {
        kind: 'select', key: 'denoise', label: 'Riduzione rumore (FFT)',
        options: [
          { value: 'off', label: 'Disattivata' },
          { value: 'light', label: 'Leggera' },
          { value: 'medium', label: 'Media' },
          { value: 'strong', label: 'Forte' }
        ]
      },
      { kind: 'slider', key: 'highpass', label: 'Passa-alto (0 = off)', min: 0, max: 200, step: 5, unit: 'Hz' },
      { kind: 'toggle', key: 'deesser', label: 'De-esser (riduce le sibilanti)' },
      { kind: 'toggle', key: 'compressor', label: 'Compressore voce' },
      { kind: 'toggle', key: 'normalize', label: 'Normalizzazione loudness' },
      {
        kind: 'select', key: 'targetLufs', label: 'Obiettivo', visibleIf: (s) => !!s.normalize,
        options: [
          { value: -14, label: '-14 LUFS (YouTube, Spotify)' },
          { value: -16, label: '-16 LUFS (podcast, Apple)' },
          { value: -23, label: '-23 LUFS (broadcast EBU)' }
        ]
      },
      { kind: 'slider', key: 'voiceGainDb', label: 'Volume voce', min: -12, max: 12, step: 0.5, unit: 'dB' }
    ]
  },
  music: {
    type: 'music',
    name: 'Musica',
    description: 'Musica di sottofondo con fade, loop e abbassamento automatico (ducking) durante il parlato.',
    icon: 'Music',
    category: 'Audio',
    hasInput: true,
    hasOutput: true,
    implemented: true,
    defaults: {
      mediaId: '',
      volumeDb: -20,
      fadeIn: 2,
      fadeOut: 3,
      ducking: 'medium',
      startOffset: 0,
      loop: true,
      coverEndscreen: true
    },
    fields: [
      { kind: 'media', key: 'mediaId', label: 'Brano', mediaKind: 'audio' },
      { kind: 'slider', key: 'volumeDb', label: 'Volume musica', min: -40, max: 0, step: 1, unit: 'dB' },
      { kind: 'slider', key: 'fadeIn', label: 'Fade-in', min: 0, max: 10, step: 0.5, unit: 's' },
      { kind: 'slider', key: 'fadeOut', label: 'Fade-out', min: 0, max: 10, step: 0.5, unit: 's' },
      {
        kind: 'select', key: 'ducking', label: 'Abbassa durante il parlato',
        options: [
          { value: 'off', label: 'No' },
          { value: 'light', label: 'Leggero' },
          { value: 'medium', label: 'Medio' },
          { value: 'strong', label: 'Forte' }
        ]
      },
      { kind: 'number', key: 'startOffset', label: 'Inizia il brano da', min: 0, step: 1, unit: 's' },
      { kind: 'toggle', key: 'loop', label: 'Ripeti se più corto del video' },
      { kind: 'toggle', key: 'coverEndscreen', label: 'Continua sulla schermata finale' }
    ]
  },
  transitions: {
    type: 'transitions',
    name: 'Transizioni',
    description: 'Transizioni tra le clip nei punti di taglio scelti, più dissolvenza di apertura e chiusura.',
    icon: 'Blend',
    category: 'Montaggio',
    hasInput: true,
    hasOutput: true,
    implemented: true,
    defaults: {
      type: 'fade',
      duration: 0.4,
      apply: 'gap',
      everyN: 4,
      minGap: 2,
      selected: [],
      maxCount: 40,
      fadeInStart: 0.5,
      fadeOutEnd: 0.8
    },
    fields: [
      { kind: 'select', key: 'type', label: 'Tipo', options: XFADE_OPTIONS },
      { kind: 'slider', key: 'duration', label: 'Durata', min: 0.1, max: 2, step: 0.05, unit: 's' },
      {
        kind: 'select', key: 'apply', label: 'Applica a',
        options: [
          { value: 'none', label: 'Nessun taglio' },
          { value: 'all', label: 'Tutti i tagli' },
          { value: 'every', label: 'Un taglio ogni N' },
          { value: 'gap', label: 'Tagli con pausa lunga' },
          { value: 'selected', label: 'Solo i tagli selezionati' }
        ]
      },
      { kind: 'number', key: 'everyN', label: 'N', min: 1, max: 50, step: 1, visibleIf: (s) => s.apply === 'every' },
      { kind: 'slider', key: 'minGap', label: 'Pausa rimossa ≥', min: 0.3, max: 10, step: 0.1, unit: 's', visibleIf: (s) => s.apply === 'gap' },
      { kind: 'custom', key: 'selected', label: 'Tagli selezionati', editor: 'transitionPoints', visibleIf: (s) => s.apply === 'selected' },
      { kind: 'number', key: 'maxCount', label: 'Numero massimo di transizioni', min: 1, max: 200, step: 1 },
      { kind: 'slider', key: 'fadeInStart', label: 'Dissolvenza iniziale dal nero', min: 0, max: 3, step: 0.1, unit: 's' },
      { kind: 'slider', key: 'fadeOutEnd', label: 'Dissolvenza finale al nero', min: 0, max: 3, step: 0.1, unit: 's' }
    ]
  },
  endscreen: {
    type: 'endscreen',
    name: 'Schermata finale',
    description: 'Schermata conclusiva personalizzabile con titolo, invito all\'azione, logo e sfondo.',
    icon: 'Flag',
    category: 'Grafica',
    hasInput: true,
    hasOutput: true,
    implemented: true,
    defaults: {
      duration: 5,
      bgColor: '#111111',
      bgMediaId: '',
      title: 'Grazie per la visione',
      subtitle: '',
      cta: 'Iscriviti al canale',
      accentColor: '#FF8A1F',
      logoMediaId: '',
      logoSize: 18,
      fade: 0.6,
      font: 'Montserrat'
    },
    fields: [
      { kind: 'slider', key: 'duration', label: 'Durata', min: 1, max: 20, step: 0.5, unit: 's' },
      { kind: 'color', key: 'bgColor', label: 'Colore sfondo' },
      { kind: 'media', key: 'bgMediaId', label: 'Immagine di sfondo (opzionale)', mediaKind: 'image' },
      { kind: 'text', key: 'title', label: 'Titolo' },
      { kind: 'text', key: 'subtitle', label: 'Sottotitolo' },
      { kind: 'text', key: 'cta', label: 'Invito all\'azione' },
      { kind: 'color', key: 'accentColor', label: 'Colore accento' },
      { kind: 'select', key: 'font', label: 'Font', options: fontOptions },
      { kind: 'media', key: 'logoMediaId', label: 'Logo / immagine (opzionale)', mediaKind: 'image' },
      { kind: 'slider', key: 'logoSize', label: 'Larghezza logo', min: 5, max: 60, step: 1, unit: '%' },
      { kind: 'slider', key: 'fade', label: 'Dissolvenza dal video', min: 0, max: 2, step: 0.1, unit: 's' }
    ]
  },
  export: {
    type: 'export',
    name: 'Esportazione',
    description: 'Renderizza il video finale con codec, risoluzione e qualità scelti. Avanzamento reale e annullabile.',
    icon: 'Download',
    category: 'Uscita',
    hasInput: true,
    hasOutput: false,
    implemented: true,
    defaults: {
      outputPath: '',
      resolution: 'source',
      fit: 'blur',
      fps: 'source',
      codec: 'libx264',
      crf: 20,
      preset: 'medium',
      audioBitrate: '192k'
    },
    fields: [
      { kind: 'savePath', key: 'outputPath', label: 'Destinazione', extension: 'mp4' },
      { kind: 'select', key: 'resolution', label: 'Risoluzione', options: RESOLUTIONS.map((r) => ({ value: r.value, label: r.label })) },
      {
        kind: 'select', key: 'fit', label: 'Adattamento formato',
        help: 'Usato quando il rapporto d\'aspetto finale è diverso da quello sorgente.',
        options: [
          { value: 'blur', label: 'Sfondo sfocato' },
          { value: 'fill', label: 'Ritaglia al centro' },
          { value: 'fit', label: 'Bande nere' }
        ]
      },
      {
        kind: 'select', key: 'fps', label: 'Fotogrammi al secondo',
        options: [
          { value: 'source', label: 'Come la sorgente' },
          { value: 24, label: '24' },
          { value: 25, label: '25' },
          { value: 30, label: '30' },
          { value: 50, label: '50' },
          { value: 60, label: '60' }
        ]
      },
      {
        kind: 'select', key: 'codec', label: 'Codec video',
        options: [
          { value: 'libx264', label: 'H.264 (x264, massima compatibilità)' },
          { value: 'libx265', label: 'H.265/HEVC (x265, file più piccoli)' },
          { value: 'h264_nvenc', label: 'H.264 NVIDIA NVENC (GPU)' },
          { value: 'hevc_nvenc', label: 'HEVC NVIDIA NVENC (GPU)' },
          { value: 'h264_qsv', label: 'H.264 Intel Quick Sync (GPU)' },
          { value: 'h264_amf', label: 'H.264 AMD AMF (GPU)' }
        ]
      },
      { kind: 'slider', key: 'crf', label: 'Qualità (più basso = migliore)', min: 14, max: 35, step: 1 },
      {
        kind: 'select', key: 'preset', label: 'Velocità di codifica',
        options: ['ultrafast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower'].map((p) => ({ value: p, label: p }))
      },
      {
        kind: 'select', key: 'audioBitrate', label: 'Bitrate audio',
        options: ['128k', '192k', '256k', '320k'].map((b) => ({ value: b, label: b }))
      }
    ]
  }
}

/** Nodi del workflow predefinito, in ordine. */
export const DEFAULT_CHAIN: NodeType[] = [
  'import', 'analyze', 'transcribe', 'silence', 'subtitles', 'texts',
  'zoom', 'audio', 'music', 'transitions', 'endscreen', 'export'
]

/** Tutti i nodi disponibili (palette). */
export const NODE_ORDER: NodeType[] = [
  'import', 'analyze', 'transcribe', 'voiceover', 'silence', 'subtitles', 'texts',
  'zoom', 'audio', 'music', 'transitions', 'endscreen', 'export'
]

export function defaultSettings(type: NodeType): Record<string, unknown> {
  return JSON.parse(JSON.stringify(NODE_DEFS[type].defaults))
}
