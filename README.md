# Riky Falco — Sito Personal Trainer

Landing page statica. Nessun framework, nessun build step: apri `index.html`.
Unica risorsa esterna: Google Fonts (Manrope + Inter).

```
index.html            markup + sprite SVG delle icone
assets/css/style.css  design system e layout
assets/js/main.js     header, menu, toggle prezzi, form, scroll hero
```

## Design system
Fonte: skill `ui-ux-pro-max` (`--design-system`) + reference visiva fornita.

| | |
|---|---|
| Pattern | `hero-centric` — CTA unica ripetuta in hero e chiusura |
| Stile | `high-contrast-dark` + `bold-primary` |
| Fondo | `#0a0a0c` / superfici `#121214` `#171719` `#1d1d21` |
| Accento | `#ff5c2b` (singolo, saturo) |
| Testo | `#f5f5f6` (18.5:1) · muted `#a6a6ae` (7.1:1) |
| Tipografia | Manrope 600/700/800 (titoli) · Inter 400/500/600 (testo) |

## Sezioni (22)
Header · Hero 3D · Social proof · Problema · Soluzione · Servizi (bento) ·
Programmi · Come funziona · Risultati/Case study · Trasformazioni ·
Testimonianze · Chi sono/Team · Certificazioni · Dove alleno/Orari ·
App area riservata · Pricing · Lead magnet · Blog · FAQ · CTA finale ·
Newsletter · Footer.

## Dove va l'animazione 3D

Nel markup: `<div class="hero__stage" id="hero3d" data-3d-slot>`.
Sostituisci il placeholder con il tuo `<canvas>`, `<iframe>` o `<video>`:
lo stage e' gia' a schermo intero e `sticky`.

`.hero` e' alto 260vh (220vh sotto i 480px), quindi lo stage resta fisso
mentre si scorre. Durante lo scroll `main.js` espone il progresso 0 → 1:

- CSS: variabile `--hero-progress` su `.hero`
- JS: evento `hero3d:progress`, `event.detail.progress`

```js
document.getElementById('hero3d')
  .addEventListener('hero3d:progress', e => {
    const t = e.detail.progress; // 0 = inizio hero, 1 = fine hero
    // avanza qui la timeline / la camera della scena
  });
```

Per allungare o accorciare l'animazione cambia `height` di `.hero`.
Con `prefers-reduced-motion: reduce` l'hero diventa statico: se la tua
scena 3D e' pesante, disattivala nello stesso caso.

## Accessibilita'
Focus ring visibile, target touch >= 44px, contrasto AA/AAA, label su ogni
campo, `aria-label` sui bottoni icona, `aria-live` sugli esiti dei form,
sprite SVG al posto delle emoji, `prefers-reduced-motion` rispettato.

## Da completare
- Testi, prezzi, orari e contatti sono segnaposto plausibili: vanno sostituiti.
- I riquadri `data-media-slot` attendono foto reali (case study, trasformazioni,
  ritratto, team, mappa, mockup app, copertine blog) e i loghi della social proof.
- I tre form (contatti, guida, newsletter) validano ma non inviano nulla:
  collega il tuo endpoint in `assets/js/main.js`.
- Le trasformazioni prima/dopo richiedono consenso scritto delle persone ritratte.
