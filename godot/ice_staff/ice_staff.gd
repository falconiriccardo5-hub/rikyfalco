class_name IceStaff
extends Node2D
## Bastone di ghiaccio del mago. Colpo principale col tasto SINISTRO del mouse:
## la gemma di cristallo si accende, lampo di luce fredda, rinculo del bastone
## e proiettile di ghiaccio che congela il nemico per `freeze_duration` secondi.
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
## Se false il bastone non legge l'input (utile per IA, cutscene, render).
@export var listen_input := true
@export var tip_offset := Vector2(30, 0)
## Disegna asta e gemma segnaposto: disattivalo quando usi il tuo sprite.
@export var draw_placeholder := true
@export var recoil_angle := 0.35
@export var recoil_distance := 7.0

## Se impostato (Vector2 globale) il bastone mira lì invece che al mouse.
var aim_override: Variant = null

var _cooldown_left := 0.0
var _gem_flash := 0.0
var _kick := 0.0
var _recoil := 0.0
var _time := 0.0
var _tween: Tween
var _gem: Sprite2D
var _gem_mat: ShaderMaterial
var _gem_glow: Sprite2D
var _gem_light: PointLight2D


func _ready() -> void:
	_ensure_input_action()
	_gem_glow = IceFX.glow(40.0, Color(0.5, 0.8, 1.0, 0.5))
	add_child(_gem_glow)
	_gem_mat = IceFX.crystal_material(false)
	_gem = IceFX.quad(_gem_mat, Vector2(15, 10))
	_gem.visible = draw_placeholder
	add_child(_gem)
	_gem_light = IceFX.light(0.45, 0.7)
	add_child(_gem_light)


func _process(delta: float) -> void:
	_time += delta
	_cooldown_left = maxf(_cooldown_left - delta, 0.0)

	if aim_at_mouse or aim_override != null:
		look_at(_aim_point())
		# Mirroring quando si mira a sinistra, così il bastone non va sottosopra.
		scale.y = -1.0 if absf(wrapf(global_rotation, -PI, PI)) > PI * 0.5 else 1.0
		rotation += _kick * -scale.y

	if listen_input and Input.is_action_pressed(ACTION) and _cooldown_left <= 0.0:
		shoot()

	var pulse := 0.5 + 0.5 * sin(_time * 4.0)
	var tip := tip_offset - Vector2(_recoil, 0)
	_gem.position = tip
	_gem_glow.position = tip
	_gem_light.position = tip
	_gem_glow.modulate.a = 0.35 + 0.15 * pulse + 0.6 * _gem_flash
	_gem_glow.scale = Vector2.ONE * (40.0 + 50.0 * _gem_flash) / 128.0
	_gem_light.energy = 0.35 + 0.15 * pulse + 1.4 * _gem_flash
	_gem_mat.set_shader_parameter("node_rotation", global_rotation)
	queue_redraw()


func _aim_point() -> Vector2:
	return aim_override if aim_override != null else get_global_mouse_position()


func get_tip_global() -> Vector2:
	var tip := get_node_or_null("Tip") as Node2D
	return tip.global_position if tip else to_global(tip_offset)


func shoot() -> void:
	_cooldown_left = fire_cooldown
	var tip := get_tip_global()
	var dir := (_aim_point() - tip).normalized()
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

	var flash := IceMuzzleFlash.new()
	flash.rotation = dir.angle()
	world.add_child(flash)
	flash.global_position = tip

	_play_recoil()
	fired.emit(projectile)


func _play_recoil() -> void:
	if _tween:
		_tween.kill()
	_gem_flash = 1.0
	_kick = recoil_angle
	_recoil = recoil_distance
	_tween = create_tween().set_parallel()
	_tween.tween_property(self, "_kick", 0.0, 0.22).set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	_tween.tween_property(self, "_recoil", 0.0, 0.14).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	_tween.tween_property(self, "_gem_flash", 0.0, 0.35)


func _draw() -> void:
	if not draw_placeholder:
		return
	# Il rinculo sposta solo il disegno, non la posizione del nodo.
	draw_set_transform(Vector2(-_recoil, 0))
	var end := tip_offset.x - 6.0
	draw_line(Vector2(-18, 0), Vector2(end, 0), Color(0.3, 0.2, 0.13), 4.0)
	draw_line(Vector2(-18, -1), Vector2(end, -1), Color(0.48, 0.33, 0.22), 1.5)
	# Artiglio di metallo che regge la gemma
	var claw := Color(0.55, 0.62, 0.72)
	draw_line(Vector2(end - 2, 0), Vector2(tip_offset.x - 1, -6), claw, 2.0)
	draw_line(Vector2(end - 2, 0), Vector2(tip_offset.x - 1, 6), claw, 2.0)


func _ensure_input_action() -> void:
	if InputMap.has_action(ACTION):
		return
	InputMap.add_action(ACTION)
	var ev := InputEventMouseButton.new()
	ev.button_index = MOUSE_BUTTON_LEFT
	InputMap.action_add_event(ACTION, ev)
