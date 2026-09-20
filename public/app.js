// FitManager — interfaccia locale (vanilla JS, nessun bundler).

/* ---------------- utilita' ---------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = (n) => `€ ${Number(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const eur0 = (n) => `€ ${Math.round(Number(n || 0)).toLocaleString('it-IT')}`;
const dataIt = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const oggiIso = () => new Date().toISOString().slice(0, 10);
const iniziali = (n, c) => `${(n || '?')[0]}${(c || '')[0] || ''}`.toUpperCase();
const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const DURATE = { '3m': '3 mesi', '6m': '6 mesi', '12m': '12 mesi' };
const durataLabel = (p) => DURATE[p.tipo] || `${p.durata_giorni} giorni`;

async function api(percorso, opzioni = {}) {
  const res = await fetch(`/api${percorso}`, {
    headers: { 'content-type': 'application/json' },
    ...opzioni,
    body: opzioni.body ? JSON.stringify(opzioni.body) : undefined,
  });
  const dati = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(dati.errore || `Errore ${res.status}`);
  return dati;
}

function toast(messaggio, tipo = '') {
  const el = document.createElement('div');
  el.className = tipo;
  el.textContent = messaggio;
  $('#toast').append(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 3200);
  setTimeout(() => el.remove(), 3600);
}

const ICONE = {
  home: '<path d="M4 11.5 13 4l9 7.5"/><path d="M6.5 10v10h13V10"/>',
  users: '<circle cx="10" cy="9" r="3.4"/><path d="M4 20c0-3.3 2.7-5.2 6-5.2s6 1.9 6 5.2"/><path d="M17 8.2a3 3 0 0 1 0 5.6"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  euro: '<circle cx="12.5" cy="12.5" r="8.5"/><path d="M16 9.2a4.6 4.6 0 0 0-6.6 1.6"/><path d="M16 15.8a4.6 4.6 0 0 1-6.6-1.6"/><path d="M7.6 11.6h5M7.6 14h4.4"/>',
  mail: '<rect x="3.5" y="6" width="18" height="13.5" rx="3"/><path d="m4.5 8.5 8 5.2 8-5.2"/>',
  settings: '<circle cx="12.5" cy="12.5" r="3"/><path d="M12.5 3.5v2.2M12.5 19.3v2.2M4.6 8l1.9 1.1M18.5 15.9l1.9 1.1M4.6 17l1.9-1.1M18.5 9.1l1.9-1.1"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.3l3.4 2"/>',
  download: '<path d="M12 4v11M7.5 10.8 12 15.3l4.5-4.5"/><path d="M5 19.5h14"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
};
const icona = (nome, size = 22) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 25 25" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONE[nome]}</svg>`;

/* ---------------- componenti ---------------- */
const statCard = (etichetta, valore, nota, colore = 'var(--txt)') => `
  <section class="card">
    <div class="etichetta">${esc(etichetta)}</div>
    <div class="num" style="margin-top:12px;color:${colore}">${valore}</div>
    <div class="nota" style="margin-top:6px">${esc(nota)}</div>
  </section>`;

function anello(percentuale, sopra, sotto, size = 160) {
  const deg = Math.max(0, Math.min(100, percentuale)) * 3.6;
  return `<div class="anello" style="width:${size}px;height:${size}px;background:conic-gradient(from 210deg, var(--acc) 0deg, var(--acc2) ${deg}deg, rgba(255,255,255,.07) ${deg}deg 360deg)">
    <div style="width:${size - 26}px;height:${size - 26}px">
      <span class="num" style="font-size:26px">${sopra}</span>
      <span class="nota">${esc(sotto)}</span>
    </div></div>`;
}

function barre(tutti) {
  const valori = suTelefono() ? tutti.slice(-6) : tutti;
  const max = Math.max(1, ...valori.map((v) => v.valore));
  return `<div class="barre">${valori.map((v) => `
    <div class="barra ${v.valore === max && max > 0 ? 'max' : ''}" title="${esc(v.titolo || '')}">
      <div class="stelo"><i style="height:${Math.round((v.valore / max) * 100)}%"></i></div>
      <span>${esc(v.etichetta)}</span>
    </div>`).join('')}</div>`;
}

const statoPill = (p) => {
  if (p.stato === 'concluso') return '<span class="pill neutro">Concluso</span>';
  if (p.stato === 'rinnovato') return '<span class="pill blu">Rinnovato</span>';
  if (p.stato === 'annullato') return '<span class="pill rosso">Annullato</span>';
  const g = p.giorni_rimanenti ?? 999;
  if (g < 0) return '<span class="pill rosso">Scaduto</span>';
  if (g <= 30) return `<span class="pill warm">Scade tra ${g} gg</span>`;
  return '<span class="pill ok">Attivo</span>';
};

function apriModale(html) {
  $('#modale-corpo').innerHTML = html;
  $('#modale').showModal();
}
const chiudiModale = () => $('#modale').close();

/* ---------------- routing ---------------- */
const VOCI = [
  { id: 'dashboard', label: 'Dashboard', breve: 'Home', icona: 'home' },
  { id: 'clienti', label: 'Clienti', breve: 'Clienti', icona: 'users' },
  { id: 'nuovo', label: 'Nuovo percorso', breve: 'Nuovo', icona: 'plus' },
  { id: 'rinnovi', label: 'Rinnovi', breve: 'Rinnovi', icona: 'mail' },
  { id: 'contabilita', label: 'Contabilità', breve: 'Conti', icona: 'euro' },
];

// Su telefono lo schermo è stretto: etichette brevi e grafico sugli ultimi mesi.
const suTelefono = () => window.matchMedia('(max-width: 760px)').matches;

function disegnaSidebar(attiva) {
  $('#sidebar').innerHTML = `
    <div class="logo">RF</div>
    ${VOCI.map((v) => `<button class="nav-btn ${v.id === attiva ? 'attivo' : ''}" data-vai="${v.id}" title="${v.label}" aria-label="${v.label}">${icona(v.icona)}<em>${v.breve}</em></button>`).join('')}
    <div class="spazio"></div>
    <button class="nav-btn ${attiva === 'impostazioni' ? 'attivo' : ''}" data-vai="impostazioni" title="Impostazioni" aria-label="Impostazioni">${icona('settings')}<em>Opzioni</em></button>`;
}

