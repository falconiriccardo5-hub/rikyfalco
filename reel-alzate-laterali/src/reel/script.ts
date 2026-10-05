/**
 * Voiceover script. `text` is shown as caption (UPPERCASE words get highlighted),
 * `say` is what the voice reads. `at` is the earliest frame (scene-local) the line may start.
 * Run `npm run voice` after editing to regenerate audio + timings.
 */
export type Line = { text: string; say: string; at?: number };
export type SceneScript = { id: string; minFrames: number; lines: Line[] };

export const SCRIPT: SceneScript[] = [
  {
    id: "intro",
    minFrames: 135,
    lines: [
      { text: "Ciao! Sono COACH RIKY", say: "Ciao! Sono Coach Ricky!", at: 4 },
      { text: "Oggi ti insegno le ALZATE LATERALI fatte bene", say: "Oggi ti insegno le alzate laterali, fatte bene.", at: 60 },
    ],
  },
  {
    id: "front",
    minFrames: 165,
    lines: [
      { text: "Manubri in mano, braccia lungo i fianchi", say: "Manubri in mano, braccia lungo i fianchi.", at: 4 },
      { text: "Sali fino all'altezza delle SPALLE, non oltre", say: "Sali fino all'altezza delle spalle. Non oltre.", at: 70 },
    ],
  },
  {
    id: "side",
    minFrames: 165,
    lines: [
      { text: "Di lato si vede: il braccio NON sale dritto di lato…", say: "Guarda di lato: il braccio non sale dritto di lato...", at: 4 },
      { text: "…ma leggermente IN AVANTI", say: "ma leggermente in avanti!", at: 80 },
    ],
  },
  {
    id: "top",
    minFrames: 150,
    lines: [
      { text: "Vista dall'alto: NON sul piano frontale…", say: "Vista dall'alto: non sul piano frontale...", at: 4 },
      { text: "…ma 20-30° in avanti: il PIANO SCAPOLARE", say: "ma venti, trenta gradi in avanti. È il piano scapolare!", at: 60 },
    ],
  },
  {
    id: "wrong",
    minFrames: 210,
    lines: [
      { text: "ERRORE: lanciare il peso", say: "Errore! Lanciare il peso.", at: 6 },
      { text: "Slancio col busto e SPALLE alzate", say: "Slancio col busto, e spalle alzate.", at: 60 },
      { text: "e poi giù a PESO MORTO", say: "E poi giù, a peso morto.", at: 120 },
    ],
  },
  {
    id: "correct",
    minFrames: 225,
    lines: [
      { text: "GIUSTO: sali LENTO e controllato fino alle SPALLE", say: "Giusto: sali lento e controllato, fino alle spalle.", at: 6 },
      { text: "…poi FRENA la discesa", say: "Poi frena la discesa.", at: 90 },
    ],
  },
  {
    id: "risk",
    minFrames: 210,
    lines: [
      {
        text: "Se le fai male rischi una lesione alla CUFFIA DEI ROTATORI",
        say: "Se le fai male, rischi una lesione alla cuffia dei rotatori.",
        at: 6,
      },
      {
        text: "SETTIMANE di stop tra visite, farmaci e fisioterapia",
        say: "Settimane di stop, tra visite, farmaci e fisioterapia.",
        at: 118,
      },
    ],
  },
  {
    id: "outro",
    minFrames: 135,
    lines: [
      {
        text: "SEGUIMI per altri consigli come questo!",
        say: "Seguimi, Riccardo Falconi coach, per altri consigli come questo!",
        at: 4,
      },
    ],
  },
];
