import React from 'react';
import {AbsoluteFill, staticFile} from 'remotion';
import {C, FONT} from '../brand';
import {Riky, RikyProps} from '../Riky';
import {Check} from '../ui';

export const SW = 1080;
export const SH = 1350;

type Slide = {
  kind: 'cover' | 'q' | 'result' | 'step' | 'cta' | 'info' | 'pair' | 'check' | 'table' | 'timeline' | 'week' | 'rule';
  note?: string;
  n?: number | string;
  kicker?: string;
  errLabel?: string;
  fixLabel?: string;
  err?: string;
  errSub?: string;
  fix?: string;
  fixSub?: string;
  icon?: 'angle' | 'rope' | 'pulldown' | 'raise' | 'band';
  items?: string[];
  title: string;
  sub?: string;
  lines?: string[];
  riky?: RikyProps;
  dark?: boolean;
};

const arm = {up: {hand: [273, 822] as [number, number]}, hip: {hand: [205, 760] as [number, number]}};

export const DECKS: Record<string, Slide[]> = {
  faq: [
    {kind: 'cover', kicker: 'FAQ ONESTA', title: 'LE 5 DOMANDE CHE MI FATE PRIMA DI INIZIARE', sub: 'Risposte chiare, senza giri di parole.', riky: {smile: 0.9, brow: 8}},
    {kind: 'pair', n: 1, title: '', errLabel: '? DOMANDA', fixLabel: '✓ RISPOSTA', err: '“Quanto costa?”', errSub: 'La domanda che tutti vogliono fare per prima.', fix: 'Dipende dal percorso', fixSub: 'Te lo dico in modo chiaro durante l’analisi gratuita, prima di qualsiasi impegno. Nessun costo nascosto.'},
    {kind: 'pair', n: 2, title: '', errLabel: '? DOMANDA', fixLabel: '✓ RISPOSTA', err: '“Quante volte a settimana devo allenarmi?”', errSub: 'Lavoro, famiglia, poco tempo.', fix: 'Anche 2 volte possono bastare', fixSub: 'Costruiamo il piano sui giorni che hai davvero: meglio 2 sedute fatte bene che 4 saltate.'},
    {kind: 'pair', n: 3, title: '', errLabel: '? DOMANDA', fixLabel: '✓ RISPOSTA', err: '“Online o in presenza?”', errSub: 'Dipende da dove sei e da come preferisci allenarti.', fix: 'Scegli tu', fixSub: 'Ci alleniamo insieme in presenza oppure segui il percorso online, con video e controlli regolari.'},
    {kind: 'pair', n: 4, title: '', errLabel: '? DOMANDA', fixLabel: '✓ RISPOSTA', err: '“Serve esperienza?”', errSub: 'Non sono mai entrato in palestra / mi alleno da anni.', fix: 'No, si parte dal tuo livello', fixSub: 'Che tu sia alle prime armi o ti alleni da anni, partiamo da dove sei e impari la tecnica passo dopo passo.'},
    {kind: 'pair', n: 5, title: '', errLabel: '? DOMANDA', fixLabel: '✓ RISPOSTA', err: '“E se ho dolori o infortuni?”', errSub: 'Schiena, spalle, ginocchia…', fix: 'Ne teniamo conto da subito', fixSub: 'Li valutiamo nell’analisi e adattiamo gli esercizi. Se serve, prima ti indirizzo da un fisioterapista.'},
    {kind: 'check', title: 'COSA RICEVI NEL PERCORSO', items: ['Piano costruito su di te', 'Correzioni sui tuoi video', 'Progressione settimana per settimana', 'Controlli regolari dei progressi', 'Risposte alle tue domande']},
    {kind: 'cta', title: 'HAI UN’ALTRA DOMANDA?', sub: 'Scrivimi ANALISI in DM: ti rispondo io, personalmente.', riky: {smile: 1, mouth: 0.4}},
  ],
  analisi: [
    {kind: 'cover', kicker: 'COME FUNZIONA', title: 'COSA SUCCEDE QUANDO MI SCRIVI “ANALISI”', sub: '4 passi. Gratis e senza impegno.', riky: {smile: 1, brow: 6}},
    {kind: 'step', n: 1, title: 'MI SCRIVI ANALISI', sub: 'Una parola in DM. Niente moduli lunghi, niente call obbligatorie.', riky: {smile: 0.8}},
    {kind: 'step', n: 2, title: 'TI FACCIO QUALCHE DOMANDA', sub: 'Obiettivo, livello, giorni disponibili ed eventuali dolori.', riky: {smile: 0.7, brow: 6}},
    {kind: 'step', n: 3, title: 'MI MANDI 1–2 VIDEO', sub: 'Un esercizio che fai spesso, ripreso di lato. Bastano 30 secondi.', riky: {smile: 0.8, brow: 8}},
    {kind: 'step', n: 4, title: 'RICEVI LA TUA ANALISI', sub: 'Ti dico cosa funziona, cosa cambiare e da dove partire. Poi decidi tu se continuare con me.', riky: {smile: 1}},
    {kind: 'check', title: 'COSA NON SUCCEDE', items: ['Zero obblighi di acquisto', 'Zero schede copia-incolla', 'Zero risposte automatiche', 'Zero giudizi sul tuo livello']},
    {kind: 'cta', title: 'PRONTO A INIZIARE?', sub: 'Scrivimi ANALISI in DM. Ti rispondo io.', riky: {smile: 1, mouth: 0.4}},
  ],
  dodici: [
    {kind: 'cover', kicker: 'DIETRO LE QUINTE', title: 'LE PRIME 12 SETTIMANE DI UN PERCORSO', sub: 'Cosa succede, settimana per settimana. Senza promesse miracolose.', riky: {smile: 0.9, brow: 6}},
    {kind: 'step', kicker: 'SETTIMANA', n: '0', title: 'ANALISI', sub: 'Obiettivo, livello, tempo disponibile, infortuni. Mi mandi il video di 2–3 esercizi e partiamo da dati reali.', riky: {smile: 0.7, brow: 6}},
    {kind: 'step', kicker: 'SETTIMANE', n: '1–2', title: 'BASI E TECNICA', sub: 'Impari bene gli esercizi fondamentali con carichi prudenti. Iniziamo a registrare pesi e ripetizioni.', riky: {smile: 0.8}},
    {kind: 'step', kicker: 'SETTIMANE', n: '3–6', title: 'PROGRESSIONE', sub: 'Carichi o ripetizioni salgono settimana dopo settimana. Ogni 2 settimane controlliamo la tecnica sui video.', riky: {smile: 1, brow: 8}},
    {kind: 'step', kicker: 'SETTIMANA', n: '7', title: 'CONTROLLO', sub: 'Misure, foto e numeri a confronto. Quello che funziona resta, il resto si cambia.', riky: {smile: 0.6, brow: 10}},
    {kind: 'step', kicker: 'SETTIMANE', n: '8–12', title: 'CONSOLIDAMENTO', sub: 'La progressione continua, introduciamo varianti mirate e una settimana di scarico se serve.', riky: {smile: 1}},
    {kind: 'check', title: 'COSA MISURIAMO OGNI SETTIMANA', items: ['Carichi e ripetizioni', 'Video della tecnica', 'Misure e foto', 'Energia e sonno', 'Sedute completate']},
    {kind: 'cta', title: 'VUOI PARTIRE DALLA SETTIMANA 0?', sub: 'Scrivimi ANALISI in DM: è il primo passo ed è gratuito.', riky: {smile: 1, mouth: 0.4}},
  ],
  miti: [
    {kind: 'cover', kicker: 'DA SALVARE', title: '7 COSE CHE SENTI IN PALESTRA (E PERCHÉ NON È COSÌ)', sub: 'Quante ne hai sentite almeno una volta?', riky: {smile: 0.5, brow: 12}},
    {kind: 'pair', n: 1, title: '', errLabel: '✕ LO SENTI DIRE', fixLabel: '✓ COME STA DAVVERO', err: '“Per dimagrire serve solo cardio”', errSub: 'Ore di tapis roulant, zero pesi.', fix: 'Conta il bilancio calorico', fixSub: 'Dimagrisci se consumi più di quello che mangi. I pesi ti aiutano a non perdere muscolo mentre perdi grasso.'},
    {kind: 'pair', n: 2, title: '', errLabel: '✕ LO SENTI DIRE', fixLabel: '✓ COME STA DAVVERO', err: '“Se non sudi, non ti sei allenato”', errSub: 'Più sudore = allenamento migliore.', fix: 'Il sudore non misura niente', fixSub: 'Dipende da temperatura e persona. Conta la progressione: carichi e ripetizioni che migliorano.'},
    {kind: 'pair', n: 3, title: '', errLabel: '✕ LO SENTI DIRE', fixLabel: '✓ COME STA DAVVERO', err: '“Con i pesi le donne diventano grosse”', errSub: 'Meglio pesi leggerissimi e tante ripetizioni.', fix: 'I pesi danno forma, non volume', fixSub: 'Mettere tanta massa richiede anni di lavoro specifico e molte calorie. Non succede per caso.'},
    {kind: 'pair', n: 4, title: '', errLabel: '✕ LO SENTI DIRE', fixLabel: '✓ COME STA DAVVERO', err: '“Gli addominali tolgono la pancia”', errSub: '100 crunch al giorno per la pancia piatta.', fix: 'Non dimagrisci in un punto solo', fixSub: 'Gli addominali rinforzano il tronco. Il grasso cala con il deficit calorico complessivo.'},
    {kind: 'pair', n: 5, title: '', errLabel: '✕ LO SENTI DIRE', fixLabel: '✓ COME STA DAVVERO', err: '“Più ti alleni, più risultati hai”', errSub: 'Tutti i giorni, sempre al massimo.', fix: 'I risultati arrivano nel recupero', fixSub: 'Troppo volume senza riposo ti blocca. Meglio poche sedute fatte bene e dormire 7 ore.'},
    {kind: 'pair', n: 6, title: '', errLabel: '✕ LO SENTI DIRE', fixLabel: '✓ COME STA DAVVERO', err: '“Fai stretching prima, così non ti fai male”', errSub: 'Lunghi allungamenti da fermo prima dei pesi.', fix: 'Prima scalda, poi allunga', fixSub: 'Prima dell’allenamento serve un riscaldamento attivo. Lo stretching lungo è meglio a fine seduta.'},
    {kind: 'pair', n: 7, title: '', errLabel: '✕ LO SENTI DIRE', fixLabel: '✓ COME STA DAVVERO', err: '“Cambia scheda ogni mese per confondere i muscoli”', errSub: 'Esercizi nuovi ogni volta.', fix: 'I muscoli rispondono alla progressione', fixSub: 'Stessi esercizi finché migliori. Si cambia quando smetti di progredire, non per noia.'},
    {kind: 'cta', title: 'BASTA CONSIGLI A CASO?', sub: 'Scrivimi ANALISI in DM: ti dico cosa serve davvero a te, in base ai tuoi obiettivi.', riky: {smile: 1, mouth: 0.4}},
  ],
  settimana: [
    {kind: 'cover', kicker: 'MODELLO DA SALVARE', title: '2 ALLENAMENTI DA 40 MINUTI A SETTIMANA', sub: 'La settimana tipo per chi ha poco tempo ma vuole progredire davvero.', riky: {smile: 1, brow: 6}},
    {kind: 'timeline', title: 'COM’È FATTA OGNI SEDUTA', items: ["5'|Riscaldamento|Mobilità + 1–2 serie leggere del primo esercizio", "30'|Lavoro|5 esercizi, 60–90 secondi di recupero tra le serie", "5'|Defaticamento|Respirazione e allungamento leggero"]},
    {kind: 'table', n: 1, title: 'SEDUTA A', sub: 'Lunedì o martedì', items: ['Squat o goblet squat|3 × 8', 'Spinte con manubri su panca|3 × 8', 'Rematore con manubrio|3 × 10', 'Affondi indietro|2 × 10 per gamba', 'Plank|3 × 30 secondi'], note: 'Modello generico: carichi e varianti vanno adattati al tuo livello.'},
    {kind: 'table', n: 2, title: 'SEDUTA B', sub: 'Giovedì o venerdì', items: ['Stacco rumeno con manubri|3 × 8', 'Lento avanti con manubri|3 × 8', 'Lat machine al petto|3 × 10', 'Hip thrust|3 × 10', 'Dead bug|3 × 10 per lato'], note: 'Modello generico: carichi e varianti vanno adattati al tuo livello.'},
    {kind: 'week', title: 'LA TUA SETTIMANA', items: ['LUN|A|Seduta A', 'MAR|·|Riposo', 'MER|~|Camminata 30 minuti', 'GIO|B|Seduta B', 'VEN|·|Riposo', 'SAB|~|Attività che ti piace', 'DOM|·|Riposo']},
    {kind: 'rule', title: 'LA REGOLA CHE TI FA PROGREDIRE', sub: 'Quando chiudi tutte le serie con 1–2 ripetizioni ancora in canna, la volta dopo aggiungi 1–2 kg oppure 1 ripetizione.', note: 'Scrivi tutto: senza numeri non sai se stai migliorando.'},
    {kind: 'check', title: 'PER FARLA FUNZIONARE', items: ['Scrivi carichi e ripetizioni', 'Stessi esercizi per 4–6 settimane', 'Tecnica prima del carico', 'Recupero di 60–90 secondi', 'Dormi almeno 7 ore']},
    {kind: 'cta', title: 'VUOI LA TUA VERSIONE SU MISURA?', sub: 'Scrivimi ANALISI in DM: la adatto al tuo livello, ai tuoi obiettivi e ai tuoi orari.', riky: {smile: 1, mouth: 0.4}},
  ],
  spalle: [
    {kind: 'cover', kicker: 'GUIDA SALVA-SPALLE', title: '5 ERRORI CHE TI ROVINANO LE SPALLE', sub: 'E i 5 esercizi che li correggono. Salvala prima del prossimo allenamento.', riky: {smile: 0.6, brow: 8}},
    {kind: 'pair', n: 1, title: '', err: 'Gomiti a 90° nelle spinte', errSub: 'Panca, spinte con manubri, piegamenti: con i gomiti larghi la spalla lavora in una posizione scomoda.', fix: 'Spinte con gomiti a 45–60°', fixSub: 'Gomiti a 45–60° dal busto, scapole indietro e in basso, discesa controllata.', icon: 'angle'},
    {kind: 'pair', n: 2, title: '', err: 'Solo spinte, niente tirate', errSub: 'Tanto petto e spalle davanti, poco lavoro per la parte posteriore: la spalla si sbilancia in avanti.', fix: 'Face pull', fixSub: '3 serie da 12–15, peso leggero: corda verso il viso, gomiti alti, pausa di un secondo.', icon: 'rope'},
    {kind: 'pair', n: 3, title: '', err: 'Lat machine dietro la nuca', errSub: 'Per portare la barra dietro la testa spingi collo e spalle in una posizione estrema.', fix: 'Lat machine al petto', fixSub: 'Busto leggermente indietro, tira la barra verso la parte alta del petto.', icon: 'pulldown'},
    {kind: 'pair', n: 4, title: '', err: 'Alzate laterali pesanti e con slancio', errSub: 'Il peso sale grazie al colpo di schiena e la spalla perde il controllo.', fix: 'Alzate laterali controllate', fixSub: 'Peso che gestisci per 12–15 ripetizioni, braccia fino all’altezza delle spalle, niente slancio.', icon: 'raise'},
    {kind: 'pair', n: 5, title: '', err: 'Saltare il riscaldamento', errSub: 'Partire subito con carichi pesanti su petto e spalle, a muscoli freddi.', fix: 'Extrarotazioni con elastico', fixSub: '2 serie da 15 per lato prima di allenare petto e spalle. Bastano 3 minuti.', icon: 'band'},
    {kind: 'check', title: 'PRIMA DEL PROSSIMO ALLENAMENTO', items: ['Gomiti a 45–60° nelle spinte', 'Una tirata per ogni spinta', 'Lat machine sempre al petto', 'Alzate leggere, senza slancio', '3 minuti di elastico prima di iniziare']},
    {kind: 'cta', title: 'TI FA MALE LA SPALLA QUANDO SPINGI?', sub: 'Scrivimi ANALISI in DM: guardo come esegui i tuoi esercizi e ti dico cosa correggere.', riky: {smile: 1, mouth: 0.4}},
  ],
  scheda: [
    {kind: 'cover', title: 'LA TUA SCHEDA STA FUNZIONANDO?', sub: '7 domande. 1 minuto. Un punteggio onesto.', riky: {smile: 1, brow: 6}},
    {kind: 'q', n: 1, title: 'Sai quanto hai sollevato ieri?', sub: 'Carichi e ripetizioni di ogni esercizio, scritti da qualche parte.', riky: {smile: 0.4}},
    {kind: 'q', n: 2, title: 'Negli ultimi 30 giorni sei salito di carico o ripetizioni?', sub: 'In almeno metà degli esercizi principali.', riky: {smile: 0, brow: 8, browTilt: -4}},
    {kind: 'q', n: 3, title: 'Finisci le serie vicino al limite?', sub: 'Dovresti avere solo 1–3 ripetizioni di riserva. Non 8.', riky: {smile: 0.2, mouth: 0.5}},
    {kind: 'q', n: 4, title: 'Alleni ogni muscolo almeno 2 volte a settimana?', sub: 'Una volta sola è troppo poco per crescere con costanza.', riky: {smile: 0.6}},
    {kind: 'q', n: 5, title: 'Cambi esercizi solo quando smetti di progredire?', sub: 'Non perché ti annoi o perché “bisogna variare”.', riky: {smile: 0, brow: 6, tilt: -5}},
    {kind: 'q', n: 6, title: 'Mangi abbastanza proteine?', sub: 'Come riferimento: 1,6–2 g per ogni kg di peso corporeo.', riky: {smile: 0.7}},
    {kind: 'q', n: 7, title: 'Qualcuno ha controllato la tua tecnica negli ultimi 3 mesi?', sub: 'Un video di lato vale più di mille sensazioni.', riky: {smile: 0.3, brow: 10}},
    {kind: 'result', title: 'CONTA I TUOI “SÌ”', lines: ['6–7|Sei sulla strada giusta. Rifinisci i dettagli.|ok', '4–5|Stai mantenendo, non migliorando.|mid', '0–3|Stai girando a vuoto: serve un cambio di rotta.|bad'], riky: {smile: 0.5, brow: 8}},
    {kind: 'cta', title: 'VUOI SAPERE COSA CAMBIARE?', sub: 'Scrivimi ANALISI in DM e guardo la tua situazione con te. Gratis.', riky: {smile: 1, mouth: 0.4}},
  ],
  percorso: [
    {kind: 'cover', title: 'COME FUNZIONA IL PERCORSO IN 4 PASSI', sub: 'Dall’analisi gratuita ai risultati. Senza sorprese.', riky: {smile: 1}},
    {kind: 'step', n: 1, title: 'ANALISI GRATUITA', sub: 'Mi racconti obiettivo, livello, tempo disponibile e infortuni. Guardo la tua scheda attuale e ti dico cosa non sta funzionando.', riky: {smile: 0.6, brow: 6}},
    {kind: 'step', n: 2, title: 'PIANO SU MISURA', sub: 'Una scheda costruita sulla tua vita: poche sedute ben fatte, esercizi scelti per te, carichi e progressioni chiari.', riky: {smile: 0.8}},
    {kind: 'step', n: 3, title: 'TECNICA CONTROLLATA', sub: 'Mi mandi i video dei tuoi esercizi e ti correggo. Meno rischi, più risultati da ogni ripetizione.', riky: {smile: 0.7, brow: 8}},
    {kind: 'step', n: 4, title: 'PROGRESSIONE E REVISIONE', sub: 'Misuriamo i progressi e aggiorniamo il piano. Se una cosa non funziona, la cambiamo.', riky: {smile: 1}},
    {kind: 'cta', title: 'INIZIA DAL PASSO 1', sub: 'Scrivimi ANALISI in DM: è gratuita e senza impegno.', riky: {smile: 1, mouth: 0.4}},
  ],
};


