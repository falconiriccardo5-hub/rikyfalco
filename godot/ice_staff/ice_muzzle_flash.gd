class_name IceMuzzleFlash
extends Node2D
## Lancio dalla punta del bastone: lampo di luce, alone che si espande,
## sbuffo di condensa in avanti e cono di polvere di ghiaccio.

const DURATION := 0.18

var _t := 0.0
var _glow: Sprite2D


func _ready() -> void:
	var world := get_parent()
	var dir := Vector2.from_angle(rotation)
	_glow = IceFX.glow(90.0, Color(0.75, 0.92, 1.0, 1.0))
	add_child(_glow)
	IceFX.flash_light(world, global_position, 1.8, 1.8, 0.25)
	IceFX.vapor_burst(world, global_position, 7, 30.0, 110.0, 0.6, 12.0, 30.0, dir, 30.0, 0.4)
	IceFX.sparkle_burst(world, global_position, 14, 80.0, 260.0, 0.4, 0.0, dir, 28.0, 5.0, 11.0)


func _process(delta: float) -> void:
	_t += delta
	var k := _t / DURATION
	if k >= 1.0:
		queue_free()
		return
	_glow.modulate.a = pow(1.0 - k, 2.0)
	_glow.scale = Vector2(1.6, 1.0) * (0.5 + 0.7 * k) * 90.0 / 128.0