const testata = (titolo, sottotitolo, azioni = '') => `
  <header class="top">
    <div class="titolo"><h1>${esc(titolo)}</h1><p>${sottotitolo}</p></div>
    ${azioni}
  </header>`;

const VISTE = {};

async function naviga() {
  const [nome, ...parametri] = (location.hash.slice(1) || 'dashboard').split('/');
  const vista = VISTE[nome] || VISTE.dashboard;
  disegnaSidebar(nome === 'cliente' ? 'clienti' : nome);
  // Si sostituisce il contenitore per azzerare i listener della vista precedente.
  const fresco = document.createElement('main');
  fresco.id = 'vista';
  fresco.innerHTML = '<div class="vuoto">Caricamento…</div>';
  $('#vista').replaceWith(fresco);
  try {
    await vista(...parametri);
  } catch (err) {
    $('#vista').innerHTML = `${testata('Errore', esc(err.message))}<section class="card"><p class="nota">Controlla che il server sia attivo e riprova.</p></section>`;
  }
}

document.addEventListener('click', (e) => {
  const vai = e.target.closest('[data-vai]');
  if (vai) location.hash = vai.dataset.vai;
});
window.addEventListener('hashchange', naviga);

/* ---------------- dashboard ---------------- */
VISTE.dashboard = async () => {
  const d = await api('/dashboard');
  const delta = d.incassato_mese_scorso
    ? Math.round(((d.incassato_mese - d.incassato_mese_scorso) / d.incassato_mese_scorso) * 100)
    : null;
  const mesi = d.incassi_mensili.map((m, i) => ({ etichetta: MESI[i], valore: m.totale, titolo: eur(m.totale) }));
  const obiettivo = d.obiettivo_annuo ? Math.round((d.incassato_anno / d.obiettivo_annuo) * 100) : 0;

  $('#vista').innerHTML = `
    ${testata('Dashboard', `Panoramica contabile e percorsi attivi · ${dataIt(oggiIso())}`,
      `<button class="btn primario" data-vai="nuovo">${icona('plus', 18)} Nuovo percorso</button>`)}

    <div class="riga-flex">
      <section class="card cresce" style="min-width:320px">
        <p class="nota" style="margin:0">Buongiorno,</p>
        <h2 style="margin:6px 0 0;font-size:34px">${esc(d.pt_nome || 'Riccardo')}</h2>
        <p class="nota" style="margin:12px 0 0;max-width:340px;line-height:1.6">
          Hai <strong style="color:var(--txt)">${d.in_scadenza.length} percorsi</strong> in scadenza e
          <strong style="color:var(--txt)">${d.rate_aperte.length} rate</strong> da incassare.
        </p>
        <div class="scelte" style="margin-top:18px">
          <span class="pill warm">${d.in_scadenza.length} rinnovi da gestire</span>
          ${delta !== null ? `<span class="pill ${delta >= 0 ? 'ok' : 'rosso'}">Mese ${delta >= 0 ? '+' : ''}${delta}%</span>` : ''}
        </div>
      </section>
      <section class="card" style="width:340px">
        <div class="etichetta">Obiettivo annuo</div>
        <div style="margin-top:16px;display:flex;align-items:center;gap:20px">
          ${anello(obiettivo, `${obiettivo}%`, 'raggiunto', 140)}
          <div>
            <div class="num" style="font-size:22px">${eur0(d.incassato_anno)}</div>
            <div class="nota" style="margin-top:4px">su ${eur0(d.obiettivo_annuo)}</div>
          </div>
        </div>
      </section>
    </div>

    <div class="griglia g4">
      ${statCard('Incassato questo mese', eur0(d.incassato_mese), delta !== null ? `${delta >= 0 ? '+' : ''}${delta}% vs mese scorso` : 'primo mese di dati')}
      ${statCard('Clienti attivi', d.clienti_attivi, `su ${d.clienti_totali} totali`)}
      ${statCard('Da incassare', eur0(d.da_incassare), `${d.rate_aperte.length} rate aperte`, 'var(--warm)')}
      ${statCard('In scadenza', d.in_scadenza.length, 'entro la soglia di preavviso', 'var(--acc)')}
    </div>

    <div class="riga-flex">
      <section class="card cresce" style="min-width:380px">
        <div class="etichetta">Incassi ${new Date().getFullYear()}</div>
        <div style="margin-top:18px">${barre(mesi)}</div>
      </section>
      <section class="card" style="width:400px">
        <div class="etichetta">Prossime rate</div>
        ${d.rate_aperte.length ? d.rate_aperte.slice(0, 5).map((r) => `
          <div style="margin-top:14px;display:flex;align-items:center;gap:12px">
            <span style="width:40px;height:40px;border-radius:13px;background:rgba(79,141,255,.14);color:var(--acc);display:grid;place-items:center">${icona('clock', 19)}</span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600">${esc(r.nome)} ${esc(r.cognome)}</div>
              <div class="nota">Rata ${r.numero} · ${dataIt(r.scadenza)}</div>
            </div>
            <strong class="num" style="font-size:16px">${eur0(r.importo)}</strong>
          </div>`).join('') : '<div class="vuoto">Nessuna rata aperta.</div>'}
      </section>
    </div>

    <section class="card">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="etichetta">In scadenza — promemoria email automatico</div>
        <div style="flex:1"></div>
        <button class="btn piccolo" data-vai="rinnovi">Gestisci rinnovi</button>
      </div>
      <div class="tabella-scroll" style="margin-top:10px">
      ${d.in_scadenza.length ? `<table>
        <thead><tr><th>Cliente</th><th>Percorso</th><th>Scade il</th><th>Mancano</th><th>Promemoria</th></tr></thead>
        <tbody>${d.in_scadenza.map((p) => `
          <tr class="cliccabile" data-cliente="${p.cliente_id}">
            <td><div class="con-avatar"><span class="avatar">${esc(iniziali(p.nome, p.cognome))}</span><span>${esc(p.nome)} ${esc(p.cognome)}</span></div></td>
            <td>${esc(durataLabel(p))}</td>
            <td>${dataIt(p.data_fine)}</td>
            <td><span class="pill ${p.giorni_rimanenti <= 15 ? 'rosso' : 'warm'}">${p.giorni_rimanenti} giorni</span></td>
            <td>${p.promemoria_inviato ? '<span class="pill ok">Inviato</span>' : '<span class="pill neutro">In coda</span>'}</td>
          </tr>`).join('')}</tbody></table>` : '<div class="vuoto">Nessun percorso in scadenza. Tutto in ordine.</div>'}
      </div>
    </section>`;

  $('#vista').addEventListener('click', (e) => {
    const r = e.target.closest('[data-cliente]');
    if (r) location.hash = `cliente/${r.dataset.cliente}`;
  });
};

