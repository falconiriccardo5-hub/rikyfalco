class_name IceProjectile
extends Area2D
## Proiettile di ghiaccio: scheggia di cristallo con alone, scia luminosa e
## brillantini di brina. All'impatto si frantuma e congela il bersaglio.
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
var _trail: Line2D
var _sparkles: CPUParticles2D

const TRAIL_POINTS := 14


func _ready() -> void:
	rotation = direction.angle()
	var shape := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = 7.0 * size
	shape.shape = circle
	add_child(shape)
	body_entered.connect(_on_body_entered)
	area_entered.connect(_on_area_entered)

	_build_trail()
	_build_sparkles()

	# Comparsa "pop" dalla punta del bastone
	scale = Vector2(0.2, 0.2)
	create_tween().tween_property(self, "scale", Vector2.ONE, 0.1) \
		.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


func _build_trail() -> void:
	_trail = Line2D.new()
	_trail.top_level = true  # punti in coordinate globali
	_trail.width = 9.0 * size
	_trail.joint_mode = Line2D.LINE_JOINT_ROUND
	_trail.begin_cap_mode = Line2D.LINE_CAP_ROUND
	_trail.end_cap_mode = Line2D.LINE_CAP_ROUND
	var curve := Curve.new()
	curve.add_point(Vector2(0.0, 0.0))
	curve.add_point(Vector2(1.0, 1.0))
	_trail.width_curve = curve
	var g := Gradient.new()
	g.set_color(0, Color(IceFX.DEEP, 0.0))
	g.set_color(1, Color(IceFX.CORE, 0.85))
	g.add_point(0.6, Color(IceFX.GLOW, 0.45))
	_trail.gradient = g
	_trail.material = IceFX.additive_material()
	add_child(_trail)


func _build_sparkles() -> void:
	_sparkles = CPUParticles2D.new()
	_sparkles.amount = 28
	_sparkles.lifetime = 0.45
	_sparkles.local_coords = false
	_sparkles.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	_sparkles.emission_sphere_radius = 5.0 * size
	_sparkles.direction = Vector2.LEFT
	_sparkles.spread = 70.0
	_sparkles.initial_velocity_min = 10.0
	_sparkles.initial_velocity_max = 45.0
	_sparkles.gravity = Vector2(0, 25)
	_sparkles.scale_amount_min = 1.0 * size
	_sparkles.scale_amount_max = 3.0 * size
	_sparkles.scale_amount_curve = IceFX.shrink_curve()
	_sparkles.color_ramp = IceFX.fade_gradient(IceFX.CORE, IceFX.GLOW)
	_sparkles.material = IceFX.additive_material()
	add_child(_sparkles)


func _physics_process(delta: float) -> void:
	_age += delta
	if not _dead:
		var step := direction * speed * delta
		global_position += step
		_traveled += step.length()
		_trail.add_point(global_position)
		if _traveled >= max_distance:
			_shatter(false)
	# Da morto la scia si ritira di 2 punti a frame verso il punto d'impatto
	var keep := maxi(_trail.get_point_count() - 2, 0) if _dead else TRAIL_POINTS
	while _trail.get_point_count() > keep:
		_trail.remove_point(0)
	queue_redraw()


func _draw() -> void:
	if _dead:
		return
	var flicker := 0.85 + 0.15 * sin(_age * 45.0)
	var s := size
	# Alone esterno
	draw_circle(Vector2.ZERO, 15.0 * s, Color(IceFX.GLOW, 0.12 * flicker))
	draw_circle(Vector2.ZERO, 10.0 * s, Color(IceFX.GLOW, 0.25 * flicker))
	# Scheggia principale (punta in avanti, +X)
	var outer := PackedVector2Array([
		Vector2(17, 0) * s, Vector2(3, -6.5) * s, Vector2(-12, 0) * s, Vector2(3, 6.5) * s])
	draw_colored_polygon(outer, Color(IceFX.GLOW.lerp(IceFX.CORE, 0.3), 0.95))
	var inner := PackedVector2Array([
		Vector2(13, 0) * s, Vector2(3, -3) * s, Vector2(-6, 0) * s, Vector2(3, 3) * s])
	draw_colored_polygon(inner, IceFX.CORE)
	# Faccette
	draw_line(Vector2(17, 0) * s, Vector2(-12, 0) * s, Color(1, 1, 1, 0.55), 1.0)
	draw_line(Vector2(3, -6.5) * s, Vector2(8, 0) * s, Color(1, 1, 1, 0.4), 1.0)
	# Due cristallini che orbitano attorno alla scheggia
	for i in 2:
		var a := _age * 14.0 + PI * i
		var c := Vector2(cos(a) * 4.0, sin(a) * 9.0) * s
		var d := 2.5 * s
		draw_colored_polygon(PackedVector2Array([
			c + Vector2(d, 0), c + Vector2(0, -d), c + Vector2(-d, 0), c + Vector2(0, d)]),
			Color(IceFX.CORE, 0.9))


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
	IceFreeze.apply_to(target, freeze_duration)
	hit.emit(target)
	_shatter(true)


func _shatter(big: bool) -> void:
	if _dead:
		return
	_dead = true
	set_deferred("monitoring", false)
	_sparkles.emitting = false
	var impact := IceImpact.new()
	impact.strength = size * (1.0 if big else 0.55)
	impact.normal = -direction
	get_parent().add_child(impact)
	impact.global_position = global_position
	# Lascio il tempo alla scia e ai brillantini di sparire
	get_tree().create_timer(_sparkles.lifetime).timeout.connect(queue_free)
