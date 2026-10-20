class_name IceStaff
extends Node2D
## Bastone di ghiaccio del mago. Colpo principale col tasto SINISTRO del mouse:
## carica breve sulla gemma, flash di lancio, rinculo del bastone e
## proiettile di ghiaccio che congela il nemico per `freeze_duration` secondi.
##
## Uso: aggiungi questo nodo come figlio del mago (es. "Player/IceStaff").
## Se esiste un figlio Marker2D chiamato "Tip" viene usato come punta del
## bastone, altrimenti si usa `tip_offset`.

signal fired(projectile: IceProjectile)

const ACTION := "attack_primary"

@export_group("Colpo")
@export var projectile_speed := 620.0
@export var freeze_duration := 0.5
@export var fire_cooldown := 0.35
@export var damage := 10.0
@export var projectile_scale := 1.0

@export_group("Bastone")
@export var aim_at_mouse := true
@export var tip_offset := Vector2(30, 0)
## Disegna un bastone segnaposto: disattivalo quando usi il tuo sprite.
@export var draw_placeholder := true
@export var recoil_angle := 0.35
@export var recoil_distance := 7.0

var _cooldown_left := 0.0
var _gem_flash := 0.0
var _kick := 0.0
var _recoil := 0.0
var _time := 0.0
var _tween: Tween


func _ready() -> void:
	_ensure_input_action()


func _process(delta: float) -> void:
	_time += delta
	_cooldown_left = maxf(_cooldown_left - delta, 0.0)

	if aim_at_mouse:
		look_at(get_global_mouse_position())
		# Mirroring quando si mira a sinistra, così il bastone non va sottosopra.
		scale.y = -1.0 if absf(wrapf(global_rotation, -PI, PI)) > PI * 0.5 else 1.0
		rotation += _kick * -scale.y

	if Input.is_action_pressed(ACTION) and _cooldown_left <= 0.0:
		shoot()

	queue_redraw()


func get_tip_global() -> Vector2:
	var tip := get_node_or_null("Tip") as Node2D
	return tip.global_position if tip else to_global(tip_offset)


func shoot() -> void:
	_cooldown_left = fire_cooldown
	var tip := get_tip_global()
	var dir := (get_global_mouse_position() - tip).normalized() if aim_at_mouse \
		else Vector2.RIGHT.rotated(global_rotation)
	if dir == Vector2.ZERO:
		dir = Vector2.RIGHT.rotated(global_rotation)

	var projectile := IceProjectile.new()
	projectile.direction = dir
	projectile.speed = projectile_speed
	projectile.freeze_duration = freeze_duration
	projectile.damage = damage
	projectile.size = projectile_scale
	projectile.shooter = get_parent()
	var world := get_tree().current_scene
	world.add_child(projectile)
	projectile.global_position = tip

	_spawn_muzzle(world, tip, dir)
	_play_recoil()
	fired.emit(projectile)


func _spawn_muzzle(world: Node, at: Vector2, dir: Vector2) -> void:
	var flash := IceMuzzleFlash.new()
	world.add_child(flash)
	flash.global_position = at
	flash.rotation = dir.angle()
	IceFX.burst(world, at, 12, 60.0, 200.0, 1.5, 3.5, 0.35, 0.0, dir, 35.0)


func _play_recoil() -> void:
	if _tween:
		_tween.kill()
	_gem_flash = 1.0
	_kick = recoil_angle
	_recoil = recoil_distance
	_tween = create_tween().set_parallel()
	_tween.tween_property(self, "_kick", 0.0, 0.22).set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	_tween.tween_property(self, "_recoil", 0.0, 0.14).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	_tween.tween_property(self, "_gem_flash", 0.0, 0.3)


func _draw() -> void:
	if not draw_placeholder:
		return
	# Il rinculo sposta solo il disegno, non la posizione del nodo.
	draw_set_transform(Vector2(-_recoil, 0))
	# Asta di legno
	draw_line(Vector2(-18, 0), Vector2(tip_offset.x - 6, 0), Color(0.36, 0.24, 0.16), 4.0)
	draw_line(Vector2(-18, -1), Vector2(tip_offset.x - 6, -1), Color(0.52, 0.36, 0.24), 1.5)
	# Artiglio che regge la gemma
	draw_line(Vector2(tip_offset.x - 8, 0), Vector2(tip_offset.x - 2, -6), IceFX.DEEP, 2.0)
	draw_line(Vector2(tip_offset.x - 8, 0), Vector2(tip_offset.x - 2, 6), IceFX.DEEP, 2.0)

	# Gemma: pulsa a riposo, esplode di luce allo sparo
	var t := tip_offset
	var pulse := 0.5 + 0.5 * sin(_time * 4.0)
	var glow := 0.25 + 0.15 * pulse + _gem_flash * 0.75
	draw_circle(t, 9.0 + 10.0 * _gem_flash, Color(IceFX.GLOW, glow * 0.35))
	draw_circle(t, 6.0 + 4.0 * _gem_flash, Color(IceFX.GLOW, glow * 0.6))
	var gem := PackedVector2Array([t + Vector2(6, 0), t + Vector2(0, -5), t + Vector2(-5, 0), t + Vector2(0, 5)])
	draw_colored_polygon(gem, IceFX.GLOW.lerp(IceFX.CORE, 0.4 + 0.6 * _gem_flash))
	draw_line(t + Vector2(-2, -1), t + Vector2(2, -3), Color.WHITE, 1.0)


func _ensure_input_action() -> void:
	if InputMap.has_action(ACTION):
		return
	InputMap.add_action(ACTION)
	var ev := InputEventMouseButton.new()
	ev.button_index = MOUSE_BUTTON_LEFT
	InputMap.action_add_event(ACTION, ev)
