class_name IceFreeze
extends Node2D
## Stato "congelato": blocca il nemico per `duration` secondi (default 0.5),
## lo tinge di azzurro e lo avvolge in un blocco di ghiaccio che cresce dal
## basso, brilla, trema poco prima di rompersi e infine si frantuma.
##
## Come viene bloccato il nemico:
## - se ha un metodo `set_frozen(frozen: bool)` viene chiamato quello
##   (consigliato: così decidi tu cosa fermare: IA, movimento, animazioni);
## - altrimenti il nodo viene messo in PROCESS_MODE_DISABLED.
##
## Dimensione del blocco: metadato "freeze_size" (Vector2) sul nemico,
## altrimenti 44x56. Offset del centro: metadato "freeze_offset" (Vector2).

var duration := 0.5

var _t := 0.0
var _target: Node2D
var _size := Vector2(44, 56)
var _prev_mode := Node.PROCESS_MODE_INHERIT
var _prev_modulate := Color.WHITE
var _released := false


## Congela `target`. Se è già congelato rinnova il timer.
static func apply_to(target: Node, freeze_time: float) -> IceFreeze:
	if not target is Node2D:
		return null
	var existing := target.get_node_or_null("IceFreeze") as IceFreeze
	if existing:
		existing.refresh(freeze_time)
		return existing
	var f := IceFreeze.new()
	f.name = "IceFreeze"
	f.duration = freeze_time
	target.add_child(f)
	return f


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS  # continua anche col nemico disabilitato
	z_index = 1
	_target = get_parent() as Node2D
	_size = _target.get_meta("freeze_size", _size)
	position = _target.get_meta("freeze_offset", Vector2.ZERO)

	if _target.has_method("set_frozen"):
		_target.set_frozen(true)
	else:
		_prev_mode = _target.process_mode
		_target.process_mode = Node.PROCESS_MODE_DISABLED
	_prev_modulate = _target.modulate
	_target.modulate = _prev_modulate * IceFX.FROZEN_TINT

	IceFX.burst(_target.get_parent(), global_position, 10, 30.0, 90.0, 1.5, 3.0, 0.4, 0.0)


func refresh(freeze_time: float) -> void:
	duration = freeze_time
	_t = minf(_t, 0.08)


func _process(delta: float) -> void:
	_t += delta
	if _t >= duration:
		_release()
		return
	queue_redraw()


func _draw() -> void:
	var hw := _size.x * 0.5
	var hh := _size.y * 0.5
	var grow := clampf(_t / 0.08, 0.0, 1.0)  # il blocco sale dal basso in 80 ms
	var left := duration - _t
	var shake := Vector2.ZERO
	if left < 0.12:
		shake = Vector2(randf_range(-1.5, 1.5), randf_range(-1.0, 1.0))
	# Scala verticale ancorata alla base
	draw_set_transform(Vector2(0, hh * (1.0 - grow)) + shake, 0.0, Vector2(1, grow))

	var block := PackedVector2Array([
		Vector2(-hw * 0.8, -hh), Vector2(hw * 0.25, -hh * 1.12), Vector2(hw, -hh * 0.45),
		Vector2(hw * 0.92, hh), Vector2(-hw * 0.95, hh * 0.95), Vector2(-hw * 1.06, -hh * 0.3)])
	draw_colored_polygon(block, Color(0.6, 0.88, 1.0, 0.36))
	var outline := block.duplicate()
	outline.append(block[0])
	draw_polyline(outline, Color(IceFX.CORE, 0.9), 2.0)

	# Faccette interne
	var facet := Color(1, 1, 1, 0.35)
	draw_line(Vector2(hw * 0.25, -hh * 1.12), Vector2(-hw * 0.1, hh * 0.1), facet, 1.0)
	draw_line(Vector2(-hw * 0.1, hh * 0.1), Vector2(hw * 0.92, hh), facet, 1.0)
	draw_line(Vector2(-hw * 0.1, hh * 0.1), Vector2(-hw * 1.06, -hh * 0.3), facet, 1.0)

	# Riflesso che attraversa il blocco in diagonale
	var sweep := fmod(_t * 2.2, 1.0)
	var y := lerpf(-hh, hh, sweep)
	draw_line(Vector2(-hw * 0.7, y + 10), Vector2(hw * 0.7, y - 10), Color(1, 1, 1, 0.5 * (1.0 - sweep)), 3.0)

	# Spuntoni di brina alla base
	for i in 5:
		var x := lerpf(-hw * 0.9, hw * 0.9, i / 4.0)
		var h := 6.0 + 5.0 * float(i % 2)
		draw_colored_polygon(PackedVector2Array([
			Vector2(x - 3, hh), Vector2(x, hh - h), Vector2(x + 3, hh)]), Color(IceFX.CORE, 0.85))


func _release() -> void:
	if _released:
		return
	_released = true
	_restore()
	var impact := IceImpact.new()
	impact.strength = 0.8
	impact.normal = Vector2.UP
	_target.get_parent().add_child(impact)
	impact.global_position = global_position
	queue_free()


func _restore() -> void:
	if not is_instance_valid(_target):
		return
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
