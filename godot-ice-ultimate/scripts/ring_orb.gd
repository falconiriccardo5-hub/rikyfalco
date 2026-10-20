@tool
extends VfxModule
## Satellite: bolla con arco luminoso che le gira attorno (fase 4).

@export_range(0.0, 3.0) var intensity := 0.0:
	set(v):
		intensity = v
		_apply()


func _apply() -> void:
	if not is_node_ready():
		return
	visible = intensity > 0.001
	set_param(^"Bubble", &"intensity", intensity * 1.2)
	set_param(^"ArcA", &"intensity", intensity * 5.0)
	set_param(^"ArcB", &"intensity", intensity * 3.0)
	set_param(^"Glow", &"intensity", intensity * 0.8)
