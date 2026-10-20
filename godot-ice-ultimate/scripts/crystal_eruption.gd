@tool
extends VfxModule
## Fase 7-8: esplosione di cristalli di ghiaccio, spada di ghiaccio che cala
## dall'alto, crepe a terra, luccichii e dissoluzione finale in polvere.

@export_range(0.0, 1.5) var grow := 0.0:
	set(v):
		grow = v
		_apply()
## 0 = spada in alto (invisibile), 1 = conficcata a terra
@export_range(0.0, 1.0) var sword := 0.0:
	set(v):
		sword = v
		_apply()
@export_range(0.0, 1.2) var cracks := 0.0:
	set(v):
		cracks = v
		_apply()
@export_range(0.0, 1.0) var dissolve := 0.0:
	set(v):
		dissolve = v
		_apply()
## Flash emissivo dei cristalli all'apparizione
@export_range(0.0, 10.0) var glow := 0.0:
	set(v):
		glow = v
		_apply()
@export var sword_drop_height := 9.0


func _apply() -> void:
	if not is_node_ready():
		return
	var any := grow > 0.001 or sword > 0.001 or cracks > 0.001
	visible = any and dissolve < 0.999
	set_param(^"Crystals", &"grow", grow)
	set_param(^"Crystals", &"dissolve", dissolve)
	set_param(^"Crystals", &"flash", glow)
	set_param(^"Sword/Blade", &"dissolve", dissolve)
	set_param(^"Sword/Blade", &"flash", glow * 0.5)
	var s := get_node_or_null(^"Sword") as Node3D
	if s:
		s.visible = sword > 0.001
		s.position.y = lerpf(sword_drop_height, 0.0, sword)
	for c in [^"Sword/CrescentA", ^"Sword/CrescentB", ^"Sword/CrescentC"]:
		set_param(c, &"intensity", 3.0 * sword * (1.0 - dissolve))
	set_param(^"Cracks", &"reveal", cracks)
	set_param(^"Cracks", &"fade", 1.0 - dissolve)
	set_param(^"Frost", &"reveal", cracks * 0.9)
	set_param(^"Frost", &"fade", 0.35 * (1.0 - dissolve))
	set_emitting(^"Glints", grow > 0.5 and dissolve < 0.2)
	set_emitting(^"DissolveDust", dissolve > 0.02 and dissolve < 0.9)
	var light := get_node_or_null(^"Light") as OmniLight3D
	if light:
		light.light_energy = (0.5 + glow * 0.8) * minf(grow, 1.0) * (1.0 - dissolve)
