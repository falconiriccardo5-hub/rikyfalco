/** Caroselli del Mese 2 (16 nov → 11 dic 2026). 1080×1350. Tre stili: light, dark, soft. */
import React from 'react';
import {AbsoluteFill, staticFile} from 'remotion';
import {FONT} from '../brand';
import {Riky} from '../Riky';

export const SW2 = 1080;
export const SH2 = 1350;
const VIO = '#6D3BD2';
const VIO_L = '#B9A2F2';
const RED = '#E5484D';
const GREEN = '#2E9E62';
const AMBER = '#E9A23B';

type Th = 'light' | 'dark' | 'soft';
type S =
  | {k: 'cover'; kicker: string; title: string; sub?: string; big?: string}
  | {k: 'item'; n: string; label?: string; title: string; text: string}
  | {k: 'list'; title: string; items: string[]; mark?: 'check' | 'x' | 'num'; sub?: string; note?: string; start?: number}
  | {k: 'statement'; kicker?: string; title: string; text?: string; note?: string}
  | {k: 'loop'; title: string; items: string[]; sub?: string}
  | {k: 'traffic'; title: string; items: string[]}
  | {k: 'compare'; title: string; cols: [string, string]; rows: string[]}
  | {k: 'phase'; n: string; kicker: string; title: string; items: string[]}
  | {k: 'cta'; title: string; sub: string};

type Deck = {theme: Th; file: string; slides: S[]};

