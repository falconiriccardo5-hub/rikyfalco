@tool
extends VfxModule
## Fase 3: impatto della sfera. Flash, anelli che si espandono, fumo e scintille.

@export_range(0.0, 2.0) var flash := 0.0:
	set(v):
		flash = v
		_apply()
## Espansione degli anelli 0..1
@export_range(0.0, 1.0) var rings := 0.0:
	set(v):
		rings = v
		_apply()


func _apply() -> void:
	if not is_node_ready():
		return
	set_param(^"Flash", &"intensity", flash * 2.0)
	set_param(^"Glow", &"intensity", flash * 0.7)
	var r := get_node_or_null(^"Rings") as Node3D
	if r:
		r.visible = rings > 0.001 and rings < 0.999
		r.scale = Vector3.ONE * lerpf(0.4, 3.2, rings)
		for c in r.get_children():
			set_param(NodePath("Rings/" + c.name), &"intensity", (1.0 - rings) * 6.0)
