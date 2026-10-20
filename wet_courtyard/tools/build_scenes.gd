extends SceneTree
## Rigenera le scene .tscn del progetto.
## Uso:  godot --headless --path . -s res://tools/build_scenes.gd
## Le scene generate si aprono e si modificano normalmente nell'editor:
## questo script serve solo a ricostruirle da zero (o come riferimento per
## vedere come ogni nodo è configurato).

const STONE := preload("res://shaders/wet_stone.gdshader")
const WATER := preload("res://shaders/magic_water.gdshader")
const RIM := preload("res://shaders/magic_rim.gdshader")
const RUNES := preload("res://shaders/rune_circle.gdshader")
const SOFT := preload("res://shaders/soft_particle.gdshader")
const MAGIC := preload("res://scripts/magic_circle.gd")
const FLICKER := preload("res://scripts/torch_flicker.gd")
const ORBIT := preload("res://scripts/orbit_camera.gd")
const CONTROLS := preload("res://scripts/scene_controls.gd")


func _initialize() -> void:
	_save(_build_water(), "res://effects/water_circle.tscn")
	_save(_build_runes(), "res://effects/rune_circle.tscn")
	_save(_build_main(), "res://main.tscn")
	quit()


# ---------------------------------------------------------------- utilità

func _save(root: Node, path: String) -> void:
	_own(root, root)
	var ps := PackedScene.new()
	ps.pack(root)
	var err := ResourceSaver.save(ps, path)
	print("%s -> %s" % [path, "ok" if err == OK else "ERRORE %d" % err])


func _own(node: Node, root: Node) -> void:
	for c in node.get_children():
		c.owner = root
		if c.scene_file_path == "":  # le istanze di altre scene restano chiuse
			_own(c, root)


func _mat(shader: Shader, params := {}) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = shader
	for k in params:
		m.set_shader_parameter(k, params[k])
	return m


func _mesh(name: String, mesh: Mesh, pos := Vector3.ZERO, material: Material = null) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = name
	mi.mesh = mesh
	mi.position = pos
	mi.material_override = material
	return mi


func _box(name: String, size: Vector3, pos: Vector3, material: Material) -> MeshInstance3D:
	var b := BoxMesh.new()
	b.size = size
	return _mesh(name, b, pos, material)


func _ramp(colors: Array, offsets: Array) -> GradientTexture1D:
	var g := Gradient.new()
	g.colors = PackedColorArray(colors)
	g.offsets = PackedFloat32Array(offsets)
	var t := GradientTexture1D.new()
	t.gradient = g
	return t


func _curve(points: Array) -> CurveTexture:
	var c := Curve.new()
	for p in points:
		c.add_point(p)
	var t := CurveTexture.new()
	t.curve = c
	return t


