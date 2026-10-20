@tool
extends VfxModule
## Fase 4-5: sigillo magico a terra (zodiaco + taiji) con nebbia,
## scie che salgono a ventaglio e scintille sul bordo.

@export_range(0.0, 1.2) var reveal := 0.0:
	set(v):
		reveal = v
		_apply()
@export_range(0.0, 3.0) var intensity := 1.0:
	set(v):
		intensity = v
		_apply()
## Rotazione dell'anello esterno (rad/s). Il taiji gira in senso opposto.
@export var spin_speed := 0.35:
	set(v):
		spin_speed = v
		_apply()
@export var mist_emitting := false:
	set(v):
		mist_emitting = v
		_apply()
@export var streaks_emitting := false:
	set(v):
		streaks_emitting = v
		_apply()


func _apply() -> void:
	if not is_node_ready():
		return
	visible = intensity > 0.001
	set_param(^"Outer", &"reveal", reveal)
	set_param(^"Outer", &"intensity", intensity * 2.2)
	set_param(^"Outer", &"spin_speed", spin_speed)
	set_param(^"Taiji", &"reveal", clampf(reveal * 1.4 - 0.2, 0.0, 1.2))
	set_param(^"Taiji", &"intensity", intensity * 1.3)
	set_param(^"Taiji", &"spin_speed", -spin_speed * 1.6)
	set_param(^"Glow", &"intensity", intensity * 0.35 * minf(reveal, 1.0))
	set_emitting(^"Mist", mist_emitting)
	set_emitting(^"Streaks", streaks_emitting)
	set_emitting(^"EdgeSparks", streaks_emitting)
