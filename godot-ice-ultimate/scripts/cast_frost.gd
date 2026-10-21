@tool
extends VfxModule
## Fase 1 (caster): esplosione di gelo ai piedi del personaggio.
## Fiocco di neve luminoso, decal di brina con crepe, vortici d'aria e scintille.

@export_range(0.0, 1.2) var frost := 0.0:
	set(v):
		frost = v
		_apply()
@export_range(0.0, 1.0) var fade := 1.0:
	set(v):
		fade = v
		_apply()
@export_range(0.0, 2.0) var flash := 0.0:
	set(v):
		flash = v
		_apply()
@export var mist_emitting := false:
	set(v):
		mist_emitting = v
		_apply()


func _apply() -> void:
	if not is_node_ready():
		return
	set_param(^"FrostDecal", &"reveal", frost)
	set_param(^"FrostDecal", &"fade", fade)
	set_param(^"Cracks", &"reveal", frost * 0.95)
	set_param(^"Cracks", &"fade", fade)
	set_param(^"Snowflake", &"intensity", flash * 2.0)
	set_param(^"Glow", &"intensity", flash * 0.7)
	var sw := get_node_or_null(^"Swirl")
	if sw:
		for c in sw.get_children():
			set_param(NodePath("Swirl/" + c.name), &"intensity", flash * 4.5)
	var s := get_node_or_null(^"Snowflake") as Node3D
	if s:
		s.visible = flash > 0.01
		s.scale = Vector3.ONE * (0.5 + flash * 0.6)
	set_emitting(^"Mist", mist_emitting)
	set_emitting(^"Dust", mist_emitting)