func _emissive(color: Color, energy: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = color
	m.emission_enabled = true
	m.emission = color
	m.emission_energy_multiplier = energy
	return m


func _particles(name: String, amount: int, lifetime: float, pm: ParticleProcessMaterial,
		quad_size: Vector2, material: Material, align: int) -> GPUParticles3D:
	var p := GPUParticles3D.new()
	p.name = name
	p.amount = amount
	p.lifetime = lifetime
	p.process_material = pm
	var q := QuadMesh.new()
	q.size = quad_size
	q.material = material
	p.draw_pass_1 = q
	p.transform_align = align
	p.visibility_aabb = AABB(Vector3(-14, -2, -14), Vector3(28, 14, 28))
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return p


# ------------------------------------------------------- effetto: acqua

func _build_water() -> Node3D:
	var root := Node3D.new()
	root.name = "WaterCircle"
	root.set_script(MAGIC)
	root.set("kind", 0)

	var plane := PlaneMesh.new()
	plane.size = Vector2(4.2, 4.2)
	var surface := _mesh("Surface", plane, Vector3(0, 0.035, 0), _mat(WATER))
	surface.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(surface)

	var cyl := CylinderMesh.new()
	cyl.top_radius = 2.05
	cyl.bottom_radius = 1.84
	cyl.height = 0.7
	cyl.radial_segments = 96
	cyl.rings = 4
	cyl.cap_top = false
	cyl.cap_bottom = false
	var rim := _mesh("Rim", cyl, Vector3(0, 0.35, 0),
		_mat(RIM, {"height_scale": 1.0 / 0.7, "flow_speed": 0.45, "turbulence": 1.0, "energy": 1.5}))
	rim.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(rim)

	# Bolle che salgono piano dalla superficie
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_RING
	pm.emission_ring_axis = Vector3.UP
	pm.emission_ring_height = 0.02
	pm.emission_ring_radius = 1.75
	pm.emission_ring_inner_radius = 0.0
	pm.direction = Vector3.UP
	pm.spread = 8.0
	pm.initial_velocity_min = 0.15
	pm.initial_velocity_max = 0.45
	pm.gravity = Vector3.ZERO
	pm.scale_min = 0.5
	pm.scale_max = 1.2
	pm.color_ramp = _ramp([Color(1, 1, 1, 0), Color(1, 1, 1, 0.9), Color(1, 1, 1, 0)], [0.0, 0.2, 1.0])
	root.add_child(_particles("Sparks", 36, 2.4, pm, Vector2(0.07, 0.07),
		_mat(SOFT, {"energy": 2.5, "softness": 1.4}), 1))

	# Tre sfere di luce che girano lungo il bordo
	var orbs := Node3D.new()
	orbs.name = "Orbs"
	for i in 3:
		var orb := Node3D.new()
		orb.name = "Orb%d" % i
		var s := SphereMesh.new()
		s.radius = 0.07
		s.height = 0.14
		orb.add_child(_mesh("Mesh", s, Vector3.ZERO, _emissive(Color(0.85, 0.97, 1.0), 5.0)))
		var l := OmniLight3D.new()
		l.name = "Light"
		l.omni_range = 3.2
		l.light_energy = 1.4
		l.light_color = Color(0.45, 0.8, 1.0)
		l.omni_attenuation = 1.6
		orb.add_child(l)
		orbs.add_child(orb)
	root.add_child(orbs)

	var light := OmniLight3D.new()
	light.name = "Light"
	light.position = Vector3(0, 0.7, 0)
	light.omni_range = 6.5
	light.omni_attenuation = 1.4
	light.light_energy = 2.2
	root.add_child(light)
	return root


# ------------------------------------------------ effetto: cerchio magico

func _build_runes() -> Node3D:
	var root := Node3D.new()
	root.name = "RuneCircle"
	root.set_script(MAGIC)
	root.set("kind", 1)

	var plane := PlaneMesh.new()
	plane.size = Vector2(5.0, 5.0)
	var surface := _mesh("Surface", plane, Vector3(0, 0.04, 0), _mat(RUNES, {"energy": 1.8}))
	surface.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(surface)

	var cyl := CylinderMesh.new()
	cyl.top_radius = 2.3
	cyl.bottom_radius = 2.12
	cyl.height = 0.8
	cyl.radial_segments = 96
	cyl.rings = 4
	cyl.cap_top = false
	cyl.cap_bottom = false
	var rim := _mesh("Rim", cyl, Vector3(0, 0.4, 0),
		_mat(RIM, {"height_scale": 1.0 / 0.8, "flow_speed": 0.9, "turbulence": 1.5, "energy": 1.5}))
	rim.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(rim)

	# Scintille: strisce verticali che salgono dal bordo
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_RING
	pm.emission_ring_axis = Vector3.UP
	pm.emission_ring_height = 0.05
	pm.emission_ring_radius = 2.15
	pm.emission_ring_inner_radius = 1.7
	pm.direction = Vector3.UP
	pm.spread = 10.0
	pm.initial_velocity_min = 1.0
	pm.initial_velocity_max = 2.8
	pm.gravity = Vector3(0, 0.4, 0)
	pm.scale_min = 0.5
	pm.scale_max = 1.2
	pm.color_ramp = _ramp([Color(1, 1, 1, 0), Color(1, 1, 1, 1), Color(1, 1, 1, 0)], [0.0, 0.15, 1.0])
	root.add_child(_particles("Sparks", 70, 1.3, pm, Vector2(0.035, 0.22),
		_mat(SOFT, {"energy": 3.5, "softness": 1.2, "streak": true}), 3))

	var light := OmniLight3D.new()
	light.name = "Light"
	light.position = Vector3(0, 0.8, 0)
	light.omni_range = 7.0
	light.omni_attenuation = 1.4
	light.light_energy = 2.2
	root.add_child(light)
	return root


# --------------------------------------------------------------- scena

func _build_main() -> Node3D:
	var root := Node3D.new()
	root.name = "Main"
	root.set_script(CONTROLS)

	root.add_child(_environment())
	root.add_child(_lights())
	root.add_child(_architecture())
	root.add_child(_hero())
	for t in _torches():
		root.add_child(t)
	root.add_child(_rain())

	var water: Node3D = load("res://effects/water_circle.tscn").instantiate()
	root.add_child(water)
	var rune: Node3D = load("res://effects/rune_circle.tscn").instantiate()
	root.add_child(rune)

	var cam := Camera3D.new()
	cam.name = "Camera"
	cam.set_script(ORBIT)
	cam.fov = 55.0
	cam.near = 0.1
	cam.far = 120.0
	root.add_child(cam)

	var ui := CanvasLayer.new()
	ui.name = "UI"
	var label := Label.new()
	label.name = "Label"
	label.position = Vector2(16, 12)
	var ls := LabelSettings.new()
	ls.font_size = 15
	ls.font_color = Color(0.85, 0.92, 1.0)
	ls.shadow_color = Color(0, 0, 0, 0.8)
	ls.shadow_size = 2
	ls.shadow_offset = Vector2(1, 1)
	label.label_settings = ls
	ui.add_child(label)
	root.add_child(ui)
	return root


func _environment() -> WorldEnvironment:
	var we := WorldEnvironment.new()
	we.name = "WorldEnvironment"
	var e := Environment.new()

	# Sfondo e luce ambiente: notte blu quasi nera
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.008, 0.012, 0.03)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.13, 0.19, 0.38)
	e.ambient_light_energy = 0.5

	# Tonemap ACES: comprime le alte luci in modo cinematografico
	e.tonemap_mode = Environment.TONE_MAPPER_ACES
	e.tonemap_exposure = 1.0
	e.tonemap_white = 6.0

	# Glow = bloom attorno a ciò che supera la soglia HDR (emissive, luci forti)
	e.glow_enabled = true
	e.glow_normalized = false
	e.glow_intensity = 0.55
	e.glow_strength = 1.1
	e.glow_bloom = 0.05
	e.glow_hdr_threshold = 1.15
	e.glow_hdr_scale = 1.6
	e.glow_blend_mode = Environment.GLOW_BLEND_MODE_SCREEN
	for i in 7:
		e.set_glow_level(i, 1.0 if i in [1, 2, 3, 4] else 0.0)

	# SSAO: ombre di contatto tra le pietre
	e.ssao_enabled = true
	e.ssao_radius = 1.0
	e.ssao_intensity = 2.2
	e.ssao_power = 1.6

	# SSR: riflessi del pavimento bagnato (solo Forward+)
	e.ssr_enabled = true
	e.ssr_max_steps = 96
	e.ssr_fade_in = 0.1
	e.ssr_fade_out = 2.0
	e.ssr_depth_tolerance = 0.25

	# Nebbia volumetrica: i fasci di luce delle torce e dell'effetto
	e.volumetric_fog_enabled = true
	e.volumetric_fog_density = 0.016
	e.volumetric_fog_albedo = Color(0.55, 0.65, 0.9)
	e.volumetric_fog_emission = Color(0.01, 0.02, 0.05)
	e.volumetric_fog_emission_energy = 1.0
	e.volumetric_fog_anisotropy = 0.55
	e.volumetric_fog_length = 40.0
	e.volumetric_fog_gi_inject = 1.0

	# Nebbia semplice a distanza (economica) per la profondità
	e.fog_enabled = true
	e.fog_light_color = Color(0.04, 0.07, 0.15)
	e.fog_density = 0.012

	# SDFGI: luce che rimbalza. Spento di default (pesante): premi 6 per provarlo
	e.sdfgi_enabled = false
	e.sdfgi_use_occlusion = true
	e.sdfgi_energy = 1.0

	e.adjustment_enabled = true
	e.adjustment_contrast = 1.12
	e.adjustment_saturation = 1.15

	we.environment = e
	we.camera_attributes = CameraAttributesPractical.new()
	return we


