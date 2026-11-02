# Felcio — personaggio 3D cartoon originale

Piccolo geco d'erba in stile chibi (altezza ~0,6 m) con rig e 3 animazioni.

| File | Uso |
|---|---|
| `Felcio.blend` | Progetto Blender (5.x) con mesh, armatura, azioni e texture inclusa |
| `Felcio.glb` | glTF 2.0: Blender, UE5 (plugin glTF Importer), Unity (pacchetto glTFast), web |
| `Felcio.fbx` | FBX con texture incorporata: Unity e UE5 |
| `Felcio_Corpo_Colore.png` | Texture di colore del corpo (2048×2048) |
| `felcio_build.py` | Script che rigenera tutto da zero |
| `anteprime/` | Render di controllo |

**Animazioni:** `Idle` (61 frame, loop), `Walk` (33 frame, loop, sul posto), `Attack` (41 frame). 30 fps.
**Scheletro:** 23 ossa (`root`, `hips`, `spine`, `head`, `sprout`, `tail1-5`, braccia e gambe `.L/.R`), max 4 influenze per vertice.
**Poligoni:** ~27k triangoli.

## Importazione
- **Blender:** apri `Felcio.blend`, oppure File → Import → glTF 2.0 / FBX.
- **Unity:** trascina `Felcio.fbx` in Assets. Nel tab Rig scegli *Generic* (lo scheletro non è umanoide). Le tre clip compaiono nel tab Animation.
- **Unreal Engine 5:** importa `Felcio.fbx` come Skeletal Mesh con *Import Animations* attivo. L'armatura si chiama `Armature`, quindi UE non aggiunge un osso radice in più.

## Rigenerare
```bash
pip install bpy scikit-image
python felcio_build.py <cartella_output> [--render]
```
