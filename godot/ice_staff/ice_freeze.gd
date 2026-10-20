class_name IceFreeze
extends Node2D
## Congelamento del nemico (default 0,5 s). Dal punto d'impatto una crosta di
## ghiaccio si propaga sul nemico con un fronte di brina luminoso; il nemico
## si vede sotto il ghiaccio, rifratto e desaturato. Dal punto colpito
## spuntano cristalli, il ghiaccio "fuma" di vapore freddo, poco prima della
## fine si crepa e trema, poi esplode in schegge fisiche.
##
## Come viene bloccato il nemico:
## - se ha un metodo `set_frozen(frozen: bool)` viene chiamato quello
##   (consigliato: così decidi tu cosa fermare: IA, movimento, animazioni);
## - altrimenti il nodo viene messo in PROCESS_MODE_DISABLED.
##
## Dimensione della crosta: metadato "freeze_size" (Vector2) sul nemico,
## altrimenti 44x56. Offset del centro: metadato "freeze_offset" (Vector2).
##
## Il nodo viene aggiunto come fratello del nemico (non figlio) così la tinta
## fredda del nemico non colora anche il ghiaccio.

var duration := 0.5
var hit_position := Vector2.INF

var _t := 0.0
var _target: Node2D
var _size := Vector2(44, 56)
var _offset := Vector2.ZERO
var _prev_mode := Node.PROCESS_MODE_INHERIT
var _prev_modulate := Color.WHITE
var _released := false
var _crust: Sprite2D
var _crust_mat: ShaderMaterial
var _vapor: CPUParticles2D
var _light: PointLight2D
var _grow_time := 0.14
var _crack_time := 0.14


## Congela `target`. Se è già congelato rinnova il timer.
static func apply_to(target: Node, freeze_time: float, hit_pos := Vector2.INF) -> IceFreeze:
	if not target is Node2D or target.get_parent() == null:
		return null
	var existing = target.get_meta("_ice_freeze") if target.has_meta("_ice_freeze") else null
	if is_instance_valid(existing) and existing is IceFreeze:
		existing.refresh(freeze_time)
		return existing
	var f := IceFreeze.new()
	f.duration = freeze_time
	f.hit_position = hit_pos
	f._target = target
	target.set_meta("_ice_freeze", f)
	target.add_sibling(f)
	return f


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_size = _target.get_meta("freeze_size", _size)
	_offset = _target.get_meta("freeze_offset", Vector2.ZERO)
	global_position = _target.global_position + _offset
	_grow_time = minf(0.14, duration * 0.3)
	_crack_time = minf(0.14, duration * 0.3)

	if _target.has_method("set_frozen"):
		_target.set_frozen(true)
	else:
		_prev_mode = _target.process_mode
		_target.process_mode = Node.PROCESS_MODE_DISABLED
	_prev_modulate = _target.modulate
	_target.modulate = _prev_modulate * IceFX.FROZEN_TINT

	var crust_size := _size * 1.3
	var local_hit := Vector2(0, _size.y * 0.35)
	if hit_position != Vector2.INF:
		local_hit = hit_position - global_position
	var origin := (local_hit / crust_size + Vector2(0.5, 0.5)).clamp(Vector2(0.1, 0.1), Vector2(0.9, 0.9))

	_crust_mat = IceFX.shader_material(IceFX.FROST_CRUST_SHADER)
	_crust_mat.set_shader_parameter("origin", origin)
	_crust_mat.set_shader_parameter("spread", 0.0)
	_crust = IceFX.quad(_crust_mat, crust_size)
	add_child(_crust)

	_spawn_spikes(local_hit.limit_length(minf(_size.x, _size.y) * 0.45))

	_vapor = IceFX.vapor_emitter(10, 0.9, 14.0, 28.0, 4.0, 14.0, 0.3)
	_vapor.direction = Vector2.DOWN  # l'aria fredda scende
	_vapor.gravity = Vector2(0, 18)
	_vapor.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	_vapor.emission_rect_extents = _size * 0.45
	add_child(_vapor)

	_light = IceFX.light(0.55, 0.9 * maxf(_size.x, _size.y) / 50.0)
	add_child(_light)

	var world := get_parent()
	var at := global_position + local_hit
	IceFX.sparkle_burst(world, at, 14, 40.0, 140.0, 0.45, 0.0, Vector2.UP, 180.0, 5.0, 10.0)
	IceFX.vapor_burst(world, at, 5, 10.0, 40.0, 0.6, 12.0, 26.0, Vector2.UP, 180.0, 0.4)


## Cristalli che spuntano dal punto d'impatto, verso l'esterno.
func _spawn_spikes(local_hit: Vector2) -> void:
	var out := local_hit.normalized() if local_hit.length() > 1.0 else Vector2.UP
	for i in 4:
		var length := randf_range(14.0, 24.0)
		var mat := IceFX.crystal_material(false)
		var spike := IceFX.quad(mat, Vector2(length, length * 0.42))
		var ang := out.angle() + randf_range(-0.9, 0.9)
		spike.rotation = ang
		mat.set_shader_parameter("node_rotation", ang)
		spike.position = local_hit + Vector2.from_angle(ang) * length * 0.3
		add_child(spike)
		var full := spike.scale
		spike.scale = Vector2.ZERO
		spike.create_tween().tween_property(spike, "scale", full, _grow_time * (0.8 + 0.4 * randf())) \
			.set_delay(_grow_time * 0.3).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


func refresh(freeze_time: float) -> void:
	duration = freeze_time
	_t = minf(_t, _grow_time)


func _process(delta: float) -> void:
	if not is_instance_valid(_target):
		queue_free()
		return
	global_position = _target.global_position + _offset
	_t += delta
	var g := clampf(_t / _grow_time, 0.0, 1.0)
	_crust_mat.set_shader_parameter("spread", (1.0 - pow(1.0 - g, 3.0)) * 1.6)
	var crack := clampf((_t - (duration - _crack_time)) / _crack_time, 0.0, 1.0)
	_crust_mat.set_shader_parameter("crack", crack)
	_crust.position = Vector2(randf_range(-1.5, 1.5), randf_range(-1.0, 1.0)) * crack
	if _t >= duration:
		_release()


func _release() -> void:
	if _released:
		return
	_released = true
	_restore()
	var world := get_parent()
	var r := minf(_size.x, _size.y)
	IceFragment.spawn_burst(world, global_position, 12, 50.0, 190.0, 60.0, 260.0, r * 0.12, r * 0.3)
	IceFX.vapor_burst(world, global_position, 8, 15.0, 60.0, 0.8, 18.0, 40.0)
	IceFX.sparkle_burst(world, global_position, 18, 50.0, 200.0, 0.5, 200.0)
	IceFX.flash_light(world, global_position, 1.2, 1.4, 0.3)
	queue_free()


func _restore() -> void:
	if not is_instance_valid(_target):
		return
	if _target.has_meta("_ice_freeze"):
		_target.remove_meta("_ice_freeze")
	_target.modulate = _prev_modulate
	if _target.has_method("set_frozen"):
		_target.set_frozen(false)
	else:
		_target.process_mode = _prev_mode


func _exit_tree() -> void:
	# Se il nodo viene rimosso prima del tempo, il nemico non resta bloccato.
	if not _released:
		_released = true
		_restore()
