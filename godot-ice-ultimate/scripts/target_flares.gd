@tool
extends VfxModule
## Lampi rossi anamorfici sui bersagli all'inizio del cast (lock-on).

@export_range(0.0, 2.0) var flash := 0.0:
	set(v):
		flash = v
		_apply()


func _apply() -> void:
	if not is_node_ready():
		return
	visible = flash > 0.001
	for c in get_children():
		for g in c.get_children():
			set_param(NodePath(String(c.name) + "/" + String(g.name)), &"intensity", flash * 3.0)
