extends Camera3D
## Camera shake a "trauma" con rumore: chiamato da IceUltimate.evt_shake.

@export var max_offset := Vector3(0.35, 0.3, 0.2)
@export var max_roll_deg := 2.0
@export var frequency := 22.0

var _trauma := 0.0
var _decay := 1.5
var _t := 0.0
var _base: Transform3D
var _noise := FastNoiseLite.new()


func _ready() -> void:
	add_to_group(&"vfx_camera_shake")
	_base = transform
	_noise.frequency = 1.0


func add_shake(amount: float, duration: float) -> void:
	_trauma = clampf(maxf(_trauma, amount), 0.0, 1.5)
	_decay = _trauma / maxf(duration, 0.05)


func _process(delta: float) -> void:
	_t += delta * frequency
	_trauma = maxf(_trauma - _decay * delta, 0.0)
	var k := _trauma * _trauma
	var off := Vector3(_noise.get_noise_2d(_t, 0.0), _noise.get_noise_2d(0.0, _t), _noise.get_noise_2d(_t, _t)) * max_offset * k
	var roll := deg_to_rad(max_roll_deg) * k * _noise.get_noise_2d(_t * 0.7, 99.0)
	transform = _base.translated_local(off).rotated_local(Vector3.FORWARD, roll)