/* ---------------- clienti ---------------- */
VISTE.clienti = async () => {
  const [clienti, rinnovi] = await Promise.all([api('/clienti'), api('/rinnovi')]);
  const scadenzaPerCliente = new Map(rinnovi.percorsi.map((p) => [p.cliente_id, p]));

  $('#vista').innerHTML = `
    ${testata('Clienti', 'Anagrafica, percorsi e stato pagamenti',
      `<button class="btn primario" id="btn-nuovo-cliente">${icona('plus', 18)} Nuovo cliente</button>`)}
    <section class="card">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <input id="cerca" placeholder="Cerca per nome, cognome o email" style="max-width:360px">
        <div style="flex:1"></div>
        <span class="nota">${clienti.length} clienti · ${scadenzaPerCliente.size} in scadenza</span>
      </div>
      <div class="tabella-scroll" style="margin-top:14px">
        <table>
          <thead><tr><th>Cliente</th><th>Contatti</th><th>Percorsi</th><th>Stato</th><th></th></tr></thead>
          <tbody id="righe-clienti"></tbody>
        </table>
      </div>
    </section>`;

  const righe = (filtro = '') => {
    const f = filtro.toLowerCase();
    const lista = clienti.filter((c) => `${c.nome} ${c.cognome} ${c.email}`.toLowerCase().includes(f));
    $('#righe-clienti').innerHTML = lista.length ? lista.map((c) => {
      const sc = scadenzaPerCliente.get(c.id);
      return `<tr class="cliccabile" data-cliente="${c.id}">
        <td><div class="con-avatar"><span class="avatar">${esc(iniziali(c.nome, c.cognome))}</span>
          <div><div style="font-weight:600">${esc(c.nome)} ${esc(c.cognome)}</div>
          <div class="nota">${esc(c.obiettivo || 'Obiettivo non indicato')}</div></div></div></td>
        <td class="nota">${esc(c.email)}<br>${esc(c.telefono || '')}</td>
        <td>${c.percorsi_totali}</td>
        <td>${sc ? `<span class="pill warm">Scade tra ${sc.giorni_rimanenti} gg</span>`
              : c.percorso_attivo_id ? '<span class="pill ok">Attivo</span>' : '<span class="pill neutro">Nessun percorso</span>'}</td>
        <td style="text-align:right"><span class="nota">Apri →</span></td>
      </tr>`;
    }).join('') : '<tr><td colspan="5"><div class="vuoto">Nessun cliente trovato.</div></td></tr>';
  };
  righe();

  $('#cerca').addEventListener('input', (e) => righe(e.target.value));
  $('#vista').addEventListener('click', (e) => {
    const r = e.target.closest('[data-cliente]');
    if (r) location.hash = `cliente/${r.dataset.cliente}`;
  });
  $('#btn-nuovo-cliente').addEventListener('click', () => formCliente());
};

function formCliente(cliente = null) {
  const v = (k) => esc(cliente?.[k] ?? '');
  apriModale(`
    <h2>${cliente ? 'Modifica cliente' : 'Nuovo cliente'}</h2>
    <form id="form-cliente" style="display:grid;gap:16px">
      <div class="griglia g2">
        <label class="campo"><span>Nome *</span><input name="nome" value="${v('nome')}" required></label>
        <label class="campo"><span>Cognome *</span><input name="cognome" value="${v('cognome')}" required></label>
        <label class="campo"><span>Email *</span><input name="email" type="email" value="${v('email')}" required></label>
        <label class="campo"><span>Telefono</span><input name="telefono" value="${v('telefono')}"></label>
        <label class="campo"><span>Codice fiscale</span><input name="codice_fiscale" value="${v('codice_fiscale')}"></label>
        <label class="campo"><span>Data di nascita</span><input name="data_nascita" type="date" value="${v('data_nascita')}"></label>
        <label class="campo"><span>Scadenza certificato medico</span><input name="scadenza_certificato" type="date" value="${v('scadenza_certificato')}"></label>
        <label class="campo"><span>Obiettivo</span><input name="obiettivo" value="${v('obiettivo')}"></label>
      </div>
      <label class="campo"><span>Note</span><textarea name="note" rows="3">${v('note')}</textarea></label>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button type="button" class="btn" id="annulla">Annulla</button>
        <button class="btn primario" type="submit">Salva</button>
      </div>
    </form>`);
  $('#annulla').addEventListener('click', chiudiModale);
  $('#form-cliente').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dati = Object.fromEntries(new FormData(e.target));
    try {
      const salvato = cliente
        ? await api(`/clienti/${cliente.id}`, { method: 'PUT', body: dati })
        : await api('/clienti', { method: 'POST', body: dati });
      chiudiModale();
      toast('Cliente salvato');
      location.hash = `cliente/${salvato.id}`;
      if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

naviga();
    } catch (err) { toast(err.message, 'errore'); }
  });
}

