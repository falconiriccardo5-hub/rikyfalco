class_name IceMuzzleFlash
extends Node2D
## Flash di lancio sulla punta del bastone: stella a 4 punte e anello rapido.

@export var duration := 0.16
var _t := 0.0


func _ready() -> void:
	material = IceFX.additive_material()


func _process(delta: float) -> void:
	_t += delta
	if _t >= duration:
		queue_free()
		return
	queue_redraw()


func _draw() -> void:
	var k := _t / duration
	var fade := 1.0 - k
	draw_circle(Vector2.ZERO, 10.0 * (1.0 + k), Color(IceFX.GLOW, 0.5 * fade))
	draw_arc(Vector2.ZERO, 6.0 + 16.0 * k, 0.0, TAU, 24, Color(IceFX.CORE, fade), 2.0 * fade + 0.5)
	# Stella: raggio lungo in avanti, corti ai lati
	var rays := [Vector2(26, 0), Vector2(-8, 0), Vector2(0, -12), Vector2(0, 12)]
	for r in rays:
		var w: Vector2 = (r as Vector2).normalized().orthogonal() * 2.5 * fade
		draw_colored_polygon(PackedVector2Array([w, r * (0.6 + 0.4 * fade), -w]), Color(IceFX.CORE, fade))
