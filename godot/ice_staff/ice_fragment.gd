class_name IceFragment
extends Node2D
## Scheggia di ghiaccio fisica: vola, gira su se stessa, rimbalza sul terreno
## con un'altezza simulata (funziona sia in vista laterale che top-down),
## proietta un'ombra di contatto e poi si dissolve.

const GRAVITY := 900.0

var velocity := Vector2.ZERO
var height := 0.0
var v_height := 0.0
var spin := 0.0
var size := 10.0
var life := 1.2

var _t := 0.0
var _sprite: Sprite2D
var _mat: ShaderMaterial


static func spawn_burst(parent: Node, at: Vector2, count: int, speed_min: float, speed_max: float,
		up_min: float, up_max: float, size_min: float, size_max: float,
		dir := Vector2.ZERO, spread := PI) -> void:
	var base := dir.angle() if dir != Vector2.ZERO else 0.0
	for i in count:
		var f := IceFragment.new()
		f.velocity = Vector2.from_angle(base + randf_range(-spread, spread)) * randf_range(speed_min, speed_max)
		f.v_height = randf_range(up_min, up_max)
		f.height = randf_range(0.0, 8.0)
		f.spin = randf_range(-14.0, 14.0)
		f.size = randf_range(size_min, size_max)
		f.life = randf_range(0.8, 1.4)
		parent.add_child(f)
		f.global_position = at


func _ready() -> void:
	_mat = IceFX.crystal_material(false)
	_sprite = Sprite2D.new()
	_sprite.texture = IceFX.white_texture()
	_sprite.material = _mat
	_sprite.scale = Vector2(size, size * randf_range(0.35, 0.6)) / IceFX.TEX
	_sprite.rotation = randf() * TAU
	add_child(_sprite)


func _process(delta: float) -> void:
	_t += delta
	v_height -= GRAVITY * delta
	height += v_height * delta
	if height <= 0.0:
		height = 0.0
		if absf(v_height) > 60.0:
			v_height = -v_height * 0.35
			velocity *= 0.55
			spin *= 0.5
		else:
			v_height = 0.0
			velocity = velocity.move_toward(Vector2.ZERO, 500.0 * delta)
			spin = move_toward(spin, 0.0, 30.0 * delta)
	position += velocity * delta
	_sprite.position.y = -height
	_sprite.rotation += spin * delta
	_mat.set_shader_parameter("node_rotation", _sprite.rotation)

	var k := _t / life
	if k > 0.65:
		modulate.a = 1.0 - (k - 0.65) / 0.35
	if _t >= life:
		queue_free()
	queue_redraw()


func _draw() -> void:
	var s := clampf(1.0 - height / 120.0, 0.2, 1.0)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2(1.0, 0.4))
	draw_circle(Vector2.ZERO, size * 0.4 * s, Color(0.0, 0.02, 0.06, 0.4 * s))
