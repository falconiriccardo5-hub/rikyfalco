'use strict';
/*
 * Pioggia Nera — Capitolo I: «La figlia dell'orologiaio».
 * Tutta la sceneggiatura dei primi minuti di gioco.
 */
const Story = (() => {
  const G = Game.api;
  const { S, dante, lucia, say, think, choose, wait, clue, trust, objective, lightning } = G;
  const TOTAL_CLUES = 8;

  // ───────────────────────────── Prologo ─────────────────────────────
  async function intro() {
    G.hideTitle();
    await G.fade(1, 700);
    G.setScene('intro');
    Sound.rainLevel(0.6);
    await G.fade(0, 600);
    await G.caption([
      'Porto Grigio. Novembre 1953.',
      'Piove da sei giorni. La città ha smesso di chiedersi quando finirà.',
      'Mi chiamo Dante Moretti. Ex commissario di polizia.',
      "Oggi faccio l'investigatore privato. È come fare il commissario, ma senza stipendio e senza amici.",
      'Il mio ufficio è al terzo piano di un palazzo che sa di muffa e di segreti.',
      'Quella notte, qualcuno salì le mie scale.',
    ]);
    lightning(1, 0.3);
    await G.fade(1, 300);
  }

  async function opening() {
    G.setScene('room');
    Sound.rainLevel(1);
    dante.x = 167; dante.y = 107; dante.back = true;
    G.cam.z = 2; G.cam.cx = 167; G.cam.cy = 70;
    S.cinema = 1;
    await G.fade(0, 1400);
    await think('Mezzanotte meno un quarto. La pioggia batte sui vetri come un creditore che conosce il mio indirizzo.');
    await think("Un'altra notte senza clienti. Tanto vale guardarsi intorno.");
    Sound.music(true, 0.22);
    await Promise.all([G.zoom(1, 160, 90, 1600), G.cinema(0, 1200)]);
    dante.back = false;
    objective("Esamina l'ufficio");
    G.toast('Comandi', G.coarse ? 'Tocca il pavimento per muoverti e gli oggetti per esaminarli' : 'Frecce o WASD per muoverti · E per esaminare · N per il taccuino');
  }

  // ───────────────────────────── Esplorazione ─────────────────────────────
  const seen = {};
  async function examine(id) {
    const n = seen[id] = (seen[id] || 0) + 1;
    const first = n === 1;
    switch (id) {
      case 'window':
        if (first) {
          await think("Dall'altra parte della strada, l'insegna dell'Hotel Miramare. Metà delle lettere sono morte da anni. Come metà dei clienti.");
          await think('Sotto il lampione è parcheggiata una berlina nera. Motore acceso, fari spenti. È lì da un\'ora.');
          await think('A Porto Grigio nessuno aspetta un\'ora sotto la pioggia per piacere.');
          clue('car', 'Una berlina nera aspetta sotto il palazzo, a fari spenti.');
        } else await think('La berlina è ancora lì. Anch\'io, se è per questo.');
        break;
      case 'coat':
        if (first) {
          await think('Il mio impermeabile. Ancora bagnato da ieri.');
          await think('In questa città nessuno ha un impermeabile asciutto, da novembre. Né la coscienza pulita.');
        } else await think('Gocciola ancora. Un giorno si asciugherà. Forse.');
        break;
      case 'cabinet':
        if (first) {
          await think('Lo schedario. Casi chiusi, casi persi, casi che nessuno mi ha mai pagato.');
          await think('Sopra, una foto: io e Sandro Bellini, il giorno della promozione. Il mio partner.');
          await think('Cinque anni fa lo ripescarono dal fiume. La stessa notte in cui chiusero il caso del Corvo.');
          await think("Troppo in fretta. L'ultimo cassetto è chiuso a chiave. Non lo apro da allora.");
          S.flags.sawCorvo = true;
        } else await think("L'ultimo cassetto mi guarda. Io non guardo lui.");
        break;
      case 'radio':
        if (first) {
          S.radio = true; Sound.radioStatic(1.6);
          await wait(700);
          await say('radio', '«...e la pioggia continuerà per tutta la settimana. In cronaca: ancora nessuna notizia del portuale scomparso lunedì notte...»');
          await say('radio', '«...è il terzo in un mese, nella zona del porto. La Questura invita la cittadinanza alla calma.»');
          Sound.radioStatic(0.5);
          S.radio = false;
          await think('La Questura invita sempre alla calma. Soprattutto quando non sa che pesci pigliare.');
          clue('missing', 'Tre persone scomparse al porto in un mese.');
        } else await think('Ormai trasmettono solo musica. Un sassofono che piange per conto terzi.');
        break;
      case 'bottle':
        if (S.flags.drank) { await think('Vuota. Come le mie promesse di smettere.'); break; }
        if (S.flags.skippedDrink) { await think('Due dita di whisky. Resteranno lì. Per ora.'); break; }
        await think("Whisky irlandese. Ne restano due dita. Le tengo per un'occasione speciale. Tipo un martedì.");
        if (await choose([{ text: 'Bevi un sorso', say: false }, { text: 'Lascia stare', say: false }]) === 0) {
          Sound.pour(); await wait(700);
          S.flags.drank = true;
          await think('Brucia. Come sempre. Non risolve niente. Come sempre.');
        } else {
          S.flags.skippedDrink = true;
          await think('Non stanotte. Ho la sensazione che mi servirà la testa lucida.');
        }
        break;
      case 'papers':
        Sound.paper();
        if (first) {
          await think("Bollette. Una lettera dell'avvocato della mia ex moglie. Un sollecito del padrone di casa, con tre punti esclamativi.");
          await think('Il quarto punto esclamativo, di solito, è un uomo grosso con una mazza.');
        } else await think('Le bollette sono ancora qui. Peccato: sarebbe stato il primo mistero risolto del mese.');
        break;
      case 'phone':
        if (first) {
          await think('Il telefono. Muto da tre giorni.');
          await think('Ho controllato due volte che la linea funzionasse. Funziona. È la gente che non chiama.');
        } else await think('Ancora muto.');
        break;
      case 'lamp':
        if (first) {
          await think('La lampada verde. La comprai il primo giorno in questo ufficio.');
          await think("È l'unica cosa qui dentro che non mi ha mai lasciato al buio.");
        } else await think('Ronza piano. Mi fa compagnia meglio di tanti.');
        break;
      case 'board':
        if (first) {
          await think('La mappa della città. Tre spilli rossi, tutti vicino al porto. Tre scomparse in un mese.');
          await think('Nessuno mi paga per guardarla. La guardo lo stesso.');
          clue('missing', 'Tre persone scomparse al porto in un mese.');
        } else await think('Tre spilli. Ho la brutta sensazione che presto ne servirà un quarto.');
        break;
      case 'door':
        if (S.flags.knocked) { S.flags.answer = true; break; }
        if (first) {
          await think('La porta. Sul vetro c\'è scritto «D. MORETTI – INVESTIGAZIONI». Da qui dentro si legge al contrario.');
          await think('Come quasi tutto, a Porto Grigio.');
        } else await think('Il corridoio è buio. Nessuno sale fin quassù, di notte.');
        break;
    }
  }

  async function knock() {
    S.flags.knocked = true;
    lightning(1, 0.4);
    await wait(1500);
    Sound.knock(3, 0.34, 0.8);
    await wait(900);
    dante.back = false;
    await think('Tre colpi alla porta. Leggeri. Esitanti.');
    await think('Nessuno bussa così a mezzanotte, a meno che non abbia paura di chi potrebbe aprire.');
    objective('Apri la porta');
  }

  // ───────────────────────────── Incontro ─────────────────────────────
  async function meet() {
    objective('');
    await dante.walk([[62, 112]], 60);
    dante.back = true;
    Sound.creak(1.3);
    lucia.visible = true; lucia.x = 36; lucia.y = 103; lucia.dir = 'right'; lucia.face = 'sad';
    await Promise.all([G.tween(S, { door: 1 }, 1100), G.cinema(1, 900)]);
    lightning(0.8, 0.9);
    await wait(500);
    dante.back = false; dante.dir = 'left';
    await G.zoom(2, 60, 88, 900);
    await say('lucia', "Il signor Moretti? L'investigatore privato?", 'sad');
    await think('Una ragazza. Diciannove anni, forse venti. Un cappotto rosso, fradicio. E gli occhi di chi non dorme da giorni.');
    const c1 = await choose([
      'Dipende da chi lo chiede.',
      'Sono io. Entra, prima che il corridoio ti mangi viva.',
      "L'ufficio è chiuso, ragazzina. Torna domani.",
    ]);
    if (c1 === 0) await say('lucia', "Qualcuno che non ha nessun altro a cui chiederlo.", 'sad');
    else if (c1 === 1) { trust(1); await say('lucia', 'Grazie. Io... grazie.', 'smile'); }
    else {
      trust(-1);
      await say('lucia', 'La luce era accesa. E domani potrebbe essere tardi. La prego. Cinque minuti.', 'scared');
      await think("C'era qualcosa nella sua voce. Qualcosa che conoscevo bene. La paura, quella vera.");
    }

    // entra, lascia l'ombrello, si siede
    G.hideDialog();
    await Promise.all([G.zoom(1, 160, 90, 1000), dante.walk([[70, 132]], 70)]);
    await lucia.walk([[48, 108]], 40);
    S.umbrella = true;
    await wait(300);
    G.tween(S, { door: 0 }, 600).then(() => Sound.doorShut());
    await Promise.all([
      lucia.walk([[120, 128], [196, 127], [196, 124]], 44),
      dante.walk([[180, 139], [298, 139], [298, 102], [258, 100]], 66),
    ]);
    lucia.sit = true; lucia.dir = 'right'; lucia.face = 'normal';
    dante.back = false; dante.dir = 'left';
    await G.zoom(2, 228, 98, 1300);

    if (S.flags.drank) {
      await say('lucia', '...Qui dentro c\'è odore di whisky.', 'normal');
      await say('dante', 'È il profumo dell\'ufficio. Lo vendono in bottiglia.');
    }
    await say('lucia', "Mi chiamo Lucia. Lucia Sartori. Mio padre è Arturo Sartori, l'orologiaio di via dei Cordai.", 'sad');
    S.flags.luciaNamed = true;
    await say('lucia', 'Tre notti fa è uscito per una consegna. Non è più tornato.', 'sad');
    clue('arturo', 'Arturo Sartori, orologiaio di via dei Cordai, scomparso da tre notti.');

    const c2 = await choose([
      'Sei andata alla polizia?',
      'Gli uomini spariscono. Di solito tornano, con una scusa e il rossetto sul colletto.',
      "Raccontami tutto. Dall'inizio.",
    ]);
    if (c2 === 0) {
      await say('lucia', "Sì. Un commissario mi ha offerto un caffè e mi ha detto che a cinquant'anni certi uomini se ne vanno e basta.", 'normal');
      await say('lucia', "Poi, mentre uscivo, l'ho sentito telefonare. Ha fatto il nome di mio padre. E ha detto: «È venuta la figlia».", 'scared');
      clue('cop', 'Dopo la denuncia, un commissario ha telefonato a qualcuno.');
      await think('Un poliziotto che fa rapporto a qualcuno che non è il suo capo. Conoscevo il tipo.');
    } else if (c2 === 1) {
      trust(-1);
      await say('lucia', 'Mio padre non ha chiuso la bottega un solo giorno in trent\'anni. Nemmeno quando è morta mia madre.', 'normal');
      await say('lucia', 'E non è l\'unico. Al porto sono sparite altre due persone, questo mese.', 'sad');
      clue('missing', 'Tre persone scomparse al porto in un mese.');
      await think('Colpito. La ragazza leggeva i giornali. Più di me.');
    } else {
      trust(1);
      await say('lucia', 'Lunedì sera è entrato in bottega un uomo. Alto, cappotto nero, guanti di pelle. Non se li è mai tolti.', 'normal');
      await say('lucia', 'Ha lasciato un orologio da riparare e ha pagato in anticipo. Il triplo del prezzo.', 'normal');
      await say('lucia', 'Dopo, mio padre era pallido. Ha chiuso presto. E quella notte è uscito... «per una consegna».', 'sad');
      clue('gloves', "Un uomo alto con guanti di pelle ha pagato il triplo per una riparazione.");
    }

    await say('lucia', 'Prima di uscire mi ha dato questo. Ha detto: «Se non torno entro l\'alba, non andare alla polizia. Va\' da Moretti».', 'sad');
    await think('Da Moretti. Io non conoscevo nessun Arturo Sartori. Ma a quanto pare lui conosceva me.');
    await think('Posò sulla scrivania un orologio da taschino. Ottone. Freddo come il fondo del porto.');
  }

  // ───────────────────────────── L'orologio ─────────────────────────────
  async function watchSpot(id, ws) {
    switch (id) {
      case 'face':
        await think('Le lancette sono ferme alle 2:47.');
        await think('Non si è scaricato. Qualcuno ha infilato un ago nel meccanismo per bloccarlo. Di proposito.');
        await think("Un orario. Un appuntamento. O un avvertimento.");
        clue('time', "L'orologio è stato bloccato di proposito alle 2:47.");
        break;
      case 'lid':
        await think("Dentro il coperchio c'è un'incisione. Un corvo, con le ali aperte. Sotto, due iniziali: A.S.");
        Sound.sting();
        G.S.shake = 1.5;
        await wait(600);
        if (S.flags.sawCorvo) await think('Il Corvo. Lo stesso nome scritto sull\'ultimo cassetto del mio schedario.');
        await think('Avevo già visto quel corvo. Cinque anni fa. Inciso su un accendino, sul molo, accanto al corpo di Sandro.');
        clue('raven', 'Il simbolo del Corvo, inciso dentro il coperchio.');
        break;
      case 'crown':
        await think('La corona è allentata. La tiro, la giro fino in fondo e...');
        Sound.tick(); ws.crownOut = true;
        await wait(400);
        Sound.clue(); ws.keyOut = true;
        await think('...clic. Il fondo della cassa si apre. Dentro c\'è una piccola chiave d\'ottone.');
        await think('Sul manico è inciso un numero: 47.');
        clue('key', "Una chiave d'ottone nascosta nell'orologio, con il numero 47.");
        break;
    }
  }

  async function watchScene() {
    await G.fade(1, 600);
    G.setScene('watch');
    objective("Esamina l'orologio");
    await G.fade(0, 600);
    await G.watchMode({ onExamine: watchSpot });
    objective('');
    await wait(400);
    await G.fade(1, 600);
    G.setScene('room');
    await G.fade(0, 600);
  }

  // ───────────────────────────── Dopo l'orologio ─────────────────────────────
  async function afterWatch() {
    await say('lucia', "Lei ha già visto quel corvo. Gliel'ho letto in faccia.", 'normal');
    const c3 = await choose([
      'Non so di cosa parli.',
      "L'ho visto. L'ultima volta è costato la vita al mio partner.",
    ]);
    if (c3 === 0) { trust(-1); await say('lucia', 'Mente male, signor Moretti. Per essere un investigatore, dico.', 'normal'); }
    else { trust(1); await say('lucia', '...Allora sa quanto è pericoloso. Ed è per questo che sono venuta da lei.', 'sad'); }

    await think('Chiavi come quella le fanno per un solo posto, in città: le cassette del deposito bagagli della Stazione Centrale.');
    await say('dante', 'Stazione Centrale. Deposito bagagli, cassetta 47. Tuo padre ha nascosto qualcosa, lì dentro.');
    await say('lucia', 'Allora... mi aiuterà?', 'sad');
    const c4 = await choose([
      'Diecimila lire al giorno, più le spese.',
      'Parleremo di soldi quando tuo padre sarà a casa.',
    ]);
    if (c4 === 0) {
      Sound.paper();
      await say('lucia', 'Ho solo questi. Sono i risparmi della bottega.', 'sad');
      await think('Tremila lire in biglietti stropicciati. Non li contai. Glieli rimisi in mano.');
      await say('dante', 'Tienili. Ti serviranno per il tram.');
    } else {
      trust(1);
      await say('lucia', 'Grazie. Davvero.', 'smile');
    }
    await think('Stavo per dirle di tornare a casa e chiudersi dentro a chiave. Non ne ebbi il tempo.');
  }

  // ───────────────────────────── La telefonata ─────────────────────────────
  async function phoneCall() {
    Sound.music(false);
    S.ringing = true; Sound.ring(true);
    await wait(1800);
    await think('Il telefono. Muto da tre giorni. E suona adesso, a mezzanotte passata.');
    await say('lucia', 'Non... non risponde?', 'scared');
    S.ringing = false; Sound.ring(false); Sound.pickup();
    S.handset = false; dante.phone = true;
    await wait(500);
    await say('dante', 'Moretti.');
    await say('voice', 'Buonasera, commissario. Ah, no, mi perdoni: ex commissario.');
    await say('dante', 'Chi parla?');
    await say('voice', "Un amico di Arturo. Rimandi a casa la ragazza. E lasci l'orologio sul davanzale: qualcuno passerà a prenderlo.");
    await say('dante', 'E se non lo faccio?');
    await say('voice', 'Ha già perso un partner per questa storia, Moretti. Vuole perdere anche lei?');
    Sound.drone(true);
    await say('voice', 'Il Corvo non dimentica.');
    Sound.busy();
    await wait(900);
    dante.phone = false; S.handset = true; Sound.pickup();
    clue('voice', 'Una voce al telefono: «Il Corvo non dimentica». Sa chi sono.');
    await G.zoom(2, 170, 60, 1200);
    S.carLights = true;
    await think('La linea era morta. Giù in strada, sotto la pioggia, la berlina nera accese i fari.');
    await G.zoom(2, 228, 98, 1000);
    await say('lucia', 'Chi era?', 'scared');
    const c5 = await choose([
      'Nessuno. Un numero sbagliato.',
      'Qualcuno che sa che sei qui.',
    ]);
    if (c5 === 0) {
      await say('lucia', S.trust >= 3 ? 'D\'accordo... se lo dice lei.' : 'Continua a mentire male, signor Moretti.', 'sad');
      await think('Non mi credette. Faceva bene.');
    } else {
      trust(1);
      await say('lucia', '...Mi hanno seguita. Me lo sentivo.', 'scared');
    }
  }

  // ───────────────────────────── Buio ─────────────────────────────
  async function blackout() {
    Sound.powerDown();
    S.lamp = false; S.storm = false;
    await wait(1400);
    await think('Poi la luce se ne andò. Tutta insieme, come un respiro trattenuto.');
    await say('lucia', 'Signor Moretti...?', 'scared');
    Sound.stairs(8, 0.62);
    await wait(1200);
    await think('Passi sulle scale. Lenti. Pesanti. Di qualcuno che non ha nessuna fretta.');
    await wait(2600);
    await G.zoom(1.5, 80, 70, 1400);
    S.silhouette = true;
    lightning(1, 0.35);
    G.S.shake = 2;
    await wait(1200);
    G.tween(S, { torch: 1 }, 800);
    await think('Il lampo disegnò un\'ombra sul vetro della porta. Un cappello. Due spalle larghe. Una torcia accesa.');
    Sound.rattle();
    await wait(900);
    await think('Il pomello cominciò a girare. Piano.');
    objective('Scegli. Adesso.');
    const fin = await choose([
      { text: 'Prendere la pistola nel cassetto', say: false },
      { text: 'Nascondere Lucia sotto la scrivania', say: false },
      { text: 'Spalancare la porta per primo', say: false },
    ]);
    objective('');
    G.hideDialog();
    S.flags.finalChoice = fin;
    lightning(1, 0.05);
    G.S.shake = 3;
    await wait(120);
    S.fade = 1;
    Sound.drone(false);
    await wait(2200);
    return fin;
  }

  async function ending(fin) {
    G.setScene('black');
    const choices = [
      'Hai aperto il cassetto della scrivania. La pistola era dove l\'avevi lasciata cinque anni fa.',
      'Hai spinto Lucia sotto la scrivania e hai trattenuto il fiato, al buio.',
      'Hai spalancato la porta prima che potessero farlo loro.',
    ];
    const t = S.trust;
    const trustLabel = t >= 4 ? 'Lucia si fida ciecamente di te.' : t >= 3 ? 'Lucia comincia a fidarsi di te.' : t >= 2 ? 'Lucia non sa ancora se fidarsi di te.' : 'Lucia non si fida di te.';
    Sound.music(true, 0.18);
    G.showEnd({ choice: choices[fin], total: TOTAL_CLUES, trustLabel });
  }

  // ───────────────────────────── Sequenza ─────────────────────────────
  async function exploreOffice() {
    await G.explore({
      onExamine: examine,
      until: () => S.examined.size >= 4 || S.exploreT > 80,
    });
    await knock();
    let nudged = false;
    await G.explore({
      onExamine: examine,
      until: () => S.flags.answer,
      tick: (t) => {
        if (!nudged && t > 22) {
          nudged = true;
          Sound.knock(3, 0.3, 1);
          setTimeout(() => G.toast('Dal corridoio', '«Signor Moretti...? C\'è qualcuno?»'), 900);
        }
      },
    });
  }

  // Posizioni a scena avviata, usate anche per saltare direttamente a un punto (#debug-...).
  function seated() {
    S.flags.luciaNamed = true; S.flags.knocked = true; S.umbrella = true;
    Object.assign(lucia, { visible: true, sit: true, x: 196, y: 124, dir: 'right' });
    Object.assign(dante, { x: 258, y: 100, dir: 'left', back: false });
    Object.assign(G.cam, { z: 2, cx: 228, cy: 98 });
  }

  const STEPS = [
    ['room', exploreOffice],
    ['meet', meet],
    ['watch', watchScene],
    ['after', afterWatch],
    ['phone', phoneCall],
    ['dark', async () => { S.flags.finalChoice = await blackout(); }],
    ['end', () => ending(S.flags.finalChoice || 0)],
  ];

  async function run() {
    const jump = location.hash.replace('#debug-', '');
    let from = STEPS.findIndex(s => s[0] === jump);
    if (from < 0) {
      await G.titleScreen();
      await intro();
      await opening();
      from = 0;
    } else {
      G.hideTitle(); S.fade = 0; S.mode = 'cutscene'; G.setScene('room'); Sound.init();
      if (jump === 'room') await opening();
      if (jump === 'meet') { S.flags.knocked = true; S.flags.drank = true; }
      if (from >= 2) seated();
      if (from >= 5) S.carLights = true;
    }
    for (let i = from; i < STEPS.length; i++) await STEPS[i][1]();
  }

  return { run };
})();

Game.boot(Story.run);
