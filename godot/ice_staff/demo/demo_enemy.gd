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
var _time := 0.0


func _ready() -> void:
	add_to_group("enemies")
	set_meta("freeze_size", Vector2(40, 52))
	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = Vector2(30, 44)
	shape.shape = rect
	add_child(shape)


func set_frozen(frozen: bool) -> void:
	_frozen = frozen
	velocity = Vector2.ZERO


func take_damage(amount: float) -> void:
	_hp -= amount
	_hurt_flash = 1.0
	if _hp <= 0.0:
		IceFX.burst(get_parent(), global_position, 24, 80.0, 220.0, 2.0, 4.0, 0.6, 300.0)
		queue_free()


func _physics_process(delta: float) -> void:
	_hurt_flash = maxf(_hurt_flash - delta * 5.0, 0.0)
	if _frozen:
		queue_redraw()
		return
	_time += delta
	if is_instance_valid(target):
		var to := target.global_position - global_position
		velocity = to.normalized() * move_speed if to.length() > 60.0 else Vector2.ZERO
	move_and_slide()
	queue_redraw()


func _draw() -> void:
	# Slime segnaposto: sostituiscilo col tuo sprite.
	var bob := 0.0 if _frozen else sin(_time * 8.0) * 2.0
	var body := Color(0.55, 0.85, 0.35).lerp(Color.WHITE, _hurt_flash)
	draw_circle(Vector2(0, 6 + bob * 0.5), 18.0, body)
	draw_rect(Rect2(-18, 6 + bob * 0.5, 36, 16), body)
	draw_circle(Vector2(-6, 2 + bob), 4.0, Color.WHITE)
	draw_circle(Vector2(6, 2 + bob), 4.0, Color.WHITE)
	draw_circle(Vector2(-5, 3 + bob), 2.0, Color(0.1, 0.1, 0.15))
	draw_circle(Vector2(7, 3 + bob), 2.0, Color(0.1, 0.1, 0.15))
	# Barra vita
	var hp_k := clampf(_hp / max_hp, 0.0, 1.0)
	draw_rect(Rect2(-18, -24, 36, 4), Color(0, 0, 0, 0.5))
	draw_rect(Rect2(-18, -24, 36 * hp_k, 4), Color(0.95, 0.35, 0.35))