/* ---------------- scheda cliente ---------------- */
VISTE.cliente = async (id) => {
  const c = await api(`/clienti/${id}`);
  const attivo = c.percorsi.find((p) => p.stato === 'attivo') || c.percorsi[0] || null;
  const incassato = (p) => p.rate.filter((r) => r.pagata).reduce((s, r) => s + r.importo, 0);
  const giorniRimanenti = attivo ? Math.round((new Date(attivo.data_fine) - new Date(oggiIso())) / 86400000) : 0;
  const trascorsi = attivo ? attivo.durata_giorni - giorniRimanenti : 0;
  const avanzamento = attivo ? Math.max(0, Math.min(100, Math.round((trascorsi / attivo.durata_giorni) * 100))) : 0;

  const tappe = attivo ? [
    { testo: 'Inizio percorso', data: attivo.data_inizio, fatto: attivo.data_inizio <= oggiIso() },
    ...attivo.rate.map((r) => ({ testo: `Rata ${r.numero} di ${attivo.num_rate} · ${eur(r.importo)}`, data: r.scadenza, fatto: !!r.pagata })),
    { testo: 'Email promemoria rinnovo', data: attivo.promemoria_inviato_il || '—', fatto: !!attivo.promemoria_inviato_il },
    { testo: 'Fine percorso', data: attivo.data_fine, fatto: attivo.data_fine <= oggiIso() },
  ] : [];

  $('#vista').innerHTML = `
    ${testata(`${esc(c.nome)} ${esc(c.cognome)}`, `Cliente dal ${dataIt(c.creato_il?.slice(0, 10))} · ${c.percorsi.length} percorsi`,
      `<button class="btn" data-vai="clienti">${icona('back', 18)} Clienti</button>
       <button class="btn" id="btn-modifica">Modifica dati</button>
       <button class="btn primario" id="btn-percorso">${icona('plus', 18)} Nuovo percorso</button>`)}

    <div class="riga-flex">
      <section class="card cresce" style="min-width:340px">
        <div class="etichetta">Anagrafica</div>
        <div class="griglia g2 compatta" style="margin-top:16px">
          ${[['Email', c.email], ['Telefono', c.telefono], ['Codice fiscale', c.codice_fiscale],
             ['Data di nascita', c.data_nascita ? dataIt(c.data_nascita) : ''],
             ['Certificato medico', c.scadenza_certificato ? dataIt(c.scadenza_certificato) : ''],
             ['Obiettivo', c.obiettivo]]
            .map(([k, v]) => `<div><div class="etichetta">${k}</div><div style="margin-top:5px">${esc(v || '—')}</div></div>`).join('')}
        </div>
        ${c.note ? `<p class="nota" style="margin-top:18px;line-height:1.6">${esc(c.note)}</p>` : ''}
      </section>

      <section class="card" style="width:460px">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="etichetta">Percorso corrente</div><div style="flex:1"></div>
          ${attivo ? statoPill({ ...attivo, giorni_rimanenti: giorniRimanenti }) : ''}
        </div>
        ${attivo ? `
        <div style="margin-top:18px;display:flex;align-items:center;gap:22px;flex-wrap:wrap">
          ${anello(avanzamento, giorniRimanenti >= 0 ? giorniRimanenti : 0, 'giorni alla fine', 140)}
          <div style="flex:1;min-width:180px;display:grid;gap:14px">
            <div class="griglia g2 compatta">
              ${[['Inizio', dataIt(attivo.data_inizio)], ['Fine', dataIt(attivo.data_fine)],
                 ['Durata', durataLabel(attivo)], ['Importo', eur(attivo.importo_totale)]]
                .map(([k, v]) => `<div><div class="etichetta">${k}</div><div style="margin-top:4px;font-weight:600">${v}</div></div>`).join('')}
            </div>
            <div>
              <div class="progresso"><i style="width:${avanzamento}%"></i></div>
              <div class="nota" style="margin-top:8px">${trascorsi} giorni su ${attivo.durata_giorni}</div>
            </div>
          </div>
        </div>` : '<div class="vuoto">Nessun percorso registrato.</div>'}
      </section>
    </div>

    ${attivo ? `
    <div class="riga-flex">
      <section class="card cresce" style="min-width:380px">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="etichetta">Piano pagamenti</div><div style="flex:1"></div>
          <strong class="num" style="font-size:18px">${eur(incassato(attivo))} / ${eur(attivo.importo_totale)}</strong>
        </div>
        <div class="tabella-scroll" style="margin-top:10px"><table>
          <thead><tr><th>Rata</th><th>Scadenza</th><th>Importo</th><th>Metodo</th><th>Stato</th><th></th></tr></thead>
          <tbody>${attivo.rate.map((r) => `<tr>
            <td>${r.numero} di ${attivo.num_rate}</td>
            <td>${dataIt(r.scadenza)}</td>
            <td>${eur(r.importo)}</td>
            <td class="nota">${esc(r.metodo || '—')}</td>
            <td>${r.pagata ? `<span class="pill ok">Saldata ${dataIt(r.data_pagamento)}</span>` : '<span class="pill warm">Aperta</span>'}</td>
            <td style="text-align:right">
              <button class="btn piccolo" data-rata="${r.id}" data-pagata="${r.pagata}">${r.pagata ? 'Annulla' : 'Registra incasso'}</button>
            </td></tr>`).join('')}</tbody>
        </table></div>
        <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
          <button class="btn" id="btn-anteprima">${icona('mail', 17)} Anteprima email rinnovo</button>
          <button class="btn" id="btn-invia">Invia promemoria ora</button>
          <button class="btn primario" id="btn-rinnova">Rinnova percorso</button>
        </div>
      </section>

      <section class="card" style="width:380px">
        <div class="etichetta">Timeline percorso</div>
        <div class="timeline" style="margin-top:16px">
          ${tappe.map((t, i) => `<div class="tappa">
            <div class="colonna">
              <div class="punto ${t.fatto ? 'fatto' : 'atteso'}">${icona(t.fatto ? 'check' : 'clock', 15)}</div>
              ${i < tappe.length - 1 ? '<div class="filo"></div>' : ''}
            </div>
            <div class="testo">
              <div style="font-weight:600;color:${t.fatto ? 'var(--txt)' : 'var(--sub)'}">${esc(t.testo)}</div>
              <div class="nota" style="margin-top:3px">${t.data === '—' ? 'non ancora inviata' : dataIt(t.data)}</div>
            </div></div>`).join('')}
        </div>
      </section>
    </div>` : ''}

    ${c.percorsi.length > 1 ? `<section class="card">
      <div class="etichetta">Storico percorsi</div>
      <div class="tabella-scroll" style="margin-top:10px"><table>
        <thead><tr><th>Periodo</th><th>Durata</th><th>Importo</th><th>Rate</th><th>Incassato</th><th>Stato</th></tr></thead>
        <tbody>${c.percorsi.map((p) => `<tr>
          <td>${dataIt(p.data_inizio)} → ${dataIt(p.data_fine)}</td>
          <td>${esc(durataLabel(p))}</td>
          <td>${eur(p.importo_totale)}</td>
          <td>${p.num_rate}</td>
          <td>${eur(incassato(p))}</td>
          <td>${statoPill(p)}</td></tr>`).join('')}</tbody>
      </table></div>
    </section>` : ''}`;

  $('#btn-modifica').addEventListener('click', () => formCliente(c));
  $('#btn-percorso').addEventListener('click', () => { location.hash = `nuovo/${c.id}`; });

  $('#vista').addEventListener('click', async (e) => {
    const rata = e.target.closest('[data-rata]');
    if (rata) {
      const pagata = rata.dataset.pagata === '1';
      try {
        await api(`/rate/${rata.dataset.rata}`, { method: 'PUT', body: pagata ? { pagata: false } : { pagata: true, data_pagamento: oggiIso(), metodo: attivo.metodo_pagamento } });
        toast(pagata ? 'Incasso annullato' : 'Incasso registrato');
        if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

naviga();
      } catch (err) { toast(err.message, 'errore'); }
    }
  });

  if (!attivo) return;
  $('#btn-anteprima').addEventListener('click', async () => {
    const a = await api(`/percorsi/${attivo.id}/anteprima-email`);
    apriModale(`<h2>Anteprima email di rinnovo</h2>
      <div class="nota">A: ${esc(a.destinatario)}</div>
      <div class="card" style="padding:20px">
        <div class="etichetta">Oggetto</div>
        <div style="margin-top:6px;font-weight:650">${esc(a.oggetto)}</div>
        <hr style="border:none;border-top:1px solid var(--line);margin:16px 0">
        <pre style="margin:0;white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.7;color:var(--sub)">${esc(a.corpo)}</pre>
      </div>
      <div style="display:flex;justify-content:flex-end"><button class="btn" onclick="document.getElementById('modale').close()">Chiudi</button></div>`);
  });
  $('#btn-invia').addEventListener('click', async () => {
    try {
      const r = await api(`/percorsi/${attivo.id}/promemoria`, { method: 'POST', body: { forza: true } });
      toast(r.stato === 'inviata' ? 'Email inviata' : r.stato === 'bozza' ? 'SMTP non configurato: bozza salvata in data/outbox' : `Errore: ${r.dettaglio}`, r.stato === 'errore' ? 'errore' : '');
      if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

naviga();
    } catch (err) { toast(err.message, 'errore'); }
  });
  $('#btn-rinnova').addEventListener('click', () => { location.hash = `nuovo/${c.id}/${attivo.id}`; });
};