func _lights() -> Node3D:
	var n := Node3D.new()
	n.name = "Lights"
	var sun := DirectionalLight3D.new()
	sun.name = "Moon"
	sun.light_color = Color(0.42, 0.55, 1.0)
	sun.light_energy = 0.4
	sun.rotation_degrees = Vector3(-52, 28, 0)
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 40.0
	n.add_child(sun)

	# Bagliore blu dalla porta in fondo
	var door := OmniLight3D.new()
	door.name = "DoorGlow"
	door.position = Vector3(0, 2.4, -7.6)
	door.light_color = Color(0.25, 0.5, 1.0)
	door.light_energy = 3.5
	door.omni_range = 11.0
	door.omni_attenuation = 1.5
	n.add_child(door)
	return n


func _architecture() -> Node3D:
	var n := Node3D.new()
	n.name = "Architecture"

	var floor_mat := _mat(STONE, {"brick_size": Vector2(0.3, 0.19), "wetness": 0.95, "bump_strength": 1.0})
	var floor_plane := PlaneMesh.new()
	floor_plane.size = Vector2(60, 60)
	var floor_mi := _mesh("Floor", floor_plane, Vector3.ZERO, floor_mat)
	floor_mi.name = "Floor"
	n.add_child(floor_mi)

	var wall_mat := _mat(STONE, {"brick_size": Vector2(0.62, 0.3), "wetness": 0.45, "bump_strength": 1.8,
		"stone_dark": Color(0.055, 0.06, 0.085), "stone_light": Color(0.16, 0.17, 0.22)})
	n.add_child(_box("BackWall", Vector3(26, 7, 0.8), Vector3(0, 3.5, -9), wall_mat))
	n.add_child(_box("LeftWall", Vector3(0.8, 6, 20), Vector3(-11, 3, -1), wall_mat))
	n.add_child(_box("RightWall", Vector3(0.8, 6, 20), Vector3(11, 3, -1), wall_mat))
	for x in [-7.0, 7.0]:
		for z in [-7.8, -2.5, 3.0]:
			n.add_child(_box("Pillar", Vector3(0.9, 5.6, 0.9), Vector3(x, 2.8, z), wall_mat))

	# Porta in fondo: vano scuro con fessura luminosa
	n.add_child(_box("Doorway", Vector3(2.4, 3.8, 0.3), Vector3(0, 1.9, -8.55), _emissive(Color(0.0, 0.0, 0.0), 0.0)))
	n.add_child(_box("DoorSlit", Vector3(0.12, 0.7, 0.05), Vector3(0, 3.55, -8.38), _emissive(Color(0.5, 0.75, 1.0), 10.0)))

	# Stendardi rossi
	var cloth := StandardMaterial3D.new()
	cloth.albedo_color = Color(0.3, 0.015, 0.035)
	cloth.roughness = 0.92
	cloth.cull_mode = BaseMaterial3D.CULL_DISABLED
	for x in [-4.2, 4.2]:
		var q := QuadMesh.new()
		q.size = Vector2(1.3, 3.2)
		n.add_child(_mesh("Banner", q, Vector3(x, 3.4, -8.55), cloth))
	return n