const Icon: React.FC<{k: NonNullable<Slide['icon']>}> = ({k}) => {
  const sw = 8;
  const ink = C.ink;
  return (
    <svg width={230} height={230} viewBox="0 0 230 230">
      <circle cx={115} cy={115} r={108} fill="#fff" stroke={ink} strokeWidth={sw} />
      {k === 'angle' && (
        <g strokeLinecap="round" strokeLinejoin="round">
          <rect x={80} y={70} width={70} height={110} rx={22} fill={C.ink} />
          <circle cx={115} cy={52} r={22} fill="#fff" stroke={ink} strokeWidth={6} />
          <line x1={84} y1={86} x2={34} y2={136} stroke={ink} strokeWidth={14} />
          <line x1={146} y1={86} x2={196} y2={136} stroke={ink} strokeWidth={14} />
          <line x1={84} y1={86} x2={22} y2={86} stroke={C.red} strokeWidth={8} strokeDasharray="8 8" />
          <path d="M 60 86 A 30 30 0 0 0 66 108" stroke={C.blue} strokeWidth={6} fill="none" />
          <text x={42} y={176} fontFamily="Inter" fontWeight={900} fontSize={30} fill={C.blue}>45°</text>
        </g>
      )}
      {k === 'rope' && (
        <g strokeLinecap="round" strokeLinejoin="round" fill="none">
          <circle cx={70} cy={115} r={28} fill="#fff" stroke={ink} strokeWidth={6} />
          <path d="M 200 115 L 150 115 C 128 115 122 96 104 92 M 150 115 C 128 115 122 134 104 138" stroke={ink} strokeWidth={8} />
          <rect x={92} y={82} width={16} height={22} rx={4} fill={C.blue} stroke={ink} strokeWidth={5} />
          <rect x={92} y={126} width={16} height={22} rx={4} fill={C.blue} stroke={ink} strokeWidth={5} />
          <path d="M 150 60 L 110 60 M 124 46 L 110 60 L 124 74" stroke={C.blue} strokeWidth={8} />
        </g>
      )}
      {k === 'pulldown' && (
        <g strokeLinecap="round" strokeLinejoin="round" fill="none">
          <line x1={30} y1={60} x2={200} y2={60} stroke={ink} strokeWidth={12} />
          <circle cx={115} cy={110} r={24} fill="#fff" stroke={ink} strokeWidth={6} />
          <rect x={85} y={140} width={60} height={60} rx={16} fill={C.ink} stroke="none" />
          <path d="M 170 80 L 170 140 M 156 126 L 170 140 L 184 126" stroke={C.blue} strokeWidth={8} />
          <path d="M 60 80 L 60 140 M 46 126 L 60 140 L 74 126" stroke={C.blue} strokeWidth={8} />
        </g>
      )}
      {k === 'raise' && (
        <g strokeLinecap="round" strokeLinejoin="round" fill="none">
          <circle cx={115} cy={62} r={22} fill="#fff" stroke={ink} strokeWidth={6} />
          <rect x={88} y={90} width={54} height={80} rx={16} fill={C.ink} stroke="none" />
          <line x1={92} y1={104} x2={36} y2={104} stroke={ink} strokeWidth={14} />
          <line x1={138} y1={104} x2={194} y2={104} stroke={ink} strokeWidth={14} />
          <rect x={20} y={92} width={18} height={26} rx={4} fill={C.blue} stroke={ink} strokeWidth={4} />
          <rect x={192} y={92} width={18} height={26} rx={4} fill={C.blue} stroke={ink} strokeWidth={4} />
          <line x1={30} y1={150} x2={200} y2={150} stroke={C.blue} strokeWidth={5} strokeDasharray="10 8" />
        </g>
      )}
      {k === 'band' && (
        <g strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M 30 130 C 70 90 120 150 160 110" stroke={C.blue} strokeWidth={14} />
          <rect x={150} y={92} width={30} height={40} rx={8} fill="#fff" stroke={ink} strokeWidth={6} />
          <path d="M 120 60 A 60 60 0 0 1 180 90" stroke={ink} strokeWidth={8} />
          <path d="M 166 74 L 180 90 L 160 96" stroke={ink} strokeWidth={8} />
          <rect x={20} y={118} width={22} height={26} rx={6} fill={C.ink} />
        </g>
      )}
    </svg>
  );
};