/* ---------------- nuovo percorso ---------------- */
VISTE.nuovo = async (clienteId, rinnovoDi) => {
  const clienti = await api('/clienti');
  const stato = {
    cliente_id: clienteId ? Number(clienteId) : (clienti[0]?.id ?? null),
    tipo: '6m',
    durata_giorni: 90,
    data_inizio: oggiIso(),
    importo_totale: 540,
    num_rate: 3,
    metodo_pagamento: 'Bonifico',
    data_pagamento: oggiIso(),
    prima_rata_pagata: true,
    promemoria_attivo: true,
    giorni_preavviso: 30,
    note: '',
  };

  const render = () => {
    $('#vista').innerHTML = `
      ${testata(rinnovoDi ? 'Rinnovo percorso' : 'Nuovo percorso',
        'Cliente, durata, pagamento e promemoria in un unico flusso',
        `<button class="btn" data-vai="${clienteId ? `cliente/${clienteId}` : 'clienti'}">${icona('back', 18)} Indietro</button>`)}
      <div class="riga-flex">
        <div class="cresce" style="min-width:380px;display:grid;gap:18px">
          <section class="card">
            <div class="etichetta">1 · Cliente</div>
            ${clienti.length ? `
            <div style="margin-top:16px;display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
              <label class="campo cresce"><span>Seleziona cliente</span>
                <select id="f-cliente">${clienti.map((c) => `<option value="${c.id}" ${c.id === stato.cliente_id ? 'selected' : ''}>${esc(c.cognome)} ${esc(c.nome)} — ${esc(c.email)}</option>`).join('')}</select>
              </label>
              <button class="btn" id="btn-nuovo-cliente">${icona('plus', 17)} Nuovo</button>
            </div>` : `<div class="vuoto">Nessun cliente in archivio. <button class="btn piccolo" id="btn-nuovo-cliente">Creane uno</button></div>`}
          </section>

          <section class="card">
            <div class="etichetta">2 · Durata percorso</div>
            <div class="scelte" style="margin-top:16px">
              ${[['3m', '3 mesi'], ['6m', '6 mesi'], ['12m', '12 mesi'], ['custom', 'Personalizzato (giorni)']]
                .map(([v, l]) => `<button class="scelta ${stato.tipo === v ? 'attiva' : ''}" data-tipo="${v}">${l}</button>`).join('')}
            </div>
            <div class="griglia g3" style="margin-top:18px">
              <label class="campo"><span>Data inizio</span><input type="date" id="f-inizio" value="${stato.data_inizio}"></label>
              <label class="campo"><span>Giorni</span><input type="number" min="1" id="f-giorni" value="${stato.durata_giorni}" ${stato.tipo === 'custom' ? '' : 'disabled'}></label>
              <div class="campo"><span>Data fine</span>
                <div class="btn" style="cursor:default;justify-content:center" id="f-fine">—</div></div>
            </div>
          </section>

          <section class="card">
            <div class="etichetta">3 · Pagamento</div>
            <div class="griglia g3" style="margin-top:16px">
              <label class="campo"><span>Importo totale (€)</span><input type="number" step="0.01" min="0" id="f-importo" value="${stato.importo_totale}"></label>
              <label class="campo"><span>Data pagamento</span><input type="date" id="f-pagamento" value="${stato.data_pagamento}"></label>
              <label class="campo"><span>Metodo</span>
                <select id="f-metodo">${['Bonifico', 'Contanti', 'Satispay', 'POS', 'Altro'].map((m) => `<option ${m === stato.metodo_pagamento ? 'selected' : ''}>${m}</option>`).join('')}</select>
              </label>
            </div>
            <div class="scelte" style="margin-top:16px">
              ${[1, 2, 3, 6, 12].map((n) => `<button class="scelta ${stato.num_rate === n ? 'attiva' : ''}" data-rate="${n}">${n === 1 ? 'Unica soluzione' : `${n} rate`}</button>`).join('')}
            </div>
            <label class="campo" style="margin-top:16px;flex-direction:row;align-items:center;gap:10px">
              <input type="checkbox" id="f-prima" ${stato.prima_rata_pagata ? 'checked' : ''} style="width:20px;height:20px">
              <span style="letter-spacing:0;text-transform:none;font-size:14px;color:var(--txt)">La prima rata risulta gia' incassata alla data di pagamento</span>
            </label>
            <div class="avviso blu" style="margin-top:18px;display:block">
              <div class="etichetta">Piano rate generato</div>
              <div id="piano" class="griglia g3" style="margin-top:12px"></div>
            </div>
          </section>
        </div>

        <div style="width:420px;display:grid;gap:18px;align-content:start">
          <section class="card">
            <div class="etichetta">4 · Promemoria rinnovo</div>
            <div class="avviso warm" style="margin-top:14px">
              <span style="width:40px;height:40px;border-radius:13px;background:rgba(255,144,82,.18);color:var(--warm);display:grid;place-items:center">${icona('mail', 20)}</span>
              <div style="flex:1">
                <div style="font-weight:600">Email automatica prima della scadenza</div>
                <div class="nota" id="data-promemoria">—</div>
              </div>
              <input type="checkbox" id="f-promemoria" ${stato.promemoria_attivo ? 'checked' : ''} style="width:20px;height:20px">
            </div>
            <label class="campo" style="margin-top:16px"><span>Giorni di preavviso</span>
              <input type="number" min="1" max="180" id="f-preavviso" value="${stato.giorni_preavviso}"></label>
            <label class="campo" style="margin-top:16px"><span>Note percorso</span>
              <textarea id="f-note" rows="3" placeholder="Obiettivi, frequenza sedute, vincoli">${esc(stato.note)}</textarea></label>
          </section>

          <section class="card">
            <div class="etichetta">Riepilogo</div>
            <div id="riepilogo" style="margin-top:14px;display:grid;gap:10px"></div>
            <div style="display:flex;gap:10px;margin-top:20px">
              <button class="btn primario cresce" id="btn-salva" style="justify-content:center">Salva percorso</button>
              <button class="btn" data-vai="clienti">Annulla</button>
            </div>
          </section>
        </div>
      </div>`;

    collega();
    aggiorna();
  };

  let anteprima = null;
  async function aggiorna() {
    try {
      anteprima = await api('/anteprima-percorso', { method: 'POST', body: stato });
    } catch (err) { toast(err.message, 'errore'); return; }
    $('#f-fine').textContent = dataIt(anteprima.data_fine);
    if (stato.tipo !== 'custom') $('#f-giorni').value = anteprima.durata_giorni;
    $('#piano').innerHTML = anteprima.rate.map((r) => `
      <div class="card" style="padding:14px;border-radius:14px;animation:none">
        <div class="nota">Rata ${r.numero} · ${dataIt(r.scadenza)}</div>
        <div class="num" style="font-size:18px;margin-top:4px">${eur(r.importo)}</div>
      </div>`).join('');
    const giorniPreavviso = Number(stato.giorni_preavviso) || 30;
    const dataPromemoria = new Date(new Date(anteprima.data_fine).getTime() - giorniPreavviso * 86400000).toISOString().slice(0, 10);
    $('#data-promemoria').textContent = stato.promemoria_attivo ? `Invio previsto il ${dataIt(dataPromemoria)}` : 'Promemoria disattivato';
    const cliente = clienti.find((c) => c.id === Number(stato.cliente_id));
    $('#riepilogo').innerHTML = [
      ['Cliente', cliente ? `${cliente.nome} ${cliente.cognome}` : '—'],
      ['Periodo', `${dataIt(anteprima.data_inizio)} → ${dataIt(anteprima.data_fine)}`],
      ['Durata', `${anteprima.durata_giorni} giorni`],
      ['Importo', eur(stato.importo_totale)],
      ['Rate', stato.num_rate === 1 ? 'Unica soluzione' : `${stato.num_rate} rate`],
    ].map(([k, v]) => `<div style="display:flex;gap:12px"><span class="nota cresce">${k}</span><strong>${esc(v)}</strong></div>`).join('');
  }

  function collega() {
    const lega = (sel, evento, fn) => $(sel)?.addEventListener(evento, fn);
    lega('#f-cliente', 'change', (e) => { stato.cliente_id = Number(e.target.value); aggiorna(); });
    lega('#f-inizio', 'change', (e) => { stato.data_inizio = e.target.value; aggiorna(); });
    lega('#f-giorni', 'input', (e) => { stato.durata_giorni = Number(e.target.value); aggiorna(); });
    lega('#f-importo', 'input', (e) => { stato.importo_totale = Number(e.target.value); aggiorna(); });
    lega('#f-pagamento', 'change', (e) => { stato.data_pagamento = e.target.value; aggiorna(); });
    lega('#f-metodo', 'change', (e) => { stato.metodo_pagamento = e.target.value; });
    lega('#f-prima', 'change', (e) => { stato.prima_rata_pagata = e.target.checked; });
    lega('#f-promemoria', 'change', (e) => { stato.promemoria_attivo = e.target.checked; aggiorna(); });
    lega('#f-preavviso', 'input', (e) => { stato.giorni_preavviso = Number(e.target.value); aggiorna(); });
    lega('#f-note', 'input', (e) => { stato.note = e.target.value; });
    lega('#btn-nuovo-cliente', 'click', () => formCliente());

    $('#vista').addEventListener('click', (e) => {
      const tipo = e.target.closest('[data-tipo]');
      if (tipo) { stato.tipo = tipo.dataset.tipo; render(); }
      const rate = e.target.closest('[data-rate]');
      if (rate) { stato.num_rate = Number(rate.dataset.rate); render(); }
    });

    lega('#btn-salva', 'click', async () => {
      if (!stato.cliente_id) return toast('Seleziona o crea un cliente', 'errore');
      try {
        const corpo = { ...stato, rinnovo_di: rinnovoDi ? Number(rinnovoDi) : null };
        const nuovo = rinnovoDi
          ? await api(`/percorsi/${rinnovoDi}/rinnova`, { method: 'POST', body: corpo })
          : await api('/percorsi', { method: 'POST', body: corpo });
        toast('Percorso salvato');
        location.hash = `cliente/${nuovo.cliente_id}`;
      } catch (err) { toast(err.message, 'errore'); }
    });
  }

  render();
};

