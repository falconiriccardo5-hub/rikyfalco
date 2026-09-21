# Riky Falco — Sito Personal Trainer

Landing page statica, senza dipendenze esterne.

```
index.html
assets/css/style.css
assets/js/main.js
```

## Sezioni
Header → Hero (3D) → Social proof → Problema → Soluzione → Servizi →
Come funziona → Risultati/Case study → Testimonianze → Chi sono/Team →
Pricing → FAQ → CTA finale → Footer.

## Dove va l'animazione 3D
Nel markup: `<div class="hero__stage" id="hero3d" data-3d-slot>`.
Sostituisci il placeholder con il tuo `<canvas>`, `<iframe>` o `<video>`:
lo stage è già a schermo intero e `sticky`.

Il blocco `.hero` è alto 240vh (200vh su mobile), quindi lo stage resta fisso
mentre si scorre. Durante lo scroll `main.js` espone il progresso 0 → 1:

- CSS: variabile `--hero-progress` su `.hero`
- JS: evento `hero3d:progress` con `event.detail.progress`

```js
document.getElementById('hero3d')
  .addEventListener('hero3d:progress', e => {
    const t = e.detail.progress; // 0 = inizio, 1 = fine hero
    // avanza qui la timeline / la camera della scena 3D
  });
```

Per allungare o accorciare l'animazione basta cambiare `height` di `.hero`.

## Da completare
Testi segnaposto, foto (i riquadri `data-media-slot`), loghi social proof,
prezzi, contatti e invio reale del form nella CTA finale.
