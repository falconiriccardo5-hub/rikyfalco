@tool
extends VfxModule
## Fase 2: sfera di ghiaccio che parte dal caster e vola sul bersaglio
## lungo una curva di Bezier, con archi luminosi orbitanti e scia di neve.

@export var start_point := Vector3(3.0, 1.4, 5.0):
	set(v):
		start_point = v
		_apply()
@export var end_point := Vector3(0.0, 1.6, 0.0):
	set(v):
		end_point = v
		_apply()
## Altezza del punto di controllo della curva (quanto "sale" il proiettile).
@export var arc_height := 1.6:
	set(v):
		arc_height = v
		_apply()
## 0 = sul caster, 1 = sul bersaglio.
@export_range(0.0, 1.0) var progress := 0.0:
	set(v):
		progress = v
		_apply()
@export_range(0.0, 3.0) var intensity := 0.0:
	set(v):
		intensity = v
		_apply()
## Velocita' di rotazione 3D del gruppo di archi.
@export var tumble_speed := 4.0


func _apply() -> void:
	if not is_node_ready():
		return
	var mid := (start_point + end_point) * 0.5 + Vector3.UP * arc_height
	var t := progress
	position = start_point.lerp(mid, t).lerp(mid.lerp(end_point, t), t)
	visible = intensity > 0.001
	set_param(^"Core", &"intensity", intensity * 0.6)
	set_param(^"Glow", &"intensity", intensity * 0.25)
	set_param(^"Snowflake", &"intensity", intensity * 1.4)
	for arc in [^"Arcs/ArcA", ^"Arcs/ArcB", ^"Arcs/ArcC"]:
		set_param(arc, &"intensity", intensity * 3.0)
	set_emitting(^"Trail", intensity > 0.2)
	set_emitting(^"MistTrail", intensity > 0.2)


func _process(delta: float) -> void:
	if Engine.is_editor_hint() or not visible:
		return
	var arcs := get_node_or_null(^"Arcs") as Node3D
	if arcs:
		arcs.rotate_object_local(Vector3(0.4, 1.0, 0.2).normalized(), delta * tumble_speed)
