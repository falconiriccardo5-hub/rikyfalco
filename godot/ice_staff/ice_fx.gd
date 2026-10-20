class_name IceFX
extends RefCounted
## Risorse condivise per i VFX di ghiaccio: palette, texture generate,
## materiali shader e costruttori di particelle/luci. Tutto procedurale:
## nessuna texture esterna da importare.

const CORE := Color(0.93, 0.99, 1.0)
const GLOW := Color(0.42, 0.78, 1.0)
const DEEP := Color(0.16, 0.42, 0.85)
const LIGHT_COLOR := Color(0.55, 0.8, 1.0)
const FROZEN_TINT := Color(0.74, 0.88, 1.12)

const CRYSTAL_SHADER := preload("shaders/ice_crystal.gdshader")
const CRYSTAL_LITE_SHADER := preload("shaders/ice_crystal_lite.gdshader")
const VAPOR_SHADER := preload("shaders/ice_vapor.gdshader")
const SPARKLE_SHADER := preload("shaders/ice_sparkle.gdshader")
const SHOCKWAVE_SHADER := preload("shaders/ice_shockwave.gdshader")
const FROST_DECAL_SHADER := preload("shaders/frost_decal.gdshader")
const FROST_CRUST_SHADER := preload("shaders/frost_crust.gdshader")

## Le texture generate sono 64x64: dimensione in pixel / TEX = scala.
const TEX := 64.0

static var _white: GradientTexture2D
static var _radial: GradientTexture2D
static var _additive: CanvasItemMaterial
static var _vapor: ShaderMaterial
static var _sparkle: ShaderMaterial


static func white_texture() -> Texture2D:
	if _white == null:
		var g := Gradient.new()
		g.set_color(0, Color.WHITE)
		g.set_color(1, Color.WHITE)
		_white = GradientTexture2D.new()
		_white.gradient = g
		_white.width = int(TEX)
		_white.height = int(TEX)
	return _white


static func radial_texture() -> Texture2D:
	if _radial == null:
		var g := Gradient.new()
		g.set_color(0, Color(1, 1, 1, 1))
		g.set_color(1, Color(0, 0, 0, 0))
		g.add_point(0.3, Color(0.45, 0.45, 0.45, 0.45))
		_radial = GradientTexture2D.new()
		_radial.gradient = g
		_radial.fill = GradientTexture2D.FILL_RADIAL
		_radial.fill_from = Vector2(0.5, 0.5)
		_radial.fill_to = Vector2(1.0, 0.5)
		_radial.width = 128
		_radial.height = 128
	return _radial


static func additive() -> CanvasItemMaterial:
	if _additive == null:
		_additive = CanvasItemMaterial.new()
		_additive.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		_additive.light_mode = CanvasItemMaterial.LIGHT_MODE_UNSHADED
	return _additive


static func vapor_material() -> ShaderMaterial:
	if _vapor == null:
		_vapor = ShaderMaterial.new()
		_vapor.shader = VAPOR_SHADER
	return _vapor


static func sparkle_material() -> ShaderMaterial:
	if _sparkle == null:
		_sparkle = ShaderMaterial.new()
		_sparkle.shader = SPARKLE_SHADER
	return _sparkle


## Materiale cristallo con parametri propri (seed, rotazione per la luce).
static func crystal_material(refract: bool, seed := randf() * 100.0) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = CRYSTAL_SHADER if refract else CRYSTAL_LITE_SHADER
	m.set_shader_parameter("seed", seed)
	return m


static func shader_material(shader: Shader) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = shader
	m.set_shader_parameter("seed", randf() * 100.0)
	return m


## Sprite quadrato bianco su cui lavora uno shader, grande `size_px`.
static func quad(material: Material, size_px: Vector2) -> Sprite2D:
	var s := Sprite2D.new()
	s.texture = white_texture()
	s.material = material
	s.scale = size_px / TEX
	return s


## Alone additivo morbido (finto bloom).
static func glow(size_px: float, color: Color) -> Sprite2D:
	var s := Sprite2D.new()
	s.texture = radial_texture()
	s.material = additive()
	s.modulate = color
	s.scale = Vector2.ONE * size_px / 128.0
	return s


