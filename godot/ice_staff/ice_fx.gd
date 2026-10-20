class_name IceFX
extends RefCounted
## Utility condivise per i VFX di ghiaccio: palette, materiale additivo e
## costruttori di particelle (CPUParticles2D, quindi funziona anche col
## renderer Compatibility / export web, senza texture esterne).

const CORE := Color(0.93, 0.99, 1.0)
const GLOW := Color(0.42, 0.78, 1.0)
const DEEP := Color(0.16, 0.42, 0.85)
const FROZEN_TINT := Color(0.62, 0.86, 1.35)


static func additive_material() -> CanvasItemMaterial:
	var mat := CanvasItemMaterial.new()
	mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	return mat


static func fade_gradient(start: Color, mid: Color) -> Gradient:
	var g := Gradient.new()
	g.set_color(0, start)
	g.set_color(1, Color(mid, 0.0))
	g.add_point(0.35, mid)
	return g


static func shrink_curve() -> Curve:
	var c := Curve.new()
	c.add_point(Vector2(0.0, 1.0))
	c.add_point(Vector2(1.0, 0.0))
	return c


## Esplosione singola di schegge (one-shot). Si auto-distrugge a fine emissione.
static func burst(parent: Node, at: Vector2, amount: int, speed_min: float, speed_max: float,
		size_min: float, size_max: float, lifetime: float, gravity_y := 0.0,
		dir := Vector2.RIGHT, spread := 180.0, color_a := CORE, color_b := GLOW) -> CPUParticles2D:
	var p := CPUParticles2D.new()
	p.one_shot = true
	p.explosiveness = 1.0
	p.amount = amount
	p.lifetime = lifetime
	p.local_coords = false
	p.direction = dir
	p.spread = spread
	p.initial_velocity_min = speed_min
	p.initial_velocity_max = speed_max
	p.gravity = Vector2(0, gravity_y)
	p.damping_min = speed_min * 0.6
	p.damping_max = speed_max * 0.9
	p.angular_velocity_min = -540.0
	p.angular_velocity_max = 540.0
	p.scale_amount_min = size_min
	p.scale_amount_max = size_max
	p.scale_amount_curve = shrink_curve()
	p.color_ramp = fade_gradient(color_a, color_b)
	p.material = additive_material()
	parent.add_child(p)
	p.global_position = at
	p.finished.connect(p.queue_free)
	p.emitting = true
	return p