func _hero() -> Node3D:
	var n := Node3D.new()
	n.name = "Hero"
	var armor := StandardMaterial3D.new()
	armor.albedo_color = Color(0.1, 0.12, 0.18)
	armor.metallic = 0.9
	armor.roughness = 0.28
	var accent := _emissive(Color(0.95, 0.05, 0.25), 2.5)

	for x in [-0.14, 0.14]:
		var leg := CapsuleMesh.new()
		leg.radius = 0.11
		leg.height = 0.95
		n.add_child(_mesh("Leg", leg, Vector3(x, 0.48, 0), armor))
		var arm := CapsuleMesh.new()
		arm.radius = 0.07
		arm.height = 0.75
		n.add_child(_mesh("Arm", arm, Vector3(x * 2.9, 1.15, 0), armor))
		var sh := SphereMesh.new()
		sh.radius = 0.16
		sh.height = 0.26
		n.add_child(_mesh("Shoulder", sh, Vector3(x * 2.5, 1.52, 0), armor))
		var horn := CylinderMesh.new()
		horn.top_radius = 0.0
		horn.bottom_radius = 0.035
		horn.height = 0.34
		var h := _mesh("Horn", horn, Vector3(x * 0.8, 1.93, 0), armor)
		h.rotation_degrees = Vector3(0, 0, -sign(x) * 18.0)
		n.add_child(h)

	var torso := CapsuleMesh.new()
	torso.radius = 0.22
	torso.height = 0.85
	n.add_child(_mesh("Torso", torso, Vector3(0, 1.2, 0), armor))
	var collar := CylinderMesh.new()
	collar.top_radius = 0.28
	collar.bottom_radius = 0.2
	collar.height = 0.14
	n.add_child(_mesh("Collar", collar, Vector3(0, 1.58, 0), accent))
	var head := SphereMesh.new()
	head.radius = 0.12
	head.height = 0.24
	n.add_child(_mesh("Head", head, Vector3(0, 1.74, 0), armor))
	return n


