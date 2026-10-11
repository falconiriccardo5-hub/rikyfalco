// Voci di Piper (sintesi vocale locale) scaricabili dall'app.
// Fonte: https://huggingface.co/rhasspy/piper-voices (licenze nei file MODEL_CARD).

export interface PiperVoice {
  id: string
  label: string
  language: string
  /** Percorso nel repository rhasspy/piper-voices. */
  repoPath: string
  sizeMb: number
}

export const PIPER_VOICES: PiperVoice[] = [
  { id: 'it_IT-paola-medium', label: 'Paola (italiano, femminile)', language: 'it', repoPath: 'it/it_IT/paola/medium', sizeMb: 63 },
  { id: 'it_IT-riccardo-x_low', label: 'Riccardo (italiano, maschile, più leggera)', language: 'it', repoPath: 'it/it_IT/riccardo/x_low', sizeMb: 28 },
  { id: 'en_US-lessac-medium', label: 'Lessac (inglese USA)', language: 'en', repoPath: 'en/en_US/lessac/medium', sizeMb: 63 },
  { id: 'en_GB-alan-medium', label: 'Alan (inglese UK)', language: 'en', repoPath: 'en/en_GB/alan/medium', sizeMb: 63 },
  { id: 'es_ES-davefx-medium', label: 'Davefx (spagnolo)', language: 'es', repoPath: 'es/es_ES/davefx/medium', sizeMb: 63 },
  { id: 'fr_FR-siwis-medium', label: 'Siwis (francese)', language: 'fr', repoPath: 'fr/fr_FR/siwis/medium', sizeMb: 63 },
  { id: 'de_DE-thorsten-medium', label: 'Thorsten (tedesco)', language: 'de', repoPath: 'de/de_DE/thorsten/medium', sizeMb: 63 }
]

export function voiceUrl(v: PiperVoice, ext: 'onnx' | 'onnx.json'): string {
  return `https://huggingface.co/rhasspy/piper-voices/resolve/main/${v.repoPath}/${v.id}.${ext}`
}
