extends Camera3D
## Camera orbitale: trascina col mouse per ruotare, rotellina per lo zoom.

@export var target := Vector3(0, 1.0, 0)
@export var distance := 6.5
@export var yaw := 0.0
@export var pitch := deg_to_rad(-18.0)
## Rotazione automatica in radianti/secondo (0 = ferma).
@export var auto_rotate := 0.0

var _dragging := false


func _ready() -> void:
	_apply()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		match event.button_index:
			MOUSE_BUTTON_LEFT, MOUSE_BUTTON_RIGHT, MOUSE_BUTTON_MIDDLE:
				_dragging = event.pressed
			MOUSE_BUTTON_WHEEL_UP:
				distance = maxf(distance * 0.92, 2.0)
			MOUSE_BUTTON_WHEEL_DOWN:
				distance = minf(distance * 1.08, 24.0)
	elif event is InputEventMouseMotion and _dragging:
		yaw -= event.relative.x * 0.005
		pitch = clampf(pitch - event.relative.y * 0.005, -1.45, 0.15)


func _process(delta: float) -> void:
	yaw += auto_rotate * delta
	_apply()


func _apply() -> void:
	var dir := Vector3(sin(yaw) * cos(pitch), -sin(pitch), cos(yaw) * cos(pitch))
	position = target + dir * distance
	look_at(target)