/* ---------------- rinnovi ---------------- */
VISTE.rinnovi = async () => {
  const d = await api('/rinnovi');
  const inviati = d.percorsi.filter((p) => p.promemoria_inviato).length;

  $('#vista').innerHTML = `
    ${testata('Rinnovi', `Promemoria automatico a ${d.giorni} giorni dalla fine percorso`,
      `<button class="btn primario" id="btn-job">Esegui controllo ora</button>`)}
    <div class="griglia g4">
      ${statCard('In scadenza', d.percorsi.length, `entro ${d.giorni} giorni`, 'var(--warm)')}
      ${statCard('Promemoria inviati', inviati, 'su questi percorsi')}
      ${statCard('Email totali', d.log.length, 'registrate nel log')}
      ${statCard('Da contattare', d.percorsi.length - inviati, 'nessuna email inviata', 'var(--acc)')}
    </div>
    <div class="riga-flex">
      <div class="cresce" style="min-width:380px;display:grid;gap:16px">
        ${d.percorsi.length ? d.percorsi.map((p) => `
          <section class="card">
            <div style="display:flex;align-items:center;gap:12px">
              <span class="avatar">${esc(iniziali(p.nome, p.cognome))}</span>
              <div style="flex:1">
                <div style="font-weight:650">${esc(p.nome)} ${esc(p.cognome)}</div>
                <div class="nota">${esc(p.email)}</div>
              </div>
              ${p.promemoria_inviato ? `<span class="pill ok">Email inviata ${dataIt(p.promemoria_inviato_il)}</span>` : '<span class="pill warm">Da inviare</span>'}
            </div>
            <div style="margin-top:16px;display:flex;gap:26px;flex-wrap:wrap">
              ${[['Percorso', durataLabel(p)], ['Scade il', dataIt(p.data_fine)], ['Mancano', `${p.giorni_rimanenti} giorni`], ['Importo', eur(p.importo_totale)]]
                .map(([k, v]) => `<div><div class="etichetta">${k}</div><div style="margin-top:4px;font-weight:600">${esc(v)}</div></div>`).join('')}
            </div>
            <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
              <button class="btn piccolo" data-invia="${p.id}">${icona('mail', 16)} Invia email rinnovo</button>
              <button class="btn piccolo" data-anteprima="${p.id}">Anteprima</button>
              <button class="btn piccolo" data-vai="cliente/${p.cliente_id}">Scheda cliente</button>
            </div>
          </section>`).join('') : '<section class="card"><div class="vuoto">Nessun percorso in scadenza nella finestra di preavviso.</div></section>'}
      </div>
      <section class="card" style="width:440px;align-self:start">
        <div class="etichetta">Storico invii</div>
        <div class="tabella-scroll" style="margin-top:10px"><table>
          <thead><tr><th>Data</th><th>Destinatario</th><th>Esito</th></tr></thead>
          <tbody>${d.log.length ? d.log.map((l) => `<tr>
            <td class="nota">${esc(l.creato_il.slice(0, 10).split('-').reverse().join('/'))}</td>
            <td>${esc(l.destinatario)}</td>
            <td>${l.stato === 'inviata' ? '<span class="pill ok">Inviata</span>' : l.stato === 'bozza' ? '<span class="pill blu">Bozza</span>' : '<span class="pill rosso">Errore</span>'}</td>
          </tr>`).join('') : '<tr><td colspan="3"><div class="vuoto">Nessuna email registrata.</div></td></tr>'}</tbody>
        </table></div>
      </section>
    </div>`;

  $('#btn-job').addEventListener('click', async () => {
    try {
      const r = await api('/job/promemoria', { method: 'POST' });
      toast(r.inviati ? `${r.inviati} promemoria elaborati` : 'Nessun promemoria da inviare');
      if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

naviga();
    } catch (err) { toast(err.message, 'errore'); }
  });

  $('#vista').addEventListener('click', async (e) => {
    const invia = e.target.closest('[data-invia]');
    if (invia) {
      try {
        const r = await api(`/percorsi/${invia.dataset.invia}/promemoria`, { method: 'POST', body: { forza: true } });
        toast(r.stato === 'inviata' ? 'Email inviata' : r.stato === 'bozza' ? 'Bozza salvata in data/outbox' : r.dettaglio, r.stato === 'errore' ? 'errore' : '');
        if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

naviga();
      } catch (err) { toast(err.message, 'errore'); }
    }
    const ant = e.target.closest('[data-anteprima]');
    if (ant) {
      const a = await api(`/percorsi/${ant.dataset.anteprima}/anteprima-email`);
      apriModale(`<h2>Anteprima email</h2><div class="nota">A: ${esc(a.destinatario)}</div>
        <div class="card" style="padding:20px"><div class="etichetta">Oggetto</div>
        <div style="margin-top:6px;font-weight:650">${esc(a.oggetto)}</div>
        <hr style="border:none;border-top:1px solid var(--line);margin:16px 0">
        <pre style="margin:0;white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.7;color:var(--sub)">${esc(a.corpo)}</pre></div>
        <div style="display:flex;justify-content:flex-end"><button class="btn" onclick="document.getElementById('modale').close()">Chiudi</button></div>`);
    }
  });
};

