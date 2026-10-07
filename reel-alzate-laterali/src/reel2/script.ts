/**
 * Reel 02 — "I pesi ti faranno diventare troppo grossa?"
 * `text` = caption (UPPERCASE words highlighted), `say` = spoken line, `at` = earliest scene-local frame,
 * `speaker` = "lei" (female synthetic voice) or "riky" (coach's cloned voice). Whoever speaks is on screen.
 * Regenerate audio: see scripts/voice_cb.py
 */
import type { SceneScript } from "../reel/script";

export const SCRIPT: SceneScript[] = [
  {
    id: "hook",
    minFrames: 120,
    lines: [
      { speaker: "lei", text: "I pesi mi faranno diventare TROPPO GROSSA?", say: "I pesi mi faranno diventare troppo grossa?", at: 8 },
    ],
  },
  {
    id: "fantasy",
    minFrames: 150,
    lines: [
      { speaker: "lei", text: "Prendo un manubrio e… BOOM!", say: "Prendo un manubrio, e... boom!", at: 4 },
      { speaker: "lei", text: "Oddio… ENORME!", say: "Oddio... enorme!", at: 78 },
    ],
  },
  {
    id: "reality",
    minFrames: 150,
    lines: [{ speaker: "riky", text: "Allora, guarda bene: NON FUNZIONA COSÌ", say: "Allora, guarda bene: non funziona così.", at: 20 }],
  },
  {
    id: "factors",
    minFrames: 150,
    lines: [
      {
        speaker: "riky",
        text: "Servono anni di ALLENAMENTO, tante CALORIE e tanto TEMPO",
        say: "Per diventare enorme servono anni di allenamento, tante calorie, e tanto tempo.",
        at: 6,
      },
    ],
  },
  {
    id: "exercise",
    minFrames: 180,
    lines: [
      { speaker: "riky", text: "Pesi moderati, LENTO e controllato", say: "Pesi moderati, lento e controllato.", at: 10 },
      { speaker: "riky", text: "Diventi più TONICA e più FORTE", say: "Così diventi più tonica, e più forte.", at: 80 },
    ],
  },
  {
    id: "progress",
    minFrames: 175,
    lines: [
      {
        speaker: "riky",
        text: "Settimana dopo settimana: un cambiamento GRADUALE e naturale",
        say: "Settimana dopo settimana, un cambiamento graduale e naturale.",
        at: 10,
      },
    ],
  },
  {
    id: "goal",
    minFrames: 190,
    lines: [
      { speaker: "riky", text: "Il tuo obiettivo NON È diventare enorme", say: "Il tuo obiettivo non è diventare enorme.", at: 6 },
      { speaker: "riky", text: "Ma è diventare più FORTE, STABILE e CAPACE", say: "Ma è diventare più forte, stabile e capace.", at: 80 },
    ],
  },
  {
    id: "outro",
    minFrames: 120,
    lines: [
      { speaker: "riky", text: "I pesi NON SONO IL NEMICO", say: "Mi raccomando: i pesi non sono il nemico.", at: 6 },
      { speaker: "riky", text: "SEGUIMI per altri consigli!", say: "Seguimi su Riccardo Falconi coach!", at: 70 },
    ],
  },
];
