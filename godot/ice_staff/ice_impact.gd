class_name IceImpact
extends Node2D
## Frantumazione all'impatto: flash, onda d'urto ad anello, spuntoni di
## ghiaccio radiali, schegge che cadono con gravità e nuvoletta di brina.

@export var strength := 1.0
@export var duration := 0.4
var normal := Vector2.LEFT

var _t := 0.0
var _spikes: Array[Vector2] = []  # x = angolo, y = lunghezza


func _ready() -> void:
	var s := strength
	for i in 7:
		var a := TAU * i / 7.0 + randf_range(-0.25, 0.25)
		_spikes.append(Vector2(a, randf_range(10.0, 20.0) * s))

	var world := get_parent()
	# Schegge: veloci, ruotano e cadono
	IceFX.burst(world, global_position, int(18 * s), 90.0 * s, 260.0 * s,
		2.0 * s, 4.5 * s, 0.6, 420.0, normal, 110.0)
	# Brina: lenta e grande, poco opaca
	IceFX.burst(world, global_position, int(8 * s), 10.0, 45.0,
		6.0 * s, 11.0 * s, 0.55, -20.0, Vector2.UP, 180.0,
		Color(IceFX.CORE, 0.35), Color(IceFX.GLOW, 0.2))


func _process(delta: float) -> void:
	_t += delta
	if _t >= duration:
		queue_free()
		return
	queue_redraw()


func _draw() -> void:
	var k := _t / duration            # 0 -> 1
	var e := 1.0 - pow(1.0 - k, 3.0)  # ease-out
	var fade := 1.0 - k
	var s := strength

	# Flash iniziale
	if k < 0.3:
		draw_circle(Vector2.ZERO, 16.0 * s * (1.0 + k), Color(IceFX.CORE, (0.3 - k) * 2.5))

	# Onda d'urto
	draw_arc(Vector2.ZERO, 6.0 + 34.0 * s * e, 0.0, TAU, 40,
		Color(IceFX.GLOW, 0.8 * fade), maxf(4.0 * s * fade, 0.5))

	# Spuntoni che escono e poi si ritirano
	var grow := sin(clampf(k * 1.4, 0.0, 1.0) * PI)
	for sp in _spikes:
		var dir := Vector2.from_angle(sp.x)
		var side := dir.orthogonal() * 3.0 * s
		var tip := dir * sp.y * grow
		draw_colored_polygon(PackedVector2Array([side, tip, -side]),
			Color(IceFX.CORE.lerp(IceFX.GLOW, 0.4), fade))
