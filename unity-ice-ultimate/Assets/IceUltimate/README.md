# Ice Ultimate VFX per Unity

Versione Unity dell'abilità "ultimate" di ghiaccio ricostruita dal video di riferimento.
Usa gli stessi asset della versione Godot (`../godot-ice-ultimate`): texture, flipbook
volumetrici Cycles e mesh/personaggio modellati in Blender (esportati in FBX).

- **Unity**: 2021.3 LTS, 2022.3 LTS o Unity 6.
- **Render pipeline**: URP (consigliata, con bloom e post-process configurati in automatico)
  oppure Built-in.
- **Dipendenze**: nessuna. Gli shader sono unlit HLSL compatibili con entrambe le pipeline;
  il supporto URP si attiva da solo se il pacchetto è installato.

## Installazione (2 minuti)

1. In Unity: **Assets → Import Package → Custom Package…** e scegli `IceUltimate.unitypackage`.
   In alternativa copia la cartella `Assets/IceUltimate` nel tuo progetto.
2. Aspetta la fine dell'import, poi apri il menu **Tools → Ice Ultimate → Build Prefab + Demo Scene**.
3. Apri la scena generata `Assets/IceUltimate/Generated/Scenes/IceUltimate_Demo.unity` e premi **Play**.
   L'effetto parte in loop; il pulsante a schermo (o Spazio) lo rilancia.

Il builder crea in `Assets/IceUltimate/Generated/`:

| Cartella | Contenuto |
|---|---|
| `Prefabs/IceUltimate.prefab` | **L'abilità completa**: istanziala sul bersaglio |
| `Prefabs/Modules/*.prefab` | Un prefab per fase (sigillo, sfera, detonazione, cristalli…) |
| `Materials/*.mat` | Un materiale per elemento, modificabile dall'Inspector |
| `Animation/IceUltimate_Cast.anim` | La coreografia (10 s): curve + Animation Event |
| `Animation/IceUltimate.controller` | Animator con stati `Idle` e `Cast` |
| `Animation/Caster.controller` | Animator del personaggio (`Idle` in loop, `Cast` sincronizzato) |
| `Scenes/` | Scena demo e profili Volume URP (base + impatto) |

## Uso nel tuo gioco

```csharp
using IceUltimate;

var ult = Instantiate(iceUltimatePrefab, target.position, Quaternion.identity);
var ctrl = ult.GetComponent<IceUltimateController>();
ctrl.casterOffset = ult.transform.InverseTransformPoint(caster.position);
ctrl.casterAnimator = casterAnimator;          // opzionale: riceve lo stato "Cast"
ctrl.onDetonated.AddListener(ApplyDamage);     // anche onImpact, onFinished
// con playOnEnable = true (default) parte da solo; altrimenti ctrl.Play();
```

La camera che deve tremare/zoomare va marcata con il componente **CameraShake**; il flash e
l'aberrazione d'impatto con **IcePostFX** (vedi la camera della scena demo).

## Come è fatto

| Tempo | Fase | Modulo |
|---|---|---|
| 0.0–0.5 s | Lampi rossi di lock-on sui nemici | `TargetFlares` |
| 0.0–1.6 s | Esplosione di gelo sul caster (fiocco, brina, vortici a spirale) | `CastFrost` |
| 0.35–2.5 s | Sfera di ghiaccio con archi e nastri orbitanti | `IceOrb` |
| 2.52 s | Impatto: flash, esplosione volumetrica, anelli, shake, zoom | `ImpactBurst` |
| 2.6–3.95 s | Due satelliti a bolla che si aprono e rientrano | `RingOrbA/B` |
| 2.8–7.0 s | Sigillo zodiacale + taiji, nebbia, scie a ventaglio | `MagicCircle` |
| 3.6–6.9 s | Bolla di carica con mezzelune; il caster alza le braccia | `ChargeCore` |
| 6.87 s | Detonazione: flash, onda di gelo, cupola d'urto, detriti, zoom forte | `Detonation` |
| 6.9–9.5 s | Cristalli con overshoot, spada che cala, crepe, dissoluzione | `CrystalEruption` |

Ogni modulo ha pochi parametri "macro" (es. `MagicCircle.reveal`, `CrystalEruption.grow`):
la clip li anima e lo script li traduce negli shader con `MaterialPropertyBlock`.
Gli script sono `[ExecuteAlways]`, quindi **trascinando la testina nella finestra Animation**
(seleziona il prefab `IceUltimate` in scena) vedi l'anteprima in editor. Le particelle
one-shot, lo shake, lo zoom e il post-process sono Animation Event sul nodo radice:
`EvtBurst("Modulo")`, `EvtShake("forza,durata")`, `EvtPunch("gradi,durata")`,
`EvtPost("chroma,blur,flash,durata")`, `EvtSignal("impact|detonated|finished")`.

### Shader (`Assets/IceUltimate/Shaders`)

| Shader | Uso |
|---|---|
| `IceUltimate/Additive` | Particelle e sprite: flipbook con fusione tra frame (custom vertex stream), billboard, soft particles |
| `IceUltimate/ArcRing` | Archi luminosi procedurali in coordinate polari |
| `IceUltimate/GroundLayer` | Sigillo, brina, crepe: reveal radiale con bordo luminoso, rotazione, pulsazione |
| `IceUltimate/FresnelOrb` | Bolle e cupola d'urto con fresnel e iridescenza |
| `IceUltimate/Trail` | Scie che scorrono sulle mesh Blender (nastri a spirale, mezzelune) |
| `IceUltimate/Crystal` | Ghiaccio trasparente con fresnel, facce sfaccettate, dissolve e flash |

### Modificare

- **Timing**: apri `IceUltimate_Cast.anim` nella finestra Animation.
- **Look**: seleziona un materiale in `Generated/Materials` o un Particle System nel prefab del modulo.
- **Colori**: le texture sono in scala di grigi, quindi cambiando `Color`/`Tint` dei materiali
  ottieni varianti (fuoco, veleno…).
- **Cristalli**: componente `CrystalCluster` (seed, numero, lunghezze, inclinazione), poi
  tasto destro sul componente → **Rebuild**.
- **Asset Blender**: gli script sono in `../godot-ice-ultimate/blender/`.
  `python blender/meshes.py -- --fbx <cartella>` riesporta le mesh in FBX per Unity.

> Rilanciare **Build Prefab + Demo Scene** rigenera prefab, clip e scena (i materiali vengono
> aggiornati, non ricreati). Se hai personalizzato i file generati, duplicali prima.

## Note

- **URP**: abilita il post-process sulla camera (il builder lo fa nella demo). Per le soft
  particles serve la Depth Texture: `IceUltimateController` la richiede alla Main Camera.
- **Built-in**: per il bagliore del video aggiungi un Bloom (es. Post Processing Stack v2).
  Senza bloom l'effetto funziona ma è più "piatto".
- **Input System nuovo**: il tasto Spazio funziona solo con il vecchio Input Manager attivo;
  il pulsante a schermo funziona sempre.
- Il pacchetto si rigenera con `python3 tools_make_unitypackage.py`.
