# Bastone di ghiaccio – VFX colpo principale (Godot 4.3+)

Stile "realistico": cristallo sfaccettato con rifrazione dello sfondo, luce
fredda dinamica (PointLight2D), vapore gelido, polvere di diamante, onda
d'urto che distorce lo schermo, schegge fisiche che rimbalzano, brina a terra
e un congelamento con crosta di ghiaccio che si propaga sul nemico.
Tutto è procedurale (shader + codice): nessuna texture da importare.
Funziona col renderer Compatibility (anche export web), Mobile e Forward+.

| File | Cosa fa |
|---|---|
| `ice_staff.gd` (`IceStaff`) | Mira al mouse, spara col **tasto sinistro** (azione `attack_primary`, creata da sola se manca), rinculo, gemma di cristallo che si illumina |
| `ice_projectile.gd` (`IceProjectile`) | Cristallo rifrangente + luce + scia di vapore + scintille; all'impatto danneggia e congela |
| `ice_freeze.gd` (`IceFreeze`) | Blocca il nemico per `freeze_duration` (0,5 s): crosta che si propaga dal punto colpito, cristalli che spuntano, vapore, crepe e frantumazione |
| `ice_impact.gd` (`IceImpact`) | Lampo di luce, onda d'urto (distorsione), schegge, vapore, brina sul terreno |
| `ice_fragment.gd` (`IceFragment`) | Scheggia fisica con altezza simulata, rimbalzo e ombra |
| `ice_muzzle_flash.gd` (`IceMuzzleFlash`) | Lampo e condensa sulla punta del bastone |
| `ice_fx.gd` (`IceFX`) | Palette, texture generate, materiali e particelle |
| `shaders/` | `ice_crystal`, `frost_crust`, `frost_decal`, `ice_shockwave`, `ice_vapor`, `ice_sparkle` |

## Integrazione nel tuo gioco

1. Copia la cartella `ice_staff/` nel tuo progetto.
2. Aggiungi un nodo `IceStaff` come figlio del mago (opzionale: un `Marker2D` figlio chiamato `Tip` sulla punta).
   Se usi il tuo sprite del bastone, disattiva `draw_placeholder`.
3. Metti i nemici nel gruppo `enemies` (oppure le loro hurtbox `Area2D` nel gruppo `hurtbox`).
4. Opzionale sul nemico:
   - `func set_frozen(frozen: bool)` per decidere tu cosa fermare (altrimenti il nodo viene messo in `PROCESS_MODE_DISABLED`);
   - `func take_damage(amount: float)`;
   - metadati `freeze_size` / `freeze_offset` (Vector2) per adattare la crosta di ghiaccio alla sagoma.
5. La brina a terra usa `z_index = -1` (relativo): se il tuo terreno è sopra, abbassa lo `z_index` del terreno o cambia `decal_z_index`.
6. Le luci 2D illuminano tutto ciò che non è `unshaded`: su una scena scura (o con `CanvasModulate`) l'effetto è molto più forte.

## Demo e render

- Apri la cartella `godot/` con Godot 4.3+ e premi F5: click sinistro per sparare, WASD per muoversi.
- Render video della sequenza dimostrativa:
  `godot --path godot --write-movie out/frame.png --fixed-fps 60 res://ice_staff/demo/showcase.tscn`