/* ---------------- contabilita ---------------- */
VISTE.contabilita = async () => {
  const anno = new Date().getFullYear();
  const d = await api(`/contabilita?anno=${anno}`);
  const mesi = d.incassi_mensili.map((m, i) => ({ etichetta: MESI[i], valore: m.totale, titolo: eur(m.totale) }));
  const totMix = d.mix.reduce((s, m) => s + m.n, 0) || 1;
  const obiettivo = d.obiettivo_annuo ? Math.round((d.totale_incassato / d.obiettivo_annuo) * 100) : 0;

  $('#vista').innerHTML = `
    ${testata('Contabilità', `Incassi, rate e riepilogo fiscale · ${anno}`,
      `<a class="btn" href="/api/contabilita?anno=${anno}&formato=csv">${icona('download', 18)} Esporta CSV</a>`)}
    <div class="griglia g4">
      ${statCard(`Incassato ${anno}`, eur0(d.totale_incassato), `obiettivo ${eur0(d.obiettivo_annuo)}`)}
      ${statCard('Imponibile stimato', eur0(d.imponibile), `${esc(d.regime)} · coeff. ${d.coefficiente}%`)}
      ${statCard('Da incassare', eur0(d.da_incassare), `${d.rate_aperte.length} rate aperte`, 'var(--warm)')}
      ${statCard('Valore medio percorso', eur0(d.valore_medio_percorso), 'su tutti i percorsi')}
    </div>
    <div class="riga-flex">
      <section class="card cresce" style="min-width:380px">
        <div class="etichetta">Incassi per mese</div>
        <div style="margin-top:18px">${barre(mesi)}</div>
      </section>
      <section class="card" style="width:380px">
        <div class="etichetta">Obiettivo annuo</div>
        <div style="margin-top:16px;display:flex;align-items:center;gap:20px;flex-wrap:wrap">
          ${anello(obiettivo, `${obiettivo}%`, 'raggiunto', 140)}
          <div style="flex:1;min-width:140px;display:grid;gap:10px">
            ${d.mix.map((m) => `<div style="display:flex;align-items:center;gap:10px">
              <span class="nota cresce">${esc(DURATE[m.tipo] || 'Personalizzato')}</span>
              <strong>${Math.round((m.n / totMix) * 100)}%</strong></div>`).join('')}
          </div>
        </div>
      </section>
    </div>
    <div class="riga-flex">
      <section class="card cresce" style="min-width:380px">
        <div class="etichetta">Movimenti ${anno}</div>
        <div class="tabella-scroll" style="margin-top:10px"><table>
          <thead><tr><th>Data</th><th>Cliente</th><th>Causale</th><th>Metodo</th><th style="text-align:right">Importo</th></tr></thead>
          <tbody>${d.movimenti.length ? d.movimenti.map((m) => `<tr class="cliccabile" data-vai="cliente/${m.cliente_id}">
            <td class="nota">${dataIt(m.data_pagamento)}</td>
            <td>${esc(m.nome)} ${esc(m.cognome)}</td>
            <td class="nota">${m.num_rate > 1 ? `Rata ${m.numero} di ${m.num_rate}` : 'Saldo unico'} · ${esc(DURATE[m.tipo] || 'personalizzato')}</td>
            <td class="nota">${esc(m.metodo || '—')}</td>
            <td style="text-align:right"><strong style="color:var(--ok)">${eur(m.importo)}</strong></td>
          </tr>`).join('') : '<tr><td colspan="5"><div class="vuoto">Nessun incasso registrato quest\'anno.</div></td></tr>'}</tbody>
        </table></div>
      </section>
      <section class="card" style="width:380px;align-self:start">
        <div class="etichetta">Da incassare</div>
        ${d.rate_aperte.length ? d.rate_aperte.slice(0, 6).map((r) => `
          <div class="avviso warm" style="margin-top:12px">
            <div style="flex:1">
              <div style="font-weight:600">${esc(r.nome)} ${esc(r.cognome)}</div>
              <div class="nota">Rata ${r.numero} di ${r.num_rate} · scade ${dataIt(r.scadenza)}</div>
            </div>
            <strong class="num" style="font-size:16px;color:var(--warm)">${eur0(r.importo)}</strong>
          </div>`).join('') : '<div class="vuoto">Nessuna rata aperta.</div>'}
        <div style="margin-top:18px">
          <div class="etichetta">Riepilogo fiscale</div>
          <p class="nota" style="margin-top:8px;line-height:1.6">
            Incassato ${anno}: <strong style="color:var(--txt)">${eur(d.totale_incassato)}</strong>.
            Regime ${esc(d.regime)}, coefficiente ${d.coefficiente}% → imponibile stimato
            <strong style="color:var(--txt)">${eur(d.imponibile)}</strong>.
            Valore indicativo, non sostituisce il calcolo del commercialista.
          </p>
        </div>
      </section>
    </div>`;
};

