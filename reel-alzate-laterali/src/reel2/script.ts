/**
 * Reel 02 — "I pesi ti faranno diventare troppo grossa?"
 * `text` = caption (UPPERCASE words highlighted), `say` = spoken line (" | " inserts a pause),
 * `at` = earliest scene-local frame for the line.
 * Regenerate audio: SCRIPT=src/reel2/script.ts VOICE_DIR=voice2 VOICE_JSON=src/reel2/voice.json npm run voice
 */
import type { SceneScript } from "../reel/script";

export const SCRIPT: SceneScript[] = [
  {
    id: "hook",
    minFrames: 120,
    lines: [
      { text: "I pesi ti faranno diventare TROPPO GROSSA?", say: "I pesi ti faranno diventare troppo grossa?", at: 6 },
    ],
  },
  {
    id: "fantasy",
    minFrames: 150,
    lines: [
      { text: "Prendi un manubrio e… BOOM!", say: "Prendi un manubrio e... | boom!", at: 4 },
      { text: "Enorme, dall'oggi al domani", say: "Enorme, dall'oggi al domani.", at: 70 },
    ],
  },
  {
    id: "reality",
    minFrames: 150,
    lines: [
      { text: "Allora, guarda bene: NON FUNZIONA COSÌ", say: "Allora, guarda bene: | non funziona così.", at: 8 },
    ],
  },
  {
    id: "factors",
    minFrames: 150,
    lines: [
      {
        text: "Servono anni di ALLENAMENTO, tante CALORIE e tanto TEMPO",
        say: "Servono anni di allenamento, | tante calorie, | e tanto tempo.",
        at: 4,
      },
    ],
  },
  {
    id: "exercise",
    minFrames: 180,
    lines: [
      { text: "Pesi moderati, LENTO e controllato", say: "Pesi moderati, | lento e controllato.", at: 6 },
      { text: "Più TONICA e più FORTE", say: "Più tonica, | e più forte.", at: 80 },
    ],
  },
  {
    id: "progress",
    minFrames: 210,
    lines: [
      { text: "Settimana dopo settimana: un cambiamento GRADUALE e naturale", say: "Settimana dopo settimana: | un cambiamento graduale, e naturale.", at: 6 },
    ],
  },
  {
    id: "goal",
    minFrames: 210,
    lines: [
      { text: "Il tuo obiettivo NON È diventare enorme", say: "Il tuo obiettivo non è diventare enorme.", at: 6 },
      { text: "È diventare più FORTE, STABILE e CAPACE", say: "È diventare più forte, | stabile, | e capace.", at: 90 },
    ],
  },
  {
    id: "outro",
    minFrames: 120,
    lines: [
      { text: "I pesi NON SONO IL NEMICO", say: "Mi raccomando: i pesi non sono il nemico.", at: 4 },
      { text: "SEGUIMI per altri consigli!", say: "Seguimi su Riccardo Falconi coach!", at: 70 },
    ],
  },
];
