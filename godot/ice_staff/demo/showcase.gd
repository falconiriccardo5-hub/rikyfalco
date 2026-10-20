extends Node2D
## Sequenza scriptata per il render video (--write-movie): campo largo con
## tre colpi, poi primo piano al rallentatore su impatto e congelamento.
## Avvio: godot --path . --write-movie out/frame.png --fixed-fps 60 res://ice_staff/demo/showcase.tscn

const FPS := 60.0

var wizard: CharacterBody2D
var staff: IceStaff
var cam: Camera2D
var targets := {}
var _frame := 0
var _shake := 0.0
var _done := {}


func _ready() -> void:
	seed(7)
	RenderingServer.set_default_clear_color(Color(0.02, 0.02, 0.03))
	add_child(DemoArena.new())

	wizard = CharacterBody2D.new()
	wizard.position = Vector2(230, 380)
	wizard.set_script(load("res://ice_staff/demo/demo_wizard.gd"))
	add_child(wizard)
	staff = IceStaff.new()
	staff.position = Vector2(10, -6)
	staff.listen_input = false
	wizard.add_child(staff)
	staff.fired.connect(func(p: IceProjectile): p.hit.connect(func(_t): _shake = 5.0))

	targets.a = _enemy(Vector2(1000, 225))
	targets.b = _enemy(Vector2(1060, 385))
	targets.c = _enemy(Vector2(940, 120))
	targets.d = _enemy(Vector2(640, 470))
	staff.aim_override = targets.a.global_position

	cam = Camera2D.new()
	cam.position = Vector2(640, 360)
	add_child(cam)
	cam.make_current()


func _enemy(at: Vector2) -> DemoEnemy:
	var e := DemoEnemy.new()
	e.position = at
	e.move_speed = 0.0
	add_child(e)
	return e


func _at(t: float, key: String) -> bool:
	if _frame / FPS >= t and not _done.has(key):
		_done[key] = true
		return true
	return false


func _process(_delta: float) -> void:
	_frame += 1
	var t := _frame / FPS
	if _at(0.35, "a"): _fire(targets.a)
	if _at(0.75, "aim_b"): staff.aim_override = targets.b.global_position
	if _at(1.05, "b"): _fire(targets.b)
	if _at(1.45, "aim_c"): staff.aim_override = targets.c.global_position
	if _at(1.75, "c"): _fire(targets.c)
	if _at(2.6, "aim_d"): staff.aim_override = targets.d.global_position

	# Primo piano al rallentatore sull'ultimo bersaglio
	var close := smoothstep(3.0, 3.7, t) - smoothstep(9.6, 10.2, t)
	cam.position = Vector2(640, 360).lerp(Vector2(450, 425), close)
	cam.zoom = Vector2.ONE * lerpf(1.0, 2.1, close)
	Engine.time_scale = lerpf(1.0, 0.25, close)
	if _at(3.8, "d"): _fire(targets.d)

	_shake = move_toward(_shake, 0.0, 30.0 * _delta / maxf(Engine.time_scale, 0.01))
	cam.offset = Vector2(randf_range(-1, 1), randf_range(-1, 1)) * _shake
	if t >= 10.6:
		get_tree().quit()


func _fire(target: Node2D) -> void:
	staff.aim_override = target.global_position
	staff.shoot()
