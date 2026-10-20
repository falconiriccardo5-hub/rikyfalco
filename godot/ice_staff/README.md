# Bastone di ghiaccio – VFX colpo principale (Godot 4.3+)

Tutto è disegnato via codice (nessuna texture richiesta) e usa `CPUParticles2D`,
quindi funziona anche col renderer Compatibility e nell'export web.

| File | Cosa fa |
|---|---|
| `ice_staff.gd` (`IceStaff`) | Mira al mouse, spara col **tasto sinistro** (azione `attack_primary`, creata da sola se manca), rinculo + flash della gemma |
| `ice_projectile.gd` (`IceProjectile`) | Scheggia di ghiaccio con alone, scia `Line2D` e brillantini; all'impatto danneggia e congela |
| `ice_freeze.gd` (`IceFreeze`) | Blocca il nemico per `freeze_duration` (0,5 s), blocco di ghiaccio che cresce, trema e si frantuma |
| `ice_impact.gd` (`IceImpact`) | Flash, onda d'urto, spuntoni e schegge con gravità |
| `ice_muzzle_flash.gd` (`IceMuzzleFlash`) | Stella di lancio sulla punta del bastone |
| `ice_fx.gd` (`IceFX`) | Palette e helper per le particelle |

## Integrazione nel tuo gioco

1. Copia la cartella `ice_staff/` nel tuo progetto.
2. Aggiungi un nodo `IceStaff` come figlio del mago (opzionale: un `Marker2D` figlio chiamato `Tip` sulla punta).
   Se usi il tuo sprite del bastone, disattiva `draw_placeholder`.
3. Metti i nemici nel gruppo `enemies` (oppure le loro hurtbox `Area2D` nel gruppo `hurtbox`).
4. Opzionale sul nemico:
   - `func set_frozen(frozen: bool)` per decidere tu cosa fermare (altrimenti il nodo viene messo in `PROCESS_MODE_DISABLED`);
   - `func take_damage(amount: float)`;
   - metadati `freeze_size` / `freeze_offset` (Vector2) per adattare il blocco di ghiaccio.

## Demo

Apri la cartella `godot/` con Godot 4.3+ e premi F5: click sinistro per sparare, WASD per muoversi.
