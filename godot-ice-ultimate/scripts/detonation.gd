@tool
extends VfxModule
## Fase 6: detonazione. Flash bianco, onda di gelo blu che si espande a terra,
## distorsione dell'onda d'urto, grandi "loop" luminosi e detriti.

@export_range(0.0, 2.0) var flash := 0.0:
	set(v):
		flash = v
		_apply()
## Espansione dell'onda (0..1)
@export_range(0.0, 1.0) var progress := 0.0:
	set(v):
		progress = v
		_apply()
## Alpha dell'onda di gelo a terra
@export_range(0.0, 1.0) var fade := 1.0:
	set(v):
		fade = v
		_apply()


func _apply() -> void:
	if not is_node_ready():
		return
	set_param(^"Flash", &"intensity", flash * 2.5)
	set_param(^"Glow", &"intensity", flash * 1.0)
	set_param(^"Anamorphic", &"intensity", flash * 2.0)
	set_param(^"FrostWave", &"reveal", progress * 1.05)
	set_param(^"FrostWave", &"fade", fade)
	set_param(^"Shockwave", &"progress", progress)
	var sw := get_node_or_null(^"Shockwave") as Node3D
	if sw:
		sw.visible = progress > 0.001 and progress < 0.999
	var loops := get_node_or_null(^"Loops") as Node3D
	if loops:
		loops.visible = flash > 0.01
		loops.scale = Vector3.ONE * lerpf(0.5, 1.6, progress)
		for c in loops.get_children():
			set_param(NodePath("Loops/" + c.name), &"intensity", flash * 5.0)
