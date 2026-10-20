# Wet Courtyard – ambientazione 3D dark fantasy (Godot 4.3+, Forward+)

Cortile di notte con pavimento di ciottoli bagnato, torce, pioggia, nebbia
volumetrica e due effetti ad area ispirati al video "Godot VFX": una pozza
d'acqua magica e un cerchio di rune infuocato, con cambio di colore.

Tutto è procedurale (shader e codice): nessuna texture, nessun modello esterno.
Il personaggio al centro è un segnaposto fatto di primitive.

## Come aprirlo

1. Apri Godot 4.3 o più recente (testato con 4.3; funziona anche con 4.4–4.6).
2. *Import* → seleziona `wet_courtyard/project.godot`.
3. Se Godot propone di convertire il progetto, accetta.
4. Controlla in alto a destra che il renderer sia **Forward+** (serve Vulkan: la tua RX 5600 XT va benissimo).
5. Premi **F5**.

Alla prima apertura Godot importa gli shader: ci mette qualche secondo.

## Controlli (servono per imparare: accendi/spegni un effetto alla volta)

| Tasto | Cosa fa |
|---|---|
| Mouse (trascina) / rotellina | Ruota e zoom della camera |
| **1** | Glow (bloom attorno alle cose luminose) |
| **2** | SSAO (ombre di contatto tra le pietre) |
| **3** | SSR (riflessi sul pavimento bagnato) |
| **4** | Nebbia volumetrica |
| **5** | Pioggia e anelli nelle pozzanghere |
| **6** | SDFGI (luce indiretta, pesante: spenta di default) |
| **7** | Nebbia semplice a distanza |
| **E** | Cambia effetto: pozza d'acqua ↔ cerchio infuocato |
| **Spazio** | Ripete la comparsa dell'effetto |
| **H** | Nasconde il testo |

## Cosa c'è dentro e dove guardare

```
main.tscn                    scena principale (albero dei nodi da esplorare)
effects/water_circle.tscn    pozza d'acqua magica
effects/rune_circle.tscn     cerchio di rune infuocato
shaders/
  common.gdshaderinc         hash, noise, fbm, voronoi (usate da tutti)
  wet_stone.gdshader         ciottoli + pozzanghere + anelli di pioggia
  magic_water.gdshader       superficie: caustiche, onde, anelli luminosi
  magic_rim.gdshader         corona di schiuma/fiamma sul bordo (acqua e fuoco)
  rune_circle.gdshader       anelli, stelle, glifi e fumo del cerchio magico
  soft_particle.gdshader     particelle additive (fiamme, scintille, pioggia)
scripts/
  magic_circle.gd            comparsa, cambio colore, sfere che orbitano
  scene_controls.gd          tasti 1-7, E, spazio
  orbit_camera.gd            camera orbitale
  torch_flicker.gd           tremolio delle luci delle torce
tools/build_scenes.gd        ricostruisce i .tscn da zero (riferimento)
```

### Come è costruito l'effetto d'acqua (livelli, dal basso)

1. **Surface** – un `PlaneMesh` con `magic_water`: blu profondo + linee bianche di caustica (bordi di celle Voronoi che si muovono) + onde concentriche + due anelli molto luminosi sul bordo.
2. **Rim** – un cilindro *aperto* che avvolge il bordo, con `magic_rim`: rumore che scorre in coordinate polari e viene tagliato in altezza, così sembra una fiamma di schiuma.
3. **Sparks** – `GPUParticles3D` con emissione ad anello: bolle che salgono lente.
4. **Orbs** – tre sfere emissive, ognuna con la sua `OmniLight3D`: le luci che girano illuminano il pavimento bagnato e danno il realismo.
5. **Light** – una `OmniLight3D` al centro che tinge tutta l'area.
6. **magic_circle.gd** – anima il raggio (comparsa con rimbalzo) e interpola i colori (blu → verde acqua).

Il cerchio infuocato usa gli stessi nodi con `rune_circle` come superficie, scintille allungate e una palette arancione → rosa → viola.

### Perché il pavimento sembra bagnato

In `wet_stone.gdshader` la **roughness** scende a ~0.03 dove l'acqua si raccoglie (pozzanghere e solchi tra le pietre). Una superficie così liscia riflette tutto: con **SSR** (tasto 3) specchia luci e fiamme, e con il **glow** (tasto 1) ogni luce colorata diventa più bella. Prova a spegnere SSR e a vedere cosa perde la scena.

## Esercizi consigliati

1. Spegni un effetto alla volta (1–7) e descrivi cosa cambia.
2. In `wet_stone.gdshader` cambia `wetness` e `puddle_scale`.
3. In `magic_rim.gdshader` prova `flow_speed`, `turbulence` e le soglie di `smoothstep`.
4. In `rune_circle.gdshader` cambia il numero di punte della stella (`7`, `(i + 3) % 7`).
5. Aggiungi un terzo colore alla palette in `magic_circle.gd`.
6. Sostituisci il segnaposto `Hero` con un modello vero (Mixamo, Quaternius).

## Note

- Renderer: **Forward+** o Mobile con Vulkan. Il renderer Compatibility non supporta SSR, nebbia volumetrica, SDFGI né le luci a tutto schermo usate qui.
- Se vai a scatti: disattiva SDFGI (6) e nebbia volumetrica (4), o abbassa la risoluzione.
- Rigenerare le scene: `godot --headless --path . -s res://tools/build_scenes.gd`.