## Luce 2D fredda: illumina pavimento, nemici e personaggio.
static func light(energy: float, scale: float) -> PointLight2D:
	var l := PointLight2D.new()
	l.texture = radial_texture()
	l.color = LIGHT_COLOR
	l.energy = energy
	l.texture_scale = scale
	return l


## Lampo di luce che si spegne da solo.
static func flash_light(parent: Node, at: Vector2, energy: float, scale: float, duration: float) -> void:
	var l := light(energy, scale)
	parent.add_child(l)
	l.global_position = at
	var tw := l.create_tween()
	tw.tween_property(l, "energy", 0.0, duration).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_EXPO)
	tw.tween_callback(l.queue_free)


static func _curve(a: float, b: float) -> Curve:
	var c := Curve.new()
	c.add_point(Vector2(0.0, a))
	c.add_point(Vector2(1.0, b))
	return c


static func _ramp(color: Color, peak: float, fade_in := 0.0) -> Gradient:
	var g := Gradient.new()
	g.set_color(0, Color(color, peak if fade_in <= 0.0 else 0.0))
	g.set_color(1, Color(color, 0.0))
	if fade_in > 0.0:
		g.add_point(fade_in, Color(color, peak))
	return g


static func _particles(material: Material, amount: int, lifetime: float) -> CPUParticles2D:
	var p := CPUParticles2D.new()
	p.texture = white_texture()
	p.material = material
	p.amount = maxi(amount, 1)
	p.lifetime = lifetime
	p.local_coords = false
	return p


## Emettitore continuo di vapore freddo (scia, sublimazione).
static func vapor_emitter(amount: int, lifetime: float, size_min: float, size_max: float,
		speed_min: float, speed_max: float, alpha := 0.5) -> CPUParticles2D:
	var p := _particles(vapor_material(), amount, lifetime)
	p.initial_velocity_min = speed_min
	p.initial_velocity_max = speed_max
	p.spread = 30.0
	p.direction = Vector2.LEFT
	p.gravity = Vector2.ZERO
	p.angle_min = -180.0
	p.angle_max = 180.0
	p.scale_amount_min = size_min / TEX
	p.scale_amount_max = size_max / TEX
	p.scale_amount_curve = _curve(0.5, 1.0)  # il vapore si espande
	p.color_ramp = _ramp(Color(0.82, 0.93, 1.0), alpha, 0.12)
	return p


## Emettitore continuo di micro-cristalli scintillanti.
static func sparkle_emitter(amount: int, lifetime: float, size_min: float, size_max: float) -> CPUParticles2D:
	var p := _particles(sparkle_material(), amount, lifetime)
	p.scale_amount_min = size_min / TEX
	p.scale_amount_max = size_max / TEX
	p.scale_amount_curve = _curve(1.0, 0.0)
	p.color_ramp = _ramp(Color(0.85, 0.96, 1.0), 1.0)
	return p


static func _one_shot(p: CPUParticles2D, parent: Node, at: Vector2) -> void:
	p.one_shot = true
	p.explosiveness = 1.0
	parent.add_child(p)
	p.global_position = at
	p.finished.connect(p.queue_free)
	p.emitting = true


## Sbuffo di vapore one-shot.
static func vapor_burst(parent: Node, at: Vector2, amount: int, speed_min: float, speed_max: float,
		lifetime: float, size_min: float, size_max: float, dir := Vector2.UP, spread := 180.0,
		alpha := 0.55) -> void:
	var p := vapor_emitter(amount, lifetime, size_min, size_max, speed_min, speed_max, alpha)
	p.direction = dir
	p.spread = spread
	p.damping_min = speed_min
	p.damping_max = speed_max
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = size_min * 0.3
	_one_shot(p, parent, at)


## Esplosione one-shot di polvere di ghiaccio scintillante.
static func sparkle_burst(parent: Node, at: Vector2, amount: int, speed_min: float, speed_max: float,
		lifetime: float, gravity_y: float, dir := Vector2.RIGHT, spread := 180.0,
		size_min := 6.0, size_max := 14.0) -> void:
	var p := sparkle_emitter(amount, lifetime, size_min, size_max)
	p.direction = dir
	p.spread = spread
	p.initial_velocity_min = speed_min
	p.initial_velocity_max = speed_max
	p.damping_min = speed_min * 0.8
	p.damping_max = speed_max * 0.8
	p.gravity = Vector2(0, gravity_y)
	_one_shot(p, parent, at)
