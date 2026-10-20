class_name DemoEnemy
extends CharacterBody2D
## Nemico d'esempio: cammina verso il mago. Mostra come integrare il freeze
## tramite `set_frozen()` e il danno tramite `take_damage()`.

@export var move_speed := 70.0
@export var max_hp := 40.0

var target: Node2D
var _hp := max_hp
var _frozen := false
var _hurt_flash := 0.0
var _time := randf() * 10.0


func _ready() -> void:
	_hp = max_hp
	add_to_group("enemies")
	set_meta("freeze_size", Vector2(46, 46))
	set_meta("freeze_offset", Vector2(0, 6))
	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = Vector2(32, 36)
	shape.shape = rect
	shape.position = Vector2(0, 6)
	add_child(shape)


func set_frozen(frozen: bool) -> void:
	_frozen = frozen
	velocity = Vector2.ZERO


func take_damage(amount: float) -> void:
	_hp -= amount
	_hurt_flash = 1.0
	if _hp <= 0.0:
		IceFragment.spawn_burst(get_parent(), global_position, 16, 60.0, 220.0, 80.0, 300.0, 6.0, 14.0)
		IceFX.vapor_burst(get_parent(), global_position, 10, 15.0, 70.0, 0.9, 20.0, 44.0)
		queue_free()


func _physics_process(delta: float) -> void:
	_hurt_flash = maxf(_hurt_flash - delta * 6.0, 0.0)
	if _frozen:
		queue_redraw()
		return
	_time += delta
	if is_instance_valid(target) and move_speed > 0.0:
		var to := target.global_position - global_position
		velocity = to.normalized() * move_speed if to.length() > 60.0 else Vector2.ZERO
		move_and_slide()
	queue_redraw()


func _draw() -> void:
	# Slime segnaposto: sostituiscilo col tuo sprite.
	var squash := 0.0 if _frozen else sin(_time * 7.0) * 0.06
	var base := Color(0.32, 0.62, 0.24).lerp(Color.WHITE, _hurt_flash)
	draw_set_transform(Vector2(0, 22), 0.0, Vector2(1.0, 0.35))
	draw_circle(Vector2.ZERO, 22.0, Color(0, 0, 0, 0.35))
	draw_set_transform(Vector2(0, 22), 0.0, Vector2(1.0 + squash, 1.0 - squash))
	draw_circle(Vector2(0, -18), 20.0, base.darkened(0.35))
	draw_circle(Vector2(0, -20), 18.0, base)
	draw_circle(Vector2(-3, -25), 12.0, base.lightened(0.15))
	draw_set_transform(Vector2(-8, -12), -0.5, Vector2(1.0, 0.55))
	draw_circle(Vector2.ZERO, 5.0, Color(1, 1, 1, 0.55))
	draw_set_transform(Vector2(0, 22), 0.0, Vector2(1.0 + squash, 1.0 - squash))
	for x in [-6.0, 6.0]:
		draw_circle(Vector2(x, -22), 3.6, Color(0.96, 0.96, 0.92))
		draw_circle(Vector2(x + 0.8, -21.5), 2.0, Color(0.06, 0.06, 0.1))
	draw_set_transform(Vector2.ZERO)
	var hp_k := clampf(_hp / max_hp, 0.0, 1.0)
	draw_rect(Rect2(-16, -26, 32, 3), Color(0, 0, 0, 0.55))
	draw_rect(Rect2(-16, -26, 32 * hp_k, 3), Color(0.9, 0.3, 0.3))