const Counter: React.FC<{i: number; total: number; dark?: boolean}> = ({i, total, dark}) => (
  <div style={{position: 'absolute', top: 56, left: 72, right: 72, display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontWeight: 800, fontSize: 30, color: dark ? C.cream : C.ink, opacity: 0.8}}>
    <span>@riccardofalconi_coach</span>
    <span>{i + 1}/{total}</span>
  </div>
);

const Foot: React.FC<{dark?: boolean; last?: boolean}> = ({dark, last}) => (
  <div style={{position: 'absolute', bottom: 56, left: 72, fontFamily: FONT, fontWeight: 800, fontSize: 30, color: dark ? C.cream : C.ink, opacity: 0.75}}>
    {last ? 'COACH RIKY' : 'SCORRI  →'}
  </div>
);

const wrap: React.CSSProperties = {fontFamily: FONT, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2};

export const CarouselSlide: React.FC<{deck: string; index: number}> = ({deck, index}) => {
  const slides = DECKS[deck];
  const s = slides[index];
  const total = slides.length;
  const dark = s.kind === 'cover' || s.kind === 'cta';
  const bg = dark ? C.ink : '#FFFFFF';
  const fg = dark ? C.cream : C.ink;
  const rk = s.riky ?? {};
  const big = s.kind === 'cover' || s.kind === 'cta';
  return (
    <AbsoluteFill style={{background: bg, backgroundImage: `radial-gradient(${dark ? 'rgba(245,243,238,0.08)' : 'rgba(17,17,17,0.10)'} 2.5px, transparent 3px)`, backgroundSize: '54px 54px'}}>
      <style>{`
        @font-face{font-family:'Inter';font-weight:900;src:url(${staticFile('fonts/Inter-Black.otf')});}
        @font-face{font-family:'Inter';font-weight:800;src:url(${staticFile('fonts/Inter-ExtraBold.otf')});}
        @font-face{font-family:'Inter';font-weight:700;src:url(${staticFile('fonts/Inter-Bold.otf')});}
      `}</style>
      <Counter i={index} total={total} dark={dark} />

      {s.kind === 'q' && (
        <>
          <div style={{position: 'absolute', left: 72, top: 150, width: 150, height: 150, borderRadius: 75, background: C.blue, border: `6px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...wrap, fontSize: 100, color: C.cream}}>{s.n}</div>
          <div style={{position: 'absolute', left: 72, right: 72, top: 330, ...wrap, fontSize: 76, color: fg}}>{s.title}</div>
          <div style={{position: 'absolute', left: 72, width: 520, top: 800, fontFamily: FONT, fontWeight: 700, fontSize: 38, lineHeight: 1.3, color: fg, opacity: 0.8}}>{s.sub}</div>
          <div style={{position: 'absolute', left: 72, bottom: 130, padding: '16px 30px', background: C.ink, color: C.cream, borderRadius: 18, fontFamily: FONT, fontWeight: 900, fontSize: 38}}>SÌ = 1 PUNTO</div>
        </>
      )}

      {s.kind === 'step' && (
        <>
          <div style={{position: 'absolute', left: 72, top: 150, ...wrap, fontSize: 38, color: C.blue, letterSpacing: 4}}>{s.kicker ?? 'PASSO'}</div>
          <div style={{position: 'absolute', left: 60, top: 170, ...wrap, fontSize: 330, color: C.blue, lineHeight: 1, letterSpacing: -10}}>{s.n}</div>
          <div style={{position: 'absolute', left: 72, width: 650, top: 520, ...wrap, fontSize: 80, color: fg}}>{s.title}</div>
          <div style={{position: 'absolute', left: 72, width: 520, top: 740, fontFamily: FONT, fontWeight: 700, fontSize: 38, lineHeight: 1.32, color: fg, opacity: 0.85}}>{s.sub}</div>
        </>
      )}

      {big && s.kicker && (
        <div style={{position: 'absolute', left: 72, top: 130, padding: '8px 22px', background: C.blue, color: '#fff', borderRadius: 14, fontFamily: FONT, fontWeight: 900, fontSize: 34, letterSpacing: 2}}>{s.kicker}</div>
      )}
      {big && (
        <>
          <div style={{position: 'absolute', left: 72, top: s.kind === 'cover' ? 200 : 240, width: 650, ...wrap, fontSize: s.title.length > 34 ? 78 : s.kind === 'cover' ? 92 : 90, color: fg}}>{s.title}</div>
          <div style={{position: 'absolute', left: 72, width: 560, top: s.kind === 'cover' ? 820 : 780, fontFamily: FONT, fontWeight: 700, fontSize: 42, lineHeight: 1.3, color: C.blueL}}>{s.sub}</div>
          {s.kind === 'cta' && (
            <div style={{position: 'absolute', left: 72, bottom: 140, padding: '20px 40px', background: C.blue, color: C.cream, border: `6px solid ${C.cream}`, borderRadius: 24, fontFamily: FONT, fontWeight: 900, fontSize: 72, letterSpacing: 2}}>ANALISI</div>
          )}
        </>
      )}

      {s.kind === 'pair' && (
        <div style={{position: 'absolute', left: 72, right: 72, top: 120, bottom: 140, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22}}>
          <div style={{background: '#fff', border: `6px solid ${C.ink}`, borderRadius: 30, boxShadow: `10px 10px 0 ${C.red}`, padding: '26px 32px 32px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
              <div style={{width: 84, height: 84, borderRadius: 42, background: C.red, border: `6px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...wrap, fontSize: 52, color: '#fff', flexShrink: 0, letterSpacing: 0}}>{s.n}</div>
              <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 34, color: C.red, letterSpacing: 3}}>{s.errLabel ?? '✕ ERRORE'}</div>
            </div>
            <div style={{...wrap, fontSize: 76, color: C.ink, marginTop: 18}}>{s.err}</div>
            <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 38, lineHeight: 1.3, color: C.ink, opacity: 0.75, marginTop: 14}}>{s.errSub}</div>
          </div>
          <svg width={90} height={70} viewBox="0 0 90 70" style={{alignSelf: 'center'}}>
            <path d="M 45 4 L 45 50 M 20 32 L 45 60 L 70 32" stroke={C.ink} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{background: C.blue, border: `6px solid ${C.ink}`, borderRadius: 30, boxShadow: `10px 10px 0 ${C.ink}`, padding: '26px 32px 32px'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20}}>
              <div>
                <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 34, color: '#fff', letterSpacing: 3}}>{s.fixLabel ?? '✓ ESERCIZIO'}</div>
                <div style={{...wrap, fontSize: 72, color: '#fff', marginTop: 14}}>{s.fix}</div>
              </div>
              <div style={{flexShrink: 0}}>{s.icon && <Icon k={s.icon} />}</div>
            </div>
            <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 38, lineHeight: 1.3, color: '#fff', marginTop: 16}}>{s.fixSub}</div>
          </div>
        </div>
      )}

      {s.kind === 'check' && (
        <>
          <div style={{position: 'absolute', left: 72, right: 72, top: 140, ...wrap, fontSize: 80, color: C.ink}}>{s.title}</div>
          <div style={{position: 'absolute', left: 72, right: 72, top: 400, display: 'flex', flexDirection: 'column', gap: 22}}>
            {s.items!.map((it, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 24, background: '#fff', border: `6px solid ${C.ink}`, borderRadius: 24, boxShadow: `8px 8px 0 ${C.blue}`, padding: '18px 26px'}}>
                <div style={{width: 64, height: 64, borderRadius: 16, background: C.blue, border: `5px solid ${C.ink}`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 40, flexShrink: 0}}>✓</div>
                <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 42, color: C.ink, lineHeight: 1.15}}>{it}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {s.kind === 'table' && (
        <>
          <div style={{position: 'absolute', left: 72, right: 72, top: 130, display: 'flex', alignItems: 'center', gap: 24}}>
            <div style={{width: 130, height: 130, borderRadius: 30, background: C.blue, border: `6px solid ${C.ink}`, boxShadow: `8px 8px 0 ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...wrap, fontSize: 90, color: '#fff', letterSpacing: 0}}>{s.title.slice(-1)}</div>
            <div>
              <div style={{...wrap, fontSize: 84, color: C.ink}}>{s.title}</div>
              <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 38, color: C.blue}}>{s.sub} · 40 minuti</div>
            </div>
          </div>
          <div style={{position: 'absolute', left: 72, right: 72, top: 330, display: 'flex', flexDirection: 'column', gap: 18}}>
            {s.items!.map((it, i) => {
              const [name, dose] = it.split('|');
              return (
                <div key={i} style={{display: 'flex', alignItems: 'center', gap: 20, background: '#fff', border: `6px solid ${C.ink}`, borderRadius: 24, padding: '34px 24px'}}>
                  <div style={{width: 58, height: 58, borderRadius: 29, background: C.ink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 32, flexShrink: 0}}>{i + 1}</div>
                  <div style={{flex: 1, fontFamily: FONT, fontWeight: 900, fontSize: 44, color: C.ink, lineHeight: 1.1}}>{name}</div>
                  <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 38, color: '#fff', background: C.blue, borderRadius: 14, padding: '8px 16px', border: `4px solid ${C.ink}`, whiteSpace: 'nowrap'}}>{dose}</div>
                </div>
              );
            })}
          </div>
          {s.note && <div style={{position: 'absolute', left: 72, right: 72, bottom: 110, fontFamily: FONT, fontWeight: 700, fontSize: 28, color: C.ink, opacity: 0.6}}>{s.note}</div>}
        </>
      )}

      {s.kind === 'timeline' && (
        <>
          <div style={{position: 'absolute', left: 72, right: 72, top: 130, ...wrap, fontSize: 84, color: C.ink}}>{s.title}</div>
          <div style={{position: 'absolute', left: 72, right: 72, top: 340, display: 'flex', flexDirection: 'column', gap: 34}}>
            {s.items!.map((it, i) => {
              const [min, name, desc] = it.split('|');
              const main = i === 1;
              return (
                <div key={i} style={{display: 'flex', alignItems: 'stretch', gap: 0, border: `6px solid ${C.ink}`, borderRadius: 28, overflow: 'hidden', boxShadow: `8px 8px 0 ${main ? C.ink : C.blue}`, minHeight: main ? 320 : 220}}>
                  <div style={{width: 210, background: main ? C.blue : C.ink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', ...wrap, fontSize: main ? 96 : 72, letterSpacing: -2}}>{min}</div>
                  <div style={{flex: 1, background: '#fff', padding: '22px 26px', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                    <div style={{...wrap, fontSize: 54, color: C.ink}}>{name}</div>
                    <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 34, color: C.ink, opacity: 0.75, marginTop: 8, lineHeight: 1.25}}>{desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {s.kind === 'week' && (
        <>
          <div style={{position: 'absolute', left: 72, right: 72, top: 130, ...wrap, fontSize: 84, color: C.ink}}>{s.title}</div>
          <div style={{position: 'absolute', left: 72, right: 72, top: 280, display: 'flex', flexDirection: 'column', gap: 14}}>
            {s.items!.map((it, i) => {
              const [day, code, label] = it.split('|');
              const train = code === 'A' || code === 'B';
              const active = code === '~';
              return (
                <div key={i} style={{display: 'flex', alignItems: 'center', gap: 22, background: train ? C.blue : '#fff', border: `6px solid ${C.ink}`, borderRadius: 22, padding: '14px 22px'}}>
                  <div style={{width: 110, fontFamily: FONT, fontWeight: 900, fontSize: 38, color: train ? '#fff' : C.ink}}>{day}</div>
                  <div style={{width: 64, height: 64, borderRadius: 16, background: train ? '#fff' : active ? C.blueL : '#EEE', border: `5px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 36, color: C.ink}}>{train ? code : active ? '↗' : '–'}</div>
                  <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 40, color: train ? '#fff' : C.ink, opacity: train || active ? 1 : 0.55}}>{label}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {s.kind === 'rule' && (
        <>
          <div style={{position: 'absolute', left: 72, right: 72, top: 130, ...wrap, fontSize: 84, color: C.ink}}>{s.title}</div>
          <div style={{position: 'absolute', left: 72, right: 72, top: 420, background: C.blue, border: `6px solid ${C.ink}`, borderRadius: 32, boxShadow: `12px 12px 0 ${C.ink}`, padding: '40px 40px 46px'}}>
            <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 52, lineHeight: 1.2, color: '#fff'}}>{s.sub}</div>
            <div style={{display: 'flex', gap: 18, marginTop: 30}}>
              {['+1–2 kg', 'oppure', '+1 ripetizione'].map((x, i) => (
                <div key={i} style={{fontFamily: FONT, fontWeight: 900, fontSize: 40, color: i === 1 ? '#fff' : C.ink, background: i === 1 ? 'transparent' : '#fff', border: i === 1 ? 'none' : `5px solid ${C.ink}`, borderRadius: 16, padding: '8px 20px', alignSelf: 'center'}}>{x}</div>
              ))}
            </div>
          </div>
          {s.note && <div style={{position: 'absolute', left: 72, right: 72, top: 1000, fontFamily: FONT, fontWeight: 800, fontSize: 40, color: C.ink, lineHeight: 1.25}}>{s.note}</div>}
        </>
      )}

      {s.kind === 'result' && (
        <>
          <div style={{position: 'absolute', left: 72, right: 72, top: 150, ...wrap, fontSize: 90, color: fg}}>{s.title}</div>
          {s.lines!.map((ln, i) => {
            const [pts, txt, tone] = ln.split('|');
            const col = tone === 'ok' ? C.blue : tone === 'mid' ? C.ink : C.red;
            return (
              <div key={i} style={{position: 'absolute', left: 72, right: 72, top: 360 + i * 270, height: 235, background: C.paper, border: `6px solid ${C.ink}`, borderRadius: 28, boxShadow: `10px 10px 0 ${col}`, display: 'flex', alignItems: 'center', padding: '0 36px', gap: 36}}>
                <div style={{...wrap, fontSize: 92, color: col, minWidth: 250}}>{pts}</div>
                <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 38, lineHeight: 1.22, color: C.ink, maxWidth: 400}}>{txt}</div>
              </div>
            );
          })}
        </>
      )}

      {big && <div style={{position: 'absolute', right: -40, bottom: 40, width: 430, height: 700, borderRadius: 215, background: C.cream, opacity: 0.96}} />}
      <svg width={SW} height={SH} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
        <Riky x={s.kind === 'result' ? 900 : 830} y={SH - 40} scale={['result', 'pair', 'check', 'table', 'timeline', 'week', 'rule'].includes(s.kind) ? 0.0 : s.kind === 'q' || s.kind === 'step' ? 0.55 : 0.6} {...rk} />
      </svg>
      <Foot dark={dark} last={s.kind === 'cta'} />
    </AbsoluteFill>
  );
};