export const DECKS2: Record<string, Deck> = {
  postura: {
    theme: 'light',
    file: 'carosello-m2-01-postura',
    slides: [
      {k: 'cover', kicker: 'SE LAVORI SEDUTO', title: 'LA TUA POSTURA STA [PEGGIORANDO]. ECCO I 5 SEGNALI.', sub: 'Il terzo è quello che si sottovaluta di più.', big: '5'},
      {k: 'item', n: '1', label: 'SEGNALE', title: 'Le spalle vanno in avanti', text: 'Nelle foto di profilo le spalle stanno davanti alle orecchie. È la posizione da tastiera che diventa abitudine.'},
      {k: 'item', n: '2', label: 'SEGNALE', title: 'Collo rigido a fine giornata', text: 'Girare la testa per fare retromarcia la sera costa più fatica che al mattino.'},
      {k: 'item', n: '3', label: 'SEGNALE', title: 'Ti alzi dalla sedia a fatica', text: 'Dopo una riunione lunga ti serve un attimo per raddrizzarti. Glutei e anche sono fermi da ore.'},
      {k: 'item', n: '4', label: 'SEGNALE', title: 'Fiato corto sulle scale', text: 'Non è solo questione di fiato: sono gambe che durante la giornata lavorano poco.'},
      {k: 'item', n: '5', label: 'SEGNALE', title: 'Rialzarti da terra è difficile', text: 'Prova adesso: siediti a terra e rialzati senza usare le mani. Com’è andata?'},
      {k: 'list', title: 'DA DOMANI, IN 10 MINUTI', mark: 'check', items: ['Alzati ogni 45–60 minuti', '10 squat alla sedia', 'Rematore con elastico 2 × 12', '10 minuti a piedi dopo pranzo']},
      {k: 'statement', kicker: 'IL PUNTO', title: 'Se hai 3 segnali o più, [serve un programma].', text: 'Costruito sulla tua giornata, con carichi che salgono e controlli regolari. Online o in studio.', note: 'Questi segnali non sono una diagnosi: per dolori forti o persistenti senti il medico.'},
      {k: 'cta', title: 'QUANTI SEGNALI HAI?', sub: 'Scrivimi ANALISI in DM: partiamo da lì.'},
    ],
  },
  ritenzione: {
    theme: 'soft',
    file: 'carosello-m2-02-ritenzione',
    slides: [
      {k: 'cover', kicker: 'RITENZIONE', title: 'GONFIA LA SERA? 6 COSE CHE [AIUTANO DAVVERO].', sub: 'E 3 su cui puoi smettere di spendere soldi.'},
      {k: 'statement', kicker: 'PRIMA DI TUTTO', title: 'Il gonfiore della sera ha [quasi sempre] una storia.', text: 'Tante ore ferma, seduta o in piedi, e quello che mangi e bevi. Quando i muscoli delle gambe lavorano, aiutano i liquidi a risalire.'},
      {k: 'list', title: 'COSA AIUTA · 1–3', mark: 'num', items: ['Muoverti ogni ora, anche solo 3 minuti', 'Allenare gambe e glutei: sono una pompa', 'Camminare dopo i pasti']},
      {k: 'list', title: 'COSA AIUTA · 4–6', mark: 'num', start: 4, items: ['Bere acqua durante tutta la giornata', 'Gestire sale e alcol (cibi pronti, aperitivi)', 'Dormire con orari regolari']},
      {k: 'list', title: '3 SOLDI BUTTATI', mark: 'x', items: ['Creme “drenanti” miracolose', 'Tisane come unica soluzione', 'Fasce e guaine “snellenti”'], sub: 'Possono dare una sensazione sul momento, ma non cambiano le abitudini che creano il gonfiore.'},
      {k: 'statement', kicker: 'ATTENZIONE', title: 'Gonfiore improvviso, doloroso o [solo da una gamba]?', text: 'Non è un tema da allenamento: parlane con il tuo medico.'},
      {k: 'statement', kicker: 'LA DIFFERENZA', title: 'Non la fa un prodotto. [La fa la costanza.]', text: 'Forza 2–3 volte a settimana e poche abitudini semplici, costruite sulla tua giornata.'},
      {k: 'cta', title: 'VUOI UN PIANO SULLA TUA GIORNATA?', sub: 'Scrivimi ANALISI in DM.'},
    ],
  },
  schiena: {
    theme: 'dark',
    file: 'carosello-m2-03-schiena',
    slides: [
      {k: 'cover', kicker: 'MAL DI SCHIENA DA SCRIVANIA', title: 'STARE FERMI [NON LO FA PASSARE].', sub: 'Perché il riposo non basta e da dove ripartire. Salvalo.'},
      {k: 'loop', title: 'IL CIRCOLO DA SPEZZARE', items: ['Fa male', 'Ti muovi meno', 'Muscoli più deboli', 'Fa male prima'], sub: 'Ogni giro rende il successivo più facile.'},
      {k: 'statement', kicker: 'COSA DICONO LE LINEE GUIDA', title: 'Per il mal di schiena comune: [restare attivi] e fare esercizio.', text: 'Il riposo a letto prolungato non è consigliato. Il movimento graduale sì.'},
      {k: 'list', title: '3 MOVIMENTI PER INIZIARE', mark: 'num', items: ['Ponte glutei · 2 × 10', 'Bird dog · 2 × 8 per lato', 'Camminata · 15 minuti'], sub: 'Lenti e controllati. Il fastidio non deve aumentare.'},
      {k: 'traffic', title: 'LA REGOLA DEL SEMAFORO', items: ['g|Fastidio lieve che non peggiora|Continua', 'a|Aumenta ma passa entro 24 ore|Riduci carico o ripetizioni', 'r|Aumenta e resta il giorno dopo|Fermati e parlane']},
      {k: 'list', title: 'QUANDO ANDARE DAL MEDICO', mark: 'x', items: ['Dolore forte dopo una caduta', 'Formicolio o debolezza a una gamba', 'Febbre o dolore notturno che non passa', 'Problemi a urinare']},
      {k: 'statement', kicker: 'IL PASSO SUCCESSIVO', title: 'Un programma [progressivo], non esercizi a caso.', text: 'Scelgo esercizi e varianti in base a come rispondi, seduta dopo seduta.'},
      {k: 'cta', title: 'VUOI RIPARTIRE NEL MODO GIUSTO?', sub: 'Scrivimi ANALISI in DM.'},
    ],
  },
  cellulite: {
    theme: 'soft',
    file: 'carosello-m2-04-cellulite',
    slides: [
      {k: 'cover', kicker: 'CELLULITE, SENZA BUGIE', title: 'NESSUNO PUÒ CANCELLARLA. MA [PUOI MIGLIORARLA].', sub: 'Cosa funziona, cosa no e cosa aspettarti davvero.'},
      {k: 'statement', kicker: 'PRIMA LA VERITÀ', title: 'Riguarda [la grande maggioranza] delle donne.', text: 'Anche magre e allenate. È una caratteristica di pelle e tessuto sottostante, non una malattia e non una colpa.'},
      {k: 'list', title: 'COSA LA RENDE PIÙ VISIBILE', mark: 'x', items: ['Tante ore ferma', 'Aumento di grasso', 'Gambe e glutei poco allenati', 'Ritenzione']},
      {k: 'list', title: 'COSA LA MIGLIORA', mark: 'check', items: ['Forza su glutei e gambe', 'Perdere grasso, se serve', 'Muoverti ogni giorno', 'Costanza per mesi, non settimane']},
      {k: 'list', title: 'COSA NON FA MIRACOLI', mark: 'x', items: ['Creme', 'Massaggi da soli', 'Programmi “detox”'], sub: 'Sul momento possono dare una bella sensazione. Non sostituiscono il lavoro sul corpo.'},
      {k: 'statement', kicker: 'ASPETTATIVE REALISTICHE', title: 'Gambe più [toniche e forti]. Non una foto ritoccata.', text: 'È questo l’obiettivo di un lavoro costante di qualche mese. Ogni corpo ha i suoi tempi.'},
      {k: 'statement', kicker: 'COME LAVORO', title: 'Forza, movimento, alimentazione [sostenibile].', text: 'Un piano costruito su di te, con controlli regolari. Online o in studio.'},
      {k: 'cta', title: 'VUOI IL TUO PIANO PER GAMBE E GLUTEI?', sub: 'Scrivimi ANALISI in DM.'},
    ],
  },
  percorsi: {
    theme: 'dark',
    file: 'carosello-m2-05-online-o-studio',
    slides: [
      {k: 'cover', kicker: 'PERCORSI RF COACHING', title: 'ONLINE O IN STUDIO? [SCEGLI IN 30 SECONDI].', sub: 'Due percorsi, stesso metodo. Scorri e trova il tuo.'},
      {k: 'list', title: 'IN ENTRAMBI', mark: 'check', items: ['Valutazione iniziale', 'Programma costruito su di te', 'Progressione settimana dopo settimana', 'Controlli regolari']},
      {k: 'list', title: 'IN STUDIO È PER TE SE…', mark: 'num', items: ['Vuoi la correzione dal vivo', 'Parti da zero o rientri dopo uno stop', 'Ti serve un appuntamento fisso', 'Sei in zona studio']},
      {k: 'list', title: 'ONLINE È PER TE SE…', mark: 'num', items: ['Hai orari che cambiano', 'Ti alleni già in palestra o a casa', 'Vuoi autonomia, con una guida', 'Non sei vicino allo studio']},
      {k: 'compare', title: 'A CONFRONTO', cols: ['ONLINE', 'STUDIO'], rows: ['Correzioni|Sui tuoi video|Dal vivo', 'Orari|Li scegli tu|Su appuntamento', 'Dove|Ovunque|In studio', 'Metodo|Lo stesso|Lo stesso']},
      {k: 'statement', kicker: 'NON SAI ANCORA QUALE?', title: 'È normale. [Lo decidiamo insieme.]', text: 'Durante l’analisi, in base a tempo, obiettivi e livello.'},
      {k: 'cta', title: 'SCOPRIAMO QUALE FA PER TE', sub: 'Scrivimi ANALISI in DM.'},
    ],
  },
  glutei: {
    theme: 'light',
    file: 'carosello-m2-06-glutei-cosce',
    slides: [
      {k: 'cover', kicker: 'GLUTEI E COSCE', title: '100 SQUAT AL GIORNO [NON BASTANO].', sub: 'Ecco il piano in 3 fasi che userei io.', big: '3'},
      {k: 'statement', kicker: 'PERCHÉ', title: 'Il grasso [non si consuma] dove alleni.', text: 'Cala da tutto il corpo. E su cosce e glutei spesso è l’ultimo ad andare via.'},
      {k: 'phase', n: '1', kicker: 'SETTIMANE 1–4', title: 'BASI E ABITUDINI', items: ['2–3 sedute di forza', 'Tecnica di squat, hip thrust, affondi', 'Più passi ogni giorno', 'Proteine a ogni pasto']},
      {k: 'phase', n: '2', kicker: 'SETTIMANE 5–8', title: 'PROGRESSIONE', items: ['Carichi che salgono', 'Leggero deficit calorico', 'Passi in aumento']},
      {k: 'phase', n: '3', kicker: 'SETTIMANE 9–12', title: 'CONSOLIDAMENTO', items: ['Varianti mirate', 'Check di misure e foto', 'Settimana di scarico, se serve']},
      {k: 'list', title: 'COSA MISURIAMO', mark: 'check', items: ['Vita, fianchi e cosce', 'Foto ogni 4 settimane', 'Carichi e ripetizioni', 'Energia e sonno']},
      {k: 'statement', kicker: 'COSA ASPETTARTI', title: 'Le misure [cambiano prima] dello specchio.', text: 'Cambiamenti graduali, con tempi che dipendono da te e dal tuo punto di partenza.'},
      {k: 'cta', title: 'VUOI LE TUE 12 SETTIMANE?', sub: 'Scrivimi ANALISI in DM.'},
    ],
  },
  feste: {
    theme: 'soft',
    file: 'carosello-m2-07-feste',
    slides: [
      {k: 'cover', kicker: 'SALVALO PER LE FESTE', title: 'FESTE SENZA SENSI DI COLPA: [5 REGOLE].', sub: 'Per non ripartire da zero a gennaio. Nessuna dieta, nessun digiuno.', big: '5'},
      {k: 'item', n: '1', label: 'REGOLA', title: 'Allenati, anche poco', text: '20 minuti valgono più di zero. Tieni almeno 1–2 sedute brevi a settimana.'},
      {k: 'item', n: '2', label: 'REGOLA', title: 'Cammina dopo i pasti grandi', text: '10–15 minuti dopo pranzo o cena. Ti senti più leggera e aggiungi passi.'},
      {k: 'item', n: '3', label: 'REGOLA', title: 'Sale e alcol con criterio', text: 'Scegli tu le occasioni, non tutti i giorni. Un bicchiere d’acqua tra un drink e l’altro.'},
      {k: 'item', n: '4', label: 'REGOLA', title: 'Niente digiuni per compensare', text: 'Saltare i pasti spesso porta a mangiare di più dopo. Mangia normalmente.'},
      {k: 'item', n: '5', label: 'REGOLA', title: 'Il giorno dopo si riparte', text: 'Un pranzo abbondante non rovina niente. Conta quello che fai nei giorni dopo.'},
      {k: 'statement', kicker: 'BUONO A SAPERSI', title: 'Il gonfiore del giorno dopo [non è grasso].', text: 'Spesso sono liquidi e cibo ancora da digerire. Torna giù riprendendo le tue abitudini.'},
      {k: 'cta', title: 'ARRIVA A GENNAIO GIÀ IN MOVIMENTO', sub: 'Scrivimi ANALISI in DM.'},
    ],
  },
  analisi2: {
    theme: 'dark',
    file: 'carosello-m2-08-analisi',
    slides: [
      {k: 'cover', kicker: 'NIENTE SORPRESE', title: 'HAI PAURA CHE TI VENDA QUALCOSA? [ECCO COSA SUCCEDE] QUANDO MI SCRIVI.', sub: 'Passo per passo, senza giri di parole.'},
      {k: 'item', n: '1', label: 'PASSO', title: 'Mi scrivi “ANALISI”', text: 'Una parola in DM. Ti rispondo io, non un messaggio automatico.'},
      {k: 'list', title: 'TI FACCIO 4 DOMANDE', mark: 'num', items: ['Lavoro e orari', 'Il tuo obiettivo', 'Dolori o infortuni', 'Quanti giorni hai davvero']},
      {k: 'item', n: '3', label: 'PASSO', title: 'Ti dico cosa vedo', text: 'Da dove partirei, cosa eviterei, cosa ha senso cambiare subito. Anche se poi non lavoriamo insieme.'},
      {k: 'item', n: '4', label: 'PASSO', title: 'Solo se ha senso, ti propongo un percorso', text: 'Online o in studio, con tutte le condizioni chiare. Poi decidi tu.'},
      {k: 'list', title: 'COSA NON SUCCEDE', mark: 'x', items: ['Nessuna chiamata a sorpresa', 'Nessun messaggio insistente', 'Nessun obbligo']},
      {k: 'list', title: 'È PER TE SE…', mark: 'check', items: ['Lavori e hai poco tempo', 'Hai fastidi da postura', 'Vuoi lavorare su gambe, glutei e addome']},
      {k: 'cta', title: 'UNA PAROLA. IL RESTO LO FACCIAMO INSIEME.', sub: 'Scrivimi ANALISI in DM.'},
    ],
  },
};