/* ---------------- impostazioni ---------------- */
VISTE.impostazioni = async () => {
  const imp = await api('/impostazioni');
  $('#vista').innerHTML = `
    ${testata('Impostazioni', 'Dati del mittente, promemoria e parametri fiscali')}
    <form id="form-imp" class="riga-flex" style="align-items:flex-start">
      <section class="card cresce" style="min-width:360px">
        <div class="etichetta">Email di rinnovo</div>
        <div class="griglia g2" style="margin-top:16px">
          <label class="campo"><span>Nome mittente</span><input name="pt_nome" value="${esc(imp.pt_nome)}"></label>
          <label class="campo"><span>Email mittente</span><input name="pt_email" value="${esc(imp.pt_email)}"></label>
        </div>
        <label class="campo" style="margin-top:16px"><span>Oggetto</span><input name="email_oggetto" value="${esc(imp.email_oggetto)}"></label>
        <label class="campo" style="margin-top:16px"><span>Testo (segnaposto: {{nome}}, {{durata}}, {{data_fine}}, {{giorni_rimanenti}}, {{pt_nome}})</span>
          <textarea name="email_template" rows="10">${esc(imp.email_template)}</textarea></label>
      </section>
      <section class="card" style="width:400px">
        <div class="etichetta">Parametri</div>
        <label class="campo" style="margin-top:16px"><span>Giorni di preavviso rinnovo</span><input type="number" name="giorni_preavviso" value="${esc(imp.giorni_preavviso)}"></label>
        <label class="campo" style="margin-top:16px"><span>Regime fiscale</span><input name="regime_fiscale" value="${esc(imp.regime_fiscale)}"></label>
        <label class="campo" style="margin-top:16px"><span>Coefficiente redditività (%)</span><input type="number" name="coefficiente_redditivita" value="${esc(imp.coefficiente_redditivita)}"></label>
        <label class="campo" style="margin-top:16px"><span>Obiettivo annuo (€)</span><input type="number" name="obiettivo_annuo" value="${esc(imp.obiettivo_annuo)}"></label>
        <button class="btn primario" style="margin-top:20px;width:100%;justify-content:center" type="submit">Salva impostazioni</button>
        <p class="nota" style="margin-top:16px;line-height:1.6">
          L'invio SMTP si configura nel file <code>.env</code>. Senza SMTP le email vengono salvate
          come bozze <code>.eml</code> in <code>data/outbox/</code>.
        </p>
      </section>
    </form>`;

  $('#form-imp').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/impostazioni', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) });
      toast('Impostazioni salvate');
    } catch (err) { toast(err.message, 'errore'); }
  });
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

naviga();
