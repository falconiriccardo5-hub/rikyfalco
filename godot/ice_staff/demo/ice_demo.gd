extends Node2D
## Scena demo: mago con bastone di ghiaccio + nemici che arrivano da destra.
## Tasto SINISTRO del mouse = colpo principale. WASD per muovere il mago.
## Avvio con `-- --autofire` per far sparare il mago da solo (test headless).

const WIZARD_SPEED := 180.0

var wizard: CharacterBody2D
var staff: IceStaff
var _spawn_left := 0.0
var _autofire := false


func _ready() -> void:
	_autofire = "--autofire" in OS.get_cmdline_user_args()
	RenderingServer.set_default_clear_color(Color(0.06, 0.07, 0.11))

	wizard = CharacterBody2D.new()
	wizard.name = "Wizard"
	wizard.position = Vector2(220, 380)
	wizard.set_script(load("res://ice_staff/demo/demo_wizard.gd"))
	add_child(wizard)

	staff = IceStaff.new()
	staff.name = "IceStaff"
	staff.position = Vector2(10, -6)
	wizard.add_child(staff)

	for i in 3:
		_spawn_enemy()


func _physics_process(delta: float) -> void:
	var input := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	if Input.is_physical_key_pressed(KEY_A): input.x -= 1
	if Input.is_physical_key_pressed(KEY_D): input.x += 1
	if Input.is_physical_key_pressed(KEY_W): input.y -= 1
	if Input.is_physical_key_pressed(KEY_S): input.y += 1
	wizard.velocity = input.limit_length(1.0) * WIZARD_SPEED
	wizard.move_and_slide()

	_spawn_left -= delta
	if _spawn_left <= 0.0 and get_tree().get_nodes_in_group("enemies").size() < 4:
		_spawn_left = 1.2
		_spawn_enemy()

	if _autofire and Engine.get_physics_frames() % 20 == 0:
		staff.shoot()


func _spawn_enemy() -> void:
	var e := DemoEnemy.new()
	e.position = Vector2(randf_range(900, 1180), randf_range(140, 620))
	e.target = wizard
	add_child(e)