/* ------------------------------------------------------------------ stile */
const TH = {
  light: {bg: '#FFFFFF', fg: '#111111', mute: 'rgba(17,17,17,.62)', card: '#F4F1FB', line: 'rgba(17,17,17,.12)', acc: VIO, dot: 'rgba(17,17,17,.08)'},
  dark: {bg: '#111111', fg: '#F5F3EE', mute: 'rgba(245,243,238,.62)', card: '#1E1B26', line: 'rgba(245,243,238,.14)', acc: VIO_L, dot: 'rgba(245,243,238,.06)'},
  soft: {bg: '#F6F0EA', fg: '#1A1414', mute: 'rgba(26,20,20,.62)', card: '#FFFFFF', line: 'rgba(26,20,20,.12)', acc: VIO, dot: 'rgba(109,59,210,.07)'},
};
const H: React.CSSProperties = {fontFamily: FONT, fontWeight: 900, letterSpacing: -2, lineHeight: 1.02};

/** testo con [parole evidenziate] */
const Hl: React.FC<{t: string; bg?: string; fg?: string}> = ({t, bg = VIO, fg = '#fff'}) => (
  <>
    {t.split(/(\[[^\]]+\])/).map((p, i) =>
      p.startsWith('[') ? (
        <span key={i} style={{background: bg, color: fg, padding: '0 14px', borderRadius: 14, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone'}}>
          {p.slice(1, -1)}
        </span>
      ) : (
        <span key={i}>{p}</span>
      ),
    )}
  </>
);

const Mark: React.FC<{m: 'check' | 'x' | 'num'; i: number; acc: string; start?: number}> = ({m, i, acc, start = 1}) => {
  const bg = m === 'x' ? RED : acc === VIO_L ? VIO : acc;
  return (
    <div style={{width: 76, height: 76, borderRadius: 22, background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 42, flexShrink: 0}}>
      {m === 'check' ? '✓' : m === 'x' ? '✕' : i + start}
    </div>
  );
};

export const Mese2Slide: React.FC<{deck: string; index: number}> = ({deck, index}) => {
  const d = DECKS2[deck];
  const s = d.slides[index];
  const total = d.slides.length;
  const th = TH[d.theme];
  const last = index === total - 1;
  const coverDark = s.k === 'cover' && d.theme !== 'dark';
  const bg = s.k === 'cta' ? VIO : coverDark && d.theme === 'light' ? '#111111' : th.bg;
  const fg = s.k === 'cta' || (coverDark && d.theme === 'light') ? '#F5F3EE' : th.fg;
  const mute = s.k === 'cta' ? 'rgba(255,255,255,.8)' : coverDark && d.theme === 'light' ? 'rgba(245,243,238,.7)' : th.mute;
  return (
    <AbsoluteFill style={{background: bg, backgroundImage: `radial-gradient(${s.k === 'cta' ? 'rgba(255,255,255,.08)' : th.dot} 2.5px, transparent 3px)`, backgroundSize: '54px 54px', color: fg}}>
      <style>{`
        @font-face{font-family:'Inter';font-weight:900;src:url(${staticFile('fonts/Inter-Black.otf')});}
        @font-face{font-family:'Inter';font-weight:800;src:url(${staticFile('fonts/Inter-ExtraBold.otf')});}
        @font-face{font-family:'Inter';font-weight:700;src:url(${staticFile('fonts/Inter-Bold.otf')});}
      `}</style>
      {/* testata */}
      <div style={{position: 'absolute', top: 54, left: 80, right: 80, display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontWeight: 800, fontSize: 28, opacity: 0.75}}>
        <span>@riccardofalconi_coach</span>
        <span>
          {index + 1}/{total}
        </span>
      </div>
      {/* barra di avanzamento */}
      <div style={{position: 'absolute', top: 104, left: 80, right: 80, height: 6, borderRadius: 3, background: s.k === 'cta' ? 'rgba(255,255,255,.25)' : th.line}}>
        <div style={{width: `${((index + 1) / total) * 100}%`, height: '100%', borderRadius: 3, background: s.k === 'cta' ? '#fff' : th.acc === VIO_L ? VIO : th.acc}} />
      </div>

      {s.k === 'cover' && (
        <>
          {s.big && (
            <div style={{position: 'absolute', right: 40, bottom: 120, ...H, fontSize: s.big.length > 2 ? 300 : 560, letterSpacing: -20, color: d.theme === 'soft' ? 'rgba(109,59,210,.12)' : 'rgba(185,162,242,.16)', lineHeight: 0.8}}>{s.big}</div>
          )}
          <div style={{position: 'absolute', left: 80, top: 200, padding: '10px 24px', background: VIO, color: '#fff', borderRadius: 14, fontFamily: FONT, fontWeight: 900, fontSize: 32, letterSpacing: 2}}>{s.kicker}</div>
          <div style={{position: 'absolute', left: 80, right: 80, top: 310, ...H, lineHeight: 1.08, fontSize: s.title.length > 60 ? 92 : s.title.length > 42 ? 106 : 124, color: fg}}>
            <Hl t={s.title} />
          </div>
          {s.sub && <div style={{position: 'absolute', left: 80, right: s.big ? 380 : 120, bottom: 190, fontFamily: FONT, fontWeight: 800, fontSize: 44, lineHeight: 1.25, color: d.theme === 'soft' ? VIO : VIO_L}}>{s.sub}</div>}
          <div style={{position: 'absolute', left: 80, bottom: 70, fontFamily: FONT, fontWeight: 900, fontSize: 32, letterSpacing: 3, opacity: 0.8}}>SCORRI →</div>
        </>
      )}

      {s.k === 'item' && (
        <>
          <div style={{position: 'absolute', left: 80, top: 200, fontFamily: FONT, fontWeight: 900, fontSize: 34, letterSpacing: 6, color: th.acc}}>{s.label}</div>
          <div style={{position: 'absolute', left: 64, top: 230, ...H, fontSize: 420, letterSpacing: -16, color: th.acc, lineHeight: 1}}>{s.n}</div>
          <div style={{position: 'absolute', left: 80, right: 80, top: 690, display: 'flex', flexDirection: 'column', gap: 40}}>
            <div style={{...H, fontSize: s.title.length > 28 ? 80 : 92, color: fg}}>{s.title}</div>
            <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 42, lineHeight: 1.32, color: mute, marginRight: 60}}>{s.text}</div>
          </div>
        </>
      )}

      {s.k === 'list' && (
        <>
          <div style={{position: 'absolute', left: 80, right: 80, top: 190, ...H, fontSize: 84, color: fg}}>{s.title}</div>
          <div style={{position: 'absolute', left: 80, right: 80, top: 420, display: 'flex', flexDirection: 'column', gap: 24}}>
            {s.items.map((it, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 28, background: th.card, borderRadius: 28, padding: '26px 30px'}}>
                <Mark m={s.mark ?? 'check'} i={i} acc={th.acc} start={s.start} />
                <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 46, lineHeight: 1.15, color: fg, textDecoration: s.mark === 'x' ? 'none' : 'none'}}>{it}</div>
              </div>
            ))}
          </div>
          {s.sub && <div style={{position: 'absolute', left: 80, right: 80, bottom: 150, fontFamily: FONT, fontWeight: 700, fontSize: 38, lineHeight: 1.3, color: mute}}>{s.sub}</div>}
        </>
      )}

      {s.k === 'statement' && (
        <>
          {s.kicker && <div style={{position: 'absolute', left: 80, top: 210, fontFamily: FONT, fontWeight: 900, fontSize: 34, letterSpacing: 6, color: th.acc}}>{s.kicker}</div>}
          <div style={{position: 'absolute', left: 80, right: 80, top: 300, ...H, lineHeight: 1.12, fontSize: s.title.length > 48 ? 96 : 112, color: fg}}>
            <Hl t={s.title} />
          </div>
          {s.text && <div style={{position: 'absolute', left: 80, right: 120, top: 860, fontFamily: FONT, fontWeight: 700, fontSize: 44, lineHeight: 1.32, color: mute}}>{s.text}</div>}
          {s.note && <div style={{position: 'absolute', left: 80, right: 80, bottom: 80, fontFamily: FONT, fontWeight: 700, fontSize: 28, lineHeight: 1.3, color: mute}}>{s.note}</div>}
        </>
      )}

      {s.k === 'loop' && (
        <>
          <div style={{position: 'absolute', left: 80, right: 80, top: 190, ...H, fontSize: 84, color: fg}}>{s.title}</div>
          <svg width={1080} height={1350} style={{position: 'absolute', inset: 0}}>
            <circle cx={540} cy={790} r={250} fill="none" stroke={th.acc} strokeWidth={6} strokeDasharray="18 16" />
            {[0, 1, 2, 3].map((i) => {
              const a = (i * Math.PI) / 2 + Math.PI / 4;
              const x = 540 + 250 * Math.cos(a + Math.PI / 4);
              const y = 790 + 250 * Math.sin(a + Math.PI / 4);
              return <path key={i} d={`M${x - 16} ${y - 16} l16 16 l-16 16`} transform={`rotate(${((a + Math.PI / 4) * 180) / Math.PI + 90} ${x} ${y})`} fill="none" stroke={th.acc} strokeWidth={8} strokeLinecap="round" />;
            })}
          </svg>
          {s.items.map((it, i) => {
            const pos = [
              [540, 540],
              [790, 790],
              [540, 1040],
              [290, 790],
            ][i];
            return (
              <div key={i} style={{position: 'absolute', left: pos[0] - 170, top: pos[1] - 58, width: 340, height: 116, borderRadius: 30, background: i === 3 ? RED : d.theme === 'dark' ? '#2A2535' : '#fff', color: i === 3 ? '#fff' : fg, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 40, lineHeight: 1.05, boxShadow: '0 10px 30px rgba(0,0,0,.25)'}}>
                {it}
              </div>
            );
          })}
          {s.sub && <div style={{position: 'absolute', left: 80, right: 80, bottom: 90, fontFamily: FONT, fontWeight: 700, fontSize: 38, color: mute, textAlign: 'center'}}>{s.sub}</div>}
        </>
      )}

      {s.k === 'traffic' && (
        <>
          <div style={{position: 'absolute', left: 80, right: 80, top: 190, ...H, fontSize: 84, color: fg}}>{s.title}</div>
          <div style={{position: 'absolute', left: 80, right: 80, top: 420, display: 'flex', flexDirection: 'column', gap: 30}}>
            {s.items.map((it, i) => {
              const [c, a, b] = it.split('|');
              const col = c === 'g' ? GREEN : c === 'a' ? AMBER : RED;
              return (
                <div key={i} style={{display: 'flex', alignItems: 'center', gap: 30, background: th.card, borderRadius: 30, padding: '30px 32px'}}>
                  <div style={{width: 96, height: 96, borderRadius: 48, background: col, flexShrink: 0, boxShadow: `0 0 40px ${col}88`}} />
                  <div>
                    <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 36, lineHeight: 1.25, color: mute}}>{a}</div>
                    <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 50, color: fg, marginTop: 4}}>{b}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {s.k === 'compare' && (
        <>
          <div style={{position: 'absolute', left: 80, right: 80, top: 190, ...H, fontSize: 84, color: fg}}>{s.title}</div>
          <div style={{position: 'absolute', left: 80, right: 80, top: 400}}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1.25fr 1.25fr', gap: 14, marginBottom: 14}}>
              <div />
              {s.cols.map((c, i) => (
                <div key={i} style={{background: i === 0 ? VIO : '#F5F3EE', color: i === 0 ? '#fff' : '#111', borderRadius: 20, padding: '22px 0', textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 40, letterSpacing: 2}}>
                  {c}
                </div>
              ))}
            </div>
            {s.rows.map((r, i) => {
              const [l, a, b] = r.split('|');
              return (
                <div key={i} style={{display: 'grid', gridTemplateColumns: '1fr 1.25fr 1.25fr', gap: 14, marginBottom: 14}}>
                  <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 36, color: mute, display: 'flex', alignItems: 'center'}}>{l}</div>
                  {[a, b].map((x, j) => (
                    <div key={j} style={{background: th.card, borderRadius: 20, padding: '30px 18px', textAlign: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 36, color: fg}}>
                      {x}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {s.k === 'phase' && (
        <>
          <div style={{position: 'absolute', left: 80, top: 190, display: 'flex', alignItems: 'center', gap: 30}}>
            <div style={{width: 200, height: 200, borderRadius: 50, background: VIO, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', ...H, fontSize: 150}}>{s.n}</div>
            <div>
              <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 34, letterSpacing: 5, color: th.acc}}>FASE {s.n} · {s.kicker}</div>
              <div style={{...H, fontSize: s.title.length > 12 ? 64 : 80, color: fg, marginTop: 10}}>{s.title}</div>
            </div>
          </div>
          <div style={{position: 'absolute', left: 80, right: 80, top: 500, display: 'flex', flexDirection: 'column', gap: 24}}>
            {s.items.map((it, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 28, background: th.card, borderRadius: 28, padding: '28px 30px'}}>
                <Mark m="check" i={i} acc={th.acc} />
                <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 46, color: fg}}>{it}</div>
              </div>
            ))}
          </div>
          {/* tre pallini di fase */}
          <div style={{position: 'absolute', left: 80, bottom: 90, display: 'flex', gap: 16}}>
            {['1', '2', '3'].map((x) => (
              <div key={x} style={{width: x === s.n ? 90 : 30, height: 30, borderRadius: 15, background: x === s.n ? VIO : th.line}} />
            ))}
          </div>
        </>
      )}

      {s.k === 'cta' && (
        <>
          <div style={{position: 'absolute', left: 80, right: 80, top: 210, ...H, fontSize: s.title.length > 30 ? 100 : 116, color: '#fff'}}>{s.title}</div>
          <div style={{position: 'absolute', left: 80, width: 560, top: 720, fontFamily: FONT, fontWeight: 800, fontSize: 46, lineHeight: 1.25, color: 'rgba(255,255,255,.9)'}}>{s.sub}</div>
          <div style={{position: 'absolute', left: 80, bottom: 150, padding: '24px 44px', background: '#fff', color: VIO, borderRadius: 28, fontFamily: FONT, fontWeight: 900, fontSize: 84, letterSpacing: 4, boxShadow: '0 20px 50px rgba(0,0,0,.25)'}}>ANALISI</div>
          <div style={{position: 'absolute', left: 84, bottom: 80, fontFamily: FONT, fontWeight: 800, fontSize: 30, color: 'rgba(255,255,255,.85)'}}>Gratis e senza impegno · ti rispondo io</div>
          <svg width={SW2} height={SH2} style={{position: 'absolute', inset: 0}}>
            <Riky x={880} y={SH2 - 20} scale={0.55} smile={1} mouth={0.4} />
          </svg>
        </>
      )}

      {!last && s.k !== 'cover' && <div style={{position: 'absolute', right: 80, bottom: 60, fontFamily: FONT, fontWeight: 900, fontSize: 30, letterSpacing: 3, opacity: 0.5}}>→</div>}
    </AbsoluteFill>
  );
};
