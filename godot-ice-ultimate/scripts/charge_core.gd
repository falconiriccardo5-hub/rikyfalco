@tool
extends VfxModule
## Fase 5: nucleo di carica sopra il sigillo. Bolla che cresce,
## sfera scura al centro e mezzelune luminose che ruotano attorno.

@export_range(0.0, 1.0) var charge := 0.0:
	set(v):
		charge = v
		_apply()
@export_range(0.0, 3.0) var intensity := 0.0:
	set(v):
		intensity = v
		_apply()
@export var crescent_speed := 1.4


func _apply() -> void:
	if not is_node_ready():
		return
	visible = intensity > 0.001
	var b := get_node_or_null(^"Bubble") as Node3D
	if b:
		b.scale = Vector3.ONE * lerpf(0.25, 1.0, charge)
	var d := get_node_or_null(^"Dark") as Node3D
	if d:
		d.scale = Vector3.ONE * lerpf(0.2, 1.0, charge)
	var c := get_node_or_null(^"Crescents") as Node3D
	if c:
		c.scale = Vector3.ONE * lerpf(0.5, 1.0, charge)
		for child in c.get_children():
			set_param(NodePath("Crescents/" + child.name), &"intensity", intensity * 4.0)
	set_param(^"Bubble", &"intensity", intensity * (0.4 + charge * 0.6))
	set_param(^"Glow", &"intensity", intensity * charge * 0.5)


func _process(delta: float) -> void:
	if Engine.is_editor_hint() or not visible:
		return
	var c := get_node_or_null(^"Crescents") as Node3D
	if c:
		c.rotate_y(delta * crescent_speed)
