# Pioggia Nera

Un piccolo gioco investigativo in pixel art 2D, ambientato a Porto Grigio nel 1953.
Questo è il **Capitolo I — La figlia dell'orologiaio**: circa cinque minuti di gioco.

Piove da sei giorni. L'ex commissario Dante Moretti è solo nel suo ufficio, a mezzanotte,
quando una ragazza con un cappotto rosso bussa alla porta. Suo padre, un orologiaio,
è sparito da tre notti e le ha lasciato soltanto un orologio da taschino.

## Come si gioca

Apri `index.html` in un browser moderno (basta un doppio clic, non serve un server).

| Azione | Tastiera | Mouse / touch |
| --- | --- | --- |
| Muoversi | Frecce o WASD | Clic/tocco sul pavimento |
| Esaminare, avanzare nei dialoghi | E, Invio o Spazio | Clic/tocco sull'oggetto o sul testo |
| Scegliere una risposta | Frecce + E, oppure 1-2-3 | Clic/tocco sulla risposta |
| Taccuino degli indizi | N | Pulsante «Taccuino» |
| Audio sì/no | M | Pulsante «Audio» |

Le scelte nei dialoghi cambiano la fiducia di Lucia e gli indizi che raccogli;
il riepilogo compare alla fine del capitolo.

## Struttura

- `index.html` — pagina, interfaccia (dialoghi, taccuino, titolo, finale) e stili.
- `src/art.js` — tutta la grafica: sprite dei personaggi come righe di caratteri, stanza,
  città sotto la pioggia, orologio in primo piano, luci della lampada e della finestra.
- `src/audio.js` — pioggia, tuoni, effetti e musica noir sintetizzati con Web Audio.
- `src/engine.js` — ciclo di gioco, input, attori, camera, luci e API dei dialoghi.
- `src/story.js` — la sceneggiatura del capitolo, scritta come sequenza di funzioni `async`.

Non ci sono asset esterni a parte i font Pixelify Sans e Silkscreen da Google Fonts.

Per lo sviluppo si può saltare a una scena aggiungendo all'indirizzo
`#debug-room`, `#debug-meet`, `#debug-watch`, `#debug-after`, `#debug-phone`, `#debug-dark` o `#debug-end`.