func _torches() -> Array:
	var out := []
	var positions := [Vector3(-5.2, 0, -6.2), Vector3(5.2, 0, -6.2), Vector3(-6.4, 0, 0.8), Vector3(6.4, 0, 0.8)]
	var metal := StandardMaterial3D.new()
	metal.albedo_color = Color(0.06, 0.055, 0.05)
	metal.metallic = 0.8
	metal.roughness = 0.45
	var i := 0
	for p in positions:
		var t := Node3D.new()
		t.name = "Torch%d" % i
		t.position = p
		var pole := CylinderMesh.new()
		pole.top_radius = 0.04
		pole.bottom_radius = 0.06
		pole.height = 1.5
		t.add_child(_mesh("Pole", pole, Vector3(0, 0.75, 0), metal))
		var bowl := CylinderMesh.new()
		bowl.top_radius = 0.2
		bowl.bottom_radius = 0.1
		bowl.height = 0.18
		t.add_child(_mesh("Bowl", bowl, Vector3(0, 1.58, 0), metal))

		var pm := ParticleProcessMaterial.new()
		pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
		pm.emission_sphere_radius = 0.07
		pm.direction = Vector3.UP
		pm.spread = 12.0
		pm.initial_velocity_min = 0.35
		pm.initial_velocity_max = 0.9
		pm.gravity = Vector3(0, 0.8, 0)
		pm.scale_min = 0.5
		pm.scale_max = 1.0
		pm.scale_curve = _curve([Vector2(0, 0.6), Vector2(0.25, 1.0), Vector2(1, 0.0)])
		pm.color_ramp = _ramp([Color(1, 0.95, 0.6, 0.0), Color(1, 0.7, 0.25, 0.9), Color(1, 0.3, 0.08, 0.5), Color(0.2, 0.03, 0.0, 0.0)],
			[0.0, 0.15, 0.6, 1.0])
		var fire := _particles("Flame", 36, 0.8, pm, Vector2(0.38, 0.5),
			_mat(SOFT, {"tint": Color(1, 0.6, 0.25), "energy": 3.2, "softness": 1.6}), 1)
		fire.position = Vector3(0, 1.72, 0)
		t.add_child(fire)

		var l := OmniLight3D.new()
		l.name = "FireLight"
		l.set_script(FLICKER)
		l.position = Vector3(0, 1.95, 0)
		l.light_color = Color(1.0, 0.55, 0.22)
		l.light_energy = 2.4
		l.omni_range = 7.5
		l.omni_attenuation = 1.5
		l.shadow_enabled = i < 2
		t.add_child(l)
		out.append(t)
		i += 1
	return out


func _rain() -> GPUParticles3D:
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(13, 0.1, 11)
	pm.direction = Vector3(0.05, -1, 0)
	pm.spread = 1.5
	pm.initial_velocity_min = 20.0
	pm.initial_velocity_max = 25.0
	pm.gravity = Vector3.ZERO
	var rain := _particles("Rain", 3500, 0.6, pm, Vector2(0.016, 0.6),
		_mat(SOFT, {"tint": Color(0.7, 0.85, 1.0), "energy": 2.2, "softness": 0.6, "streak": true}), 3)
	rain.position = Vector3(0, 9.5, -1)
	return rain
