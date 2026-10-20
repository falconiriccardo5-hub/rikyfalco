class_name IceProjectile
extends Area2D
## Proiettile di ghiaccio: cristallo sfaccettato che rifrange lo sfondo,
## luce fredda dinamica che illumina la scena, scia di vapore gelido,
## polvere di diamante scintillante e un sottile filo d'energia.
##
## Un bersaglio viene congelato se è nel gruppo "enemies", oppure se è
## un'Area2D nel gruppo "hurtbox" (in quel caso si congela il suo genitore).
## Se il bersaglio ha `take_damage(amount)` riceve anche il danno.

signal hit(target: Node)

@export var speed := 620.0
@export var max_distance := 900.0
@export var freeze_duration := 0.5
@export var damage := 10.0
@export var size := 1.0

var direction := Vector2.RIGHT
var shooter: Node = null

var _traveled := 0.0
var _age := 0.0
var _dead := false
var _body: Sprite2D
var _glow: Sprite2D
var _light: PointLight2D
var _streak: Line2D
var _vapor: CPUParticles2D
var _dust: CPUParticles2D

const STREAK_POINTS := 10


func _ready() -> void:
	rotation = direction.angle()
	var shape := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = 7.0 * size
	shape.shape = circle
	add_child(shape)
	body_entered.connect(_on_body_entered)
	area_entered.connect(_on_area_entered)

	_vapor = IceFX.vapor_emitter(80, 0.8, 14.0 * size, 36.0 * size, 5.0, 30.0, 0.3)
	_vapor.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	_vapor.emission_sphere_radius = 4.0 * size
	add_child(_vapor)

	_dust = IceFX.sparkle_emitter(26, 0.55, 5.0 * size, 11.0 * size)
	_dust.direction = Vector2.LEFT
	_dust.spread = 50.0
	_dust.initial_velocity_min = 20.0
	_dust.initial_velocity_max = 70.0
	_dust.gravity = Vector2(0, 40)
	_dust.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	_dust.emission_sphere_radius = 6.0 * size
	add_child(_dust)

	_streak = Line2D.new()
	_streak.top_level = true  # punti in coordinate globali
	_streak.width = 4.0 * size
	_streak.begin_cap_mode = Line2D.LINE_CAP_ROUND
	_streak.end_cap_mode = Line2D.LINE_CAP_ROUND
	_streak.width_curve = IceFX._curve(0.0, 1.0)
	var g := Gradient.new()
	g.set_color(0, Color(0.5, 0.8, 1.0, 0.0))
	g.set_color(1, Color(0.85, 0.96, 1.0, 0.6))
	_streak.gradient = g
	_streak.material = IceFX.additive()
	add_child(_streak)

	_glow = IceFX.glow(120.0 * size, Color(0.45, 0.75, 1.0, 0.55))
	add_child(_glow)

	var mat := IceFX.crystal_material(true)
	mat.set_shader_parameter("node_rotation", rotation)
	_body = IceFX.quad(mat, Vector2(54.0, 20.0) * size)
	add_child(_body)

	_light = IceFX.light(1.6, 2.4 * size)
	add_child(_light)

	# Il cristallo si "condensa" dalla punta del bastone
	_body.scale *= 0.2
	create_tween().tween_property(_body, "scale", _body.scale * 5.0, 0.09) \
		.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


func _physics_process(delta: float) -> void:
	_age += delta
	if not _dead:
		var step := direction * speed * delta
		global_position += step
		_traveled += step.length()
		_streak.add_point(global_position)
		_light.energy = 1.5 + 0.2 * sin(_age * 30.0)
		_glow.modulate.a = 0.45 + 0.08 * sin(_age * 41.0)
		if _traveled >= max_distance:
			_shatter(false)
	var keep := maxi(_streak.get_point_count() - 2, 0) if _dead else STREAK_POINTS
	while _streak.get_point_count() > keep:
		_streak.remove_point(0)


func _on_body_entered(body: Node) -> void:
	if _dead or body == shooter:
		return
	if body.is_in_group("enemies"):
		_hit_target(body)
	else:
		_shatter(true)  # muro / terreno


func _on_area_entered(area: Area2D) -> void:
	if _dead or not area.is_in_group("hurtbox"):
		return
	var target := area.get_parent()
	if target != shooter:
		_hit_target(target)


func _hit_target(target: Node) -> void:
	if target.has_method("take_damage"):
		target.take_damage(damage)
	if not target.is_queued_for_deletion():
		IceFreeze.apply_to(target, freeze_duration, global_position)
	hit.emit(target)
	_shatter(true)


func _shatter(big: bool) -> void:
	if _dead:
		return
	_dead = true
	set_deferred("monitoring", false)
	_body.hide()
	_glow.hide()
	_vapor.emitting = false
	_dust.emitting = false
	_light.hide()
	var impact := IceImpact.new()
	impact.strength = size * (1.0 if big else 0.6)
	impact.normal = -direction
	get_parent().add_child(impact)
	impact.global_position = global_position
	# Lascio sparire scia e vapore prima di liberare il nodo
	get_tree().create_timer(_vapor.lifetime).timeout.connect(queue_free)
