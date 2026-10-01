# Stato del lavoro

> Questo file riguarda la **vecchia app per Vercel** (`rf-coaching/`). L'app attuale è quella su
> Cloudflare nella cartella principale: vedi `README.md` e `docs/RECUPERO.md`.

Aggiornato il 01/10/2026.

## Dove siamo

Il ramo `claude/eloquent-bell-37d1x4` (PR #4) contiene:

- l'app ricostruita dall'export Drive del **24/09**;
- il modulo **Visita** nuovo (modello, portale cliente, schede, migrazioni);
- la ricostruzione dagli screenshot della versione del **26/09**.

La build passa e il controllo dei tipi è pulito. **Niente di tutto questo è
ancora pubblicato**: l'app sul telefono è il deployment del 26/09.

## Ricostruito dagli screenshot

- Dashboard: hero con saluto, data, chip, mago e pianeta viola
- Tessere cliente con avanzamento del mese, ultima e prossima lezione, pagamento
- Sezione "Da gestire"
- Ricerca nell'intestazione, anche con ⌘K / Ctrl+K
- Barra inferiore con Calendario al quarto posto
- Pagina "Altro" con l'ordine giusto delle voci
- "Messaggi da inviare" con bozze WhatsApp pronte
- "Report mensile" con incassi, lezioni, nuovi clienti e metodi di pagamento
- WhatsApp nella scheda cliente

## Non identico all'originale

- **Mago**: l'originale era uno sprite PNG a 12 fotogrammi, non più
  recuperabile. Ora è pixel-art vettoriale ridisegnata.
- **Pianeta**: l'originale usava i contorni reali dei continenti da un dataset
  geografico. Ora i continenti sono approssimati con ellissi.

Se salta fuori il PNG originale (`public/assets/riccardo-mage-sheet.png`),
rimetterlo al suo posto è questione di minuti.

## Assistente, scelta fatta

Il pulsante con le scintille c'è e funziona, ma **senza modello linguistico**.
`src/server/assistant.ts` riconosce l'intento della domanda e compone la
risposta leggendo il database: rate scoperte, incassi del mese, appuntamenti,
percorsi in scadenza, scheda di un cliente per nome.

Motivo della scelta: nessuna chiave API da gestire né costi, e su soldi e
scadenze una risposta esatta vale più di una discorsiva.

Per passare a un modello vero in futuro basta riscrivere `ask()` mantenendo la
firma: l'interfaccia (`src/components/assistant.tsx`) e la rotta
(`/api/assistant`) restano com'è.

## Area cliente

`/c/[token]` riusa il `portal_token` già presente sui clienti, lo stesso del
portale visite. I dati escono dalla funzione SQL `client_area` (migrazione
`20261001070000_client_area.sql`), security definer e con un insieme di campi
volutamente ristretto: niente note interne, niente dati di altri clienti.

Mostra prossimo allenamento, giorni rimanenti e lezioni, prossime date,
pagamenti e l'eventuale modulo visita da compilare. Il link si copia dalla
scheda cliente, pulsante **Area cliente**.

Non essendoci screenshot dell'originale, questa pagina è progettata da zero.

## Calendario

Due viste, scelte dall'indirizzo così la pagina resta tutta sul server:
`/calendar` mostra la settimana, `/calendar?v=agenda` l'elenco dei 30 giorni,
`/calendar?w=-1` la settimana precedente.

La griglia (`src/components/week-grid.tsx`) ha sette colonne, una riga per ora
dalle 7 alle 22, gli eventi senza orario in una fascia in alto, e scorre in
orizzontale sul telefono. Colori: viola appuntamento, arancio rata, giallo fine
percorso, azzurro Google Calendar.

La migrazione è stata applicata al database il 01/10/2026 e verificata su un
cliente vero in una transazione annullata: la funzione risponde con i dati
giusti e respinge i token inventati. Nessun cliente ha ancora un
`portal_token`: viene creato al primo uso del pulsante "Area cliente".

L'avviso del linter Supabase su `client_area` (funzione security definer
chiamabile da `anon`) è voluto e identico a quello già presente su
`client_visit`, `client_portal` e `calendar_feed`: in queste pagine la
credenziale è il token nell'indirizzo, non la sessione.

## Differenza nota rispetto all'app viva

Nella dashboard del 26/09 la tessera di Giorgia mostrava "Prossima ven 2 ott
ore 20:00", ma nella tabella `appointments` non esistono appuntamenti futuri:
l'ultimo è del 25/09. Quella data arrivava quindi da Google Calendar o dagli
appuntamenti ricorrenti, non dalla tabella. Le tessere ricostruite leggono solo
`appointments`, perciò lì mostrano "—". Da decidere se portare anche gli eventi
di Google dentro le tessere.

## Backup su Google Drive

Il collegamento a Drive e il backup esistevano già: mancava il formato CSV.

Ogni backup — quello manuale dal pulsante **Salva su Google Drive** e quello
automatico delle 6 del mattino — scrive dentro la cartella Drive
`Riccardo Falconi Coaching`:

- `CSV/<data>/` → un file per tabella (clienti, percorsi, pagamenti,
  appuntamenti, visite) più un `LEGGIMI.txt` che spiega cosa c'è dentro;
- `Backups/backup-<data>.json` → il file che serve per ripristinare dentro
  l'app (Altro → Backup → Ripristina);
- `Exports/` → i due file Excel di clienti e pagamenti, come prima.

I CSV usano il punto e virgola e UTF-8 con BOM, così Excel in italiano li apre
senza rimescolare le colonne. La frequenza dell'automatico si cambia nelle
impostazioni (`backup_frequency`: daily, weekly, off).

## Da fare

1. **Collegare Vercel a GitHub** prima di pubblicare (vedi RECUPERO.md).
2. **Confronto con l'app viva** prima di sostituirla: aprire la ricostruzione in
   anteprima e verificarla pagina per pagina contro quella in uso.
3. Decidere sulla differenza nota qui sopra.

## Prima di pubblicare

L'app viva è oggi l'unica copia completa del 26/09. Pubblicare la ricostruzione
la sostituirebbe con una versione che ha meno cose. Si pubblica solo quando i
punti 1, 2 e 3 sono chiusi.
