extends SceneTree
## Builder: genera tutte le scene del progetto (.tscn).
## Richiede gli asset Blender gia' esportati e importati: textures/flipbooks/*,
## models/*.glb e meshes/*.res (vedi tools/extract_meshes.gd).
##
##   godot --headless --path . --script res://tools/build_scenes.gd
##
## ATTENZIONE: rieseguirlo SOVRASCRIVE le scene in scenes/ e le modifiche fatte
## a mano nell'editor. Le scene generate sono la "fonte di verita'": modificale
## direttamente in Godot. Usa questo script solo per ripartire da zero o come
## riferimento di tutti i valori iniziali.

const SH_SPRITE := "res://shaders/vfx_particle_add.gdshader"
const SH_ARC := "res://shaders/arc_ring.gdshader"
const SH_GROUND := "res://shaders/ground_layer.gdshader"
const SH_ORB := "res://shaders/fresnel_orb.gdshader"
const SH_CRYSTAL := "res://shaders/ice_crystal.gdshader"
const SH_DISTORT := "res://shaders/screen_distortion.gdshader"
const SH_POST := "res://shaders/post_fx.gdshader"
const SH_TRAIL := "res://shaders/trail_mesh.gdshader"

const C_ICE := Color(0.8, 0.88, 0.97)
const C_DEEP := Color(0.5, 0.63, 0.86)
const C_WHITE := Color(0.95, 0.97, 1.0)
const C_FROST := Color(0.6, 0.73, 0.92)

const BIG_AABB := AABB(Vector3(-12, -2, -12), Vector3(24, 16, 24))

var noise: Texture2D


func _initialize() -> void:
	noise = tex("noise_fbm")
	DirAccess.make_dir_recursive_absolute("res://scenes/vfx")

	save_scene(build_target_flares(), "res://scenes/vfx/target_flares.tscn")
	save_scene(build_cast_frost(), "res://scenes/vfx/cast_frost.tscn")
	save_scene(build_ice_orb(), "res://scenes/vfx/ice_orb.tscn")
	save_scene(build_impact(), "res://scenes/vfx/impact_burst.tscn")
	save_scene(build_ring_orb(), "res://scenes/vfx/ring_orb.tscn")
	save_scene(build_magic_circle(), "res://scenes/vfx/magic_circle.tscn")
	save_scene(build_charge_core(), "res://scenes/vfx/charge_core.tscn")
	save_scene(build_detonation(), "res://scenes/vfx/detonation.tscn")
	save_scene(build_crystal_eruption(), "res://scenes/vfx/crystal_eruption.tscn")
	save_scene(build_ice_ultimate(), "res://scenes/ice_ultimate.tscn")
	save_scene(build_demo(), "res://scenes/demo.tscn")
	print("Scene generate.")
	quit()


# =============================================================== helpers
func tex(n: String) -> Texture2D:
	return load("res://textures/%s.png" % n)


func smat(shader_path: String, params: Dictionary) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = load(shader_path)
	m.resource_local_to_scene = true
	for k in params:
		m.set_shader_parameter(k, params[k])
	return m


func sprite_mat(t: String, color: Color, inten: float, bb := 1, angle := false, spin := 0.0) -> ShaderMaterial:
	return smat(SH_SPRITE, {
		"albedo_tex": tex(t), "color": color, "intensity": inten,
		"billboard_mode": bb, "use_particle_angle": angle, "spin_speed": spin,
		"erosion_noise": noise,
	})


func mesh(n: String) -> Mesh:
	return load("res://meshes/%s.res" % n)


## Sprite animato da flipbook 8x8 renderizzato in Blender (blender/flipbooks.py).
func flipbook_mat(fb: String, color: Color, inten: float, soft := 1.2) -> ShaderMaterial:
	var m := sprite_mat("flipbooks/%s_8x8" % fb, color, inten, 1, true)
	m.set_shader_parameter("flipbook_grid", Vector2(8, 8))
	m.set_shader_parameter("soft_distance", soft)
	return m


func smoke_mat(inten := 1.0, fb := "smoke_puff") -> ShaderMaterial:
	return flipbook_mat(fb, C_ICE, inten)


## Scia su mesh Blender (nastro a spirale / mezzaluna) con trail_mesh.gdshader.
func trail(parent: Node, nm: String, mesh_name: String, params: Dictionary, xf := Transform3D.IDENTITY) -> MeshInstance3D:
	var p := {"noise_tex": noise, "color": C_ICE, "intensity": 0.0}
	p.merge(params, true)
	var mi := mesh_node(parent, nm, mesh(mesh_name), smat(SH_TRAIL, p))
	mi.transform = xf
	return mi


func add(parent: Node, node: Node, nm: String) -> Node:
	node.name = nm
	parent.add_child(node)
	return node


func with_script(node: Node, path: String) -> Node:
	node.set_script(load(path))
	return node


func mesh_node(parent: Node, nm: String, mesh: Mesh, mat: Material, pos := Vector3.ZERO) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add(parent, mi, nm)
	return mi


func quad(w: float, h := -1.0) -> QuadMesh:
	var q := QuadMesh.new()
	q.size = Vector2(w, w if h < 0.0 else h)
	return q


func plane(s: float) -> PlaneMesh:
	var p := PlaneMesh.new()
	p.size = Vector2(s, s)
	return p


func sprite(parent: Node, nm: String, t: String, size: float, color: Color, inten: float, pos := Vector3.ZERO, spin := 0.0) -> MeshInstance3D:
	return mesh_node(parent, nm, quad(size), sprite_mat(t, color, inten, 1, false, spin), pos)


func ground(parent: Node, nm: String, t: String, size: float, color: Color, inten: float, y: float, extra := {}) -> MeshInstance3D:
	var p := {"layer_tex": tex(t), "noise_tex": noise, "color": color, "intensity": inten}
	p.merge(extra, true)
	return mesh_node(parent, nm, plane(size), smat(SH_GROUND, p), Vector3(0, y, 0))


func arc(parent: Node, nm: String, size: float, params: Dictionary, rot_deg := Vector3.ZERO, pos := Vector3.ZERO) -> MeshInstance3D:
	var p := {"color": C_ICE, "intensity": 0.0}
	p.merge(params, true)
	var mi := mesh_node(parent, nm, quad(size), smat(SH_ARC, p), pos)
	mi.rotation_degrees = rot_deg
	return mi


func orb_mesh(r: float) -> SphereMesh:
	var s := SphereMesh.new()
	s.radius = r
	s.height = r * 2.0
	s.radial_segments = 48
	s.rings = 24
	return s


func grad(points: Array) -> GradientTexture1D:
	var g := Gradient.new()
	var offs := PackedFloat32Array()
	var cols := PackedColorArray()
	for p in points:
		offs.append(p[0])
		cols.append(p[1])
	g.offsets = offs
	g.colors = cols
	var gt := GradientTexture1D.new()
	gt.gradient = g
	return gt


func curve(points: Array) -> CurveTexture:
	var c := Curve.new()
	for p in points:
		c.add_point(Vector2(p[0], p[1]))
	var ct := CurveTexture.new()
	ct.curve = c
	return ct


func ppm(props: Dictionary) -> ParticleProcessMaterial:
	var m := ParticleProcessMaterial.new()
	m.gravity = Vector3.ZERO
	for k in props:
		m.set(k, props[k])
	return m


## Crea un GPUParticles3D. cfg: amount, lifetime, one_shot, explosiveness,
## randomness, local, process (ParticleProcessMaterial), mesh, mat, pos.
func particles(parent: Node, nm: String, cfg: Dictionary) -> GPUParticles3D:
	var p := GPUParticles3D.new()
	p.amount = cfg.get("amount", 32)
	p.lifetime = cfg.get("lifetime", 1.0)
	p.one_shot = cfg.get("one_shot", false)
	p.explosiveness = cfg.get("explosiveness", 0.0)
	p.randomness = cfg.get("randomness", 0.3)
	p.local_coords = cfg.get("local", false)
	p.emitting = cfg.get("emitting", false)
	p.fixed_fps = 0
	p.visibility_aabb = BIG_AABB
	p.process_material = cfg["process"]
	# flipbook: il frame scorre su tutta la vita della particella
	var fg = cfg["mat"].get_shader_parameter("flipbook_grid")
	if fg is Vector2 and fg.x * fg.y > 1.0:
		cfg["process"].anim_speed_min = 1.0
		cfg["process"].anim_speed_max = 1.0
	p.draw_pass_1 = cfg.get("mesh", quad(0.2))
	p.material_override = cfg["mat"]
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	p.position = cfg.get("pos", Vector3.ZERO)
	add(parent, p, nm)
	return p


func fade_ramp(c: Color, peak := 1.0) -> GradientTexture1D:
	return grad([[0.0, Color(c, 0.0)], [0.1, Color(c, peak)], [0.6, Color(c, peak * 0.6)], [1.0, Color(c, 0.0)]])


func spark_ramp() -> GradientTexture1D:
	return grad([[0.0, Color(1, 1, 1, 1)], [0.35, Color(C_ICE, 0.9)], [1.0, Color(C_DEEP, 0.0)]])


func pop_curve() -> CurveTexture:
	return curve([[0.0, 0.0], [0.15, 1.0], [1.0, 0.3]])


func instance(parent: Node, path: String, nm: String, pos := Vector3.ZERO) -> Node3D:
	var n: Node3D = load(path).instantiate(PackedScene.GEN_EDIT_STATE_INSTANCE)
	n.position = pos
	add(parent, n, nm)
	return n


func save_scene(root: Node, path: String) -> void:
	_own(root, root)
	var ps := PackedScene.new()
	var err := ps.pack(root)
	assert(err == OK)
	err = ResourceSaver.save(ps, path)
	print("  ", path, " -> ", error_string(err))
	root.free()


func _own(node: Node, root: Node) -> void:
	for c in node.get_children():
		c.owner = root
		if c.scene_file_path.is_empty():
			_own(c, root)


func module_root(nm: String, script: String) -> Node3D:
	var r := Node3D.new()
	r.name = nm
	with_script(r, script)
	return r


# =============================================================== modules
func build_target_flares() -> Node3D:
	var root := module_root("TargetFlares", "res://scripts/target_flares.gd")
	var red := Color(1.0, 0.12, 0.08)
	var spots := [Vector3(-3.4, 1.1, -3.0), Vector3(0.4, 1.0, -5.0), Vector3(2.6, 1.2, -3.6)]
	for i in spots.size():
		var g := Node3D.new()
		add(root, g, "Target%d" % (i + 1))
		g.position = spots[i]
		sprite(g, "Star", "star_flare", 1.4, red, 0.0)
		mesh_node(g, "Streak", quad(7.0, 0.7), sprite_mat("anamorphic_flare", red, 0.0), Vector3.ZERO)
	return root


func build_cast_frost() -> Node3D:
	var root := module_root("CastFrost", "res://scripts/cast_frost.gd")
	ground(root, "FrostDecal", "frost_ground", 5.5, C_FROST, 1.1, 0.02,
		{"reveal": 0.0, "edge_boost": 2.5, "noise_amount": 0.18})
	ground(root, "Cracks", "ground_cracks", 4.5, C_ICE, 2.4, 0.03, {"reveal": 0.0, "edge_boost": 1.5})
	sprite(root, "Snowflake", "snowflake", 1.3, C_WHITE, 0.0, Vector3(-0.5, 1.7, -0.4), 1.4)
	sprite(root, "Glow", "soft_glow", 2.6, C_DEEP, 0.0, Vector3(-0.5, 1.6, -0.4))
	var sw := Node3D.new()
	add(root, sw, "Swirl")
	trail(sw, "ArcA", "swirl_ribbon", {"auto_speed": 0.9, "trail_length": 0.7}, Transform3D(Basis.from_scale(Vector3(1.9, 2.2, 1.9)), Vector3(0, 0.05, 0)))
	trail(sw, "ArcB", "swirl_ribbon", {"auto_speed": 1.2, "trail_length": 0.5, "edge_power": 2.5}, Transform3D(Basis(Vector3.UP, 2.1).scaled(Vector3(1.4, 1.9, 1.4)), Vector3(0, 0.3, 0)))
	trail(sw, "ArcC", "swirl_ribbon", {"auto_speed": 0.7, "trail_length": 0.6, "edge_power": 3.0}, Transform3D(Basis(Vector3.UP, 4.2).scaled(Vector3(2.4, 1.4, 2.4)), Vector3(0, 0.0, 0)))
	particles(root, "Sparks", {
		"amount": 70, "lifetime": 0.9, "one_shot": true, "explosiveness": 0.9,
		"pos": Vector3(0, 0.9, 0),
		"process": ppm({
			"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_SPHERE, "emission_sphere_radius": 0.4,
			"direction": Vector3.UP, "spread": 120.0, "initial_velocity_min": 3.0, "initial_velocity_max": 8.0,
			"gravity": Vector3(0, -5, 0), "damping_min": 3.0, "damping_max": 5.0,
			"particle_flag_align_y": true, "scale_min": 0.6, "scale_max": 1.2,
			"color_ramp": spark_ramp(),
		}),
		"mesh": quad(0.05, 0.55), "mat": sprite_mat("spark_streak", C_WHITE, 4.0, 2),
	})
	particles(root, "Mist", {
		"amount": 24, "lifetime": 1.8,
		"process": ppm({
			"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_RING, "emission_ring_radius": 1.3,
			"emission_ring_inner_radius": 0.3, "emission_ring_height": 0.2, "emission_ring_axis": Vector3.UP,
			"direction": Vector3(1, 0.2, 0), "spread": 180.0, "flatness": 0.8,
			"initial_velocity_min": 0.2, "initial_velocity_max": 0.8,
			"angle_min": -180.0, "angle_max": 180.0, "angular_velocity_min": -30.0, "angular_velocity_max": 30.0,
			"scale_min": 1.4, "scale_max": 2.6, "scale_curve": curve([[0, 0.5], [1, 1]]),
			"color_ramp": fade_ramp(Color(0.75, 0.85, 1.0), 0.4),
		}),
		"mesh": quad(1.0), "mat": smoke_mat(1.0),
	})
	particles(root, "Dust", {
		"amount": 50, "lifetime": 1.2,
		"process": ppm({
			"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_BOX, "emission_box_extents": Vector3(1.3, 0.2, 1.3),
			"direction": Vector3.UP, "spread": 25.0, "initial_velocity_min": 0.5, "initial_velocity_max": 2.0,
			"scale_min": 0.5, "scale_max": 1.3, "scale_curve": pop_curve(), "color_ramp": spark_ramp(),
		}),
		"mesh": quad(0.08), "mat": sprite_mat("soft_glow", C_WHITE, 4.0),
	})
	return root


func build_ice_orb() -> Node3D:
	var root := module_root("IceOrb", "res://scripts/ice_orb.gd")
	mesh_node(root, "Core", orb_mesh(0.3), smat(SH_ORB, {"noise_tex": noise, "intensity": 0.0, "iridescence": 0.5, "core_amount": 0.6}))
	sprite(root, "Glow", "soft_glow", 2.2, C_ICE, 0.0)
	sprite(root, "Snowflake", "snowflake", 1.0, C_WHITE, 0.0, Vector3.ZERO, 2.5)
	var arcs := Node3D.new()
	add(root, arcs, "Arcs")
	arc(arcs, "ArcA", 1.5, {"radius": 0.42, "thickness": 0.02, "arc_length": 0.45, "spin_speed": 1.8, "chroma_fringe": 0.004})
	arc(arcs, "ArcB", 1.3, {"radius": 0.42, "thickness": 0.025, "arc_length": 0.35, "spin_speed": -2.4, "arc_offset": 0.4}, Vector3(70, 20, 0))
	arc(arcs, "ArcC", 1.8, {"radius": 0.42, "thickness": 0.015, "arc_length": 0.3, "spin_speed": 1.2, "arc_offset": 0.7, "chroma_fringe": 0.006}, Vector3(20, 80, 40))
	trail(arcs, "RibbonA", "swirl_ribbon", {"auto_speed": 1.8, "trail_length": 0.6}, Transform3D(Basis.from_scale(Vector3(1.3, 1.1, 1.3)), Vector3(0, -0.55, 0)))
	trail(arcs, "RibbonB", "swirl_ribbon", {"auto_speed": 2.3, "trail_length": 0.5, "edge_power": 2.5}, Transform3D(Basis(Vector3.RIGHT, PI * 0.5).scaled(Vector3(1.1, 1.0, 1.1)), Vector3(0, 0, -0.5)))
	particles(root, "Trail", {
		"amount": 90, "lifetime": 0.9,
		"process": ppm({
			"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_SPHERE, "emission_sphere_radius": 0.35,
			"direction": Vector3.UP, "spread": 180.0, "initial_velocity_min": 0.3, "initial_velocity_max": 1.2,
			"gravity": Vector3(0, -1.0, 0), "scale_min": 0.5, "scale_max": 1.4,
			"scale_curve": pop_curve(), "color_ramp": spark_ramp(),
		}),
		"mesh": quad(0.09), "mat": sprite_mat("soft_glow", C_WHITE, 4.0),
	})
	particles(root, "MistTrail", {
		"amount": 30, "lifetime": 1.0,
		"process": ppm({
			"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_SPHERE, "emission_sphere_radius": 0.25,
			"angle_min": -180.0, "angle_max": 180.0, "scale_min": 0.8, "scale_max": 1.6,
			"scale_curve": curve([[0, 0.4], [1, 1]]), "color_ramp": fade_ramp(C_ICE, 0.25),
		}),
		"mesh": quad(1.0), "mat": smoke_mat(1.0),
	})
	return root


func build_impact() -> Node3D:
	var root := module_root("ImpactBurst", "res://scripts/impact_burst.gd")
	sprite(root, "Flash", "star_flare", 4.5, C_WHITE, 0.0)
	sprite(root, "Glow", "soft_glow", 5.0, C_ICE, 0.0)
	var rings := Node3D.new()
	add(root, rings, "Rings")
	var rots := [Vector3(0, 0, 0), Vector3(90, 0, 0), Vector3(40, 60, 0), Vector3(-30, -50, 20)]
	for i in rots.size():
		arc(rings, "Ring%d" % (i + 1), 1.0, {"radius": 0.45, "thickness": 0.03, "arc_length": 0.7, "spin_speed": 0.6, "arc_offset": i * 0.25, "chroma_fringe": 0.008}, rots[i])
	particles(root, "Sparks", {
		"amount": 90, "lifetime": 0.7, "one_shot": true, "explosiveness": 0.95,
		"process": ppm({
			"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_SPHERE, "emission_sphere_radius": 0.3,
			"spread": 180.0, "initial_velocity_min": 4.0, "initial_velocity_max": 11.0,
			"damping_min": 6.0, "damping_max": 10.0, "particle_flag_align_y": true,
			"scale_min": 0.6, "scale_max": 1.3, "color_ramp": spark_ramp(),
		}),
		"mesh": quad(0.06, 0.8), "mat": sprite_mat("spark_streak", C_WHITE, 5.0, 2),
	})
	particles(root, "Smoke", {
		"amount": 20, "lifetime": 1.8, "one_shot": true, "explosiveness": 0.9,
		"process": ppm({
			"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_SPHERE, "emission_sphere_radius": 0.5,
			"spread": 180.0, "initial_velocity_min": 1.0, "initial_velocity_max": 3.0, "damping_min": 2.0, "damping_max": 3.0,
			"angle_min": -180.0, "angle_max": 180.0, "scale_min": 2.0, "scale_max": 3.5,
			"scale_curve": curve([[0, 0.4], [1, 1]]), "color_ramp": fade_ramp(Color(0.8, 0.88, 1.0), 0.35),
		}),
		"mesh": quad(1.0), "mat": smoke_mat(1.2),
	})
	particles(root, "Explosion", {
		"amount": 4, "lifetime": 1.1, "one_shot": true, "explosiveness": 0.9,
		"process": ppm({
			"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_SPHERE, "emission_sphere_radius": 0.3,
			"spread": 180.0, "initial_velocity_min": 0.5, "initial_velocity_max": 1.5, "damping_min": 1.0, "damping_max": 2.0,
			"angle_min": -180.0, "angle_max": 180.0, "scale_min": 2.6, "scale_max": 3.6,
			"color_ramp": fade_ramp(C_WHITE, 1.0),
		}),
		"mesh": quad(1.0), "mat": flipbook_mat("explosion", C_ICE, 0.6, 0.8),
	})
	particles(root, "Flakes", {
		"amount": 24, "lifetime": 1.2, "one_shot": true, "explosiveness": 0.9,
		"process": ppm({
			"spread": 180.0, "initial_velocity_min": 2.0, "initial_velocity_max": 5.0, "gravity": Vector3(0, -2, 0),
			"damping_min": 2.0, "damping_max": 3.0, "angle_min": -180.0, "angle_max": 180.0,
			"angular_velocity_min": -200.0, "angular_velocity_max": 200.0, "scale_min": 0.5, "scale_max": 1.0,
			"color_ramp": spark_ramp(),
		}),
		"mesh": quad(0.3), "mat": sprite_mat("snowflake", C_WHITE, 3.0, 1, true),
	})
	return root


func build_ring_orb() -> Node3D:
	var root := module_root("RingOrb", "res://scripts/ring_orb.gd")
	mesh_node(root, "Bubble", orb_mesh(0.45), smat(SH_ORB, {"noise_tex": noise, "intensity": 0.0, "iridescence": 0.7, "core_amount": 0.15, "rim_power": 3.0}))
	arc(root, "ArcA", 1.25, {"radius": 0.4, "thickness": 0.04, "arc_length": 0.45, "spin_speed": 1.1, "billboard": true, "chroma_fringe": 0.006, "color": C_WHITE})
	arc(root, "ArcB", 1.15, {"radius": 0.42, "thickness": 0.015, "arc_length": 0.7, "spin_speed": -0.7, "billboard": true})
	sprite(root, "Glow", "soft_glow", 1.8, C_ICE, 0.0)
	return root


func build_magic_circle() -> Node3D:
	var root := module_root("MagicCircle", "res://scripts/magic_circle.gd")
	ground(root, "Glow", "soft_glow", 9.0, C_DEEP, 0.0, 0.01)
	ground(root, "Outer", "sigil_outer", 7.0, C_ICE, 0.0, 0.03, {"reveal": 0.0, "edge_boost": 4.0, "edge_width": 0.05, "noise_amount": 0.06, "pulse_speed": 1.5, "pulse_amount": 0.12})
	ground(root, "Taiji", "sigil_taiji", 3.0, C_ICE, 0.0, 0.04, {"reveal": 0.0, "edge_boost": 3.0})
	particles(root, "Mist", {
		"amount": 64, "lifetime": 2.4,
		"process": ppm({
			"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_RING, "emission_ring_radius": 3.6,
			"emission_ring_inner_radius": 2.2, "emission_ring_height": 0.2, "emission_ring_axis": Vector3.UP,
			"direction": Vector3(1, 0.3, 0), "spread": 180.0, "flatness": 0.7,
			"initial_velocity_min": 0.2, "initial_velocity_max": 0.6,
			"angle_min": -180.0, "angle_max": 180.0, "angular_velocity_min": -20.0, "angular_velocity_max": 20.0,
			"scale_min": 2.0, "scale_max": 3.6, "scale_curve": curve([[0, 0.5], [1, 1]]),
			"color_ramp": fade_ramp(Color(0.8, 0.88, 1.0), 0.45),
		}),
		"mesh": quad(1.0), "mat": smoke_mat(1.7, "frost_cloud"),
	})
	particles(root, "Streaks", {
		"amount": 36, "lifetime": 0.75, "pos": Vector3(0, 1.3, 0),
		"process": ppm({
			"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_SPHERE, "emission_sphere_radius": 0.5,
			"direction": Vector3.UP, "spread": 80.0, "initial_velocity_min": 5.0, "initial_velocity_max": 9.0,
			"damping_min": 5.0, "damping_max": 8.0, "particle_flag_align_y": true,
			"scale_min": 0.7, "scale_max": 1.3, "scale_curve": curve([[0, 0.3], [0.2, 1], [1, 0.6]]),
			"color_ramp": spark_ramp(),
		}),
		"mesh": quad(0.12, 1.1), "mat": sprite_mat("spark_streak", C_WHITE, 5.0, 2),
	})
	particles(root, "EdgeSparks", {
		"amount": 70, "lifetime": 0.9,
		"process": ppm({
			"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_RING, "emission_ring_radius": 3.4,
			"emission_ring_inner_radius": 2.9, "emission_ring_height": 0.05, "emission_ring_axis": Vector3.UP,
			"direction": Vector3.UP, "spread": 20.0, "initial_velocity_min": 0.8, "initial_velocity_max": 2.5,
			"scale_min": 0.5, "scale_max": 1.2, "scale_curve": pop_curve(), "color_ramp": spark_ramp(),
		}),
		"mesh": quad(0.08), "mat": sprite_mat("soft_glow", C_WHITE, 5.0),
	})
	return root


func build_charge_core() -> Node3D:
	var root := module_root("ChargeCore", "res://scripts/charge_core.gd")
	mesh_node(root, "Bubble", orb_mesh(1.1), smat(SH_ORB, {"noise_tex": noise, "intensity": 0.0, "rim_power": 3.0, "core_amount": 0.12, "iridescence": 0.35}))
	var dark_mat := StandardMaterial3D.new()
	dark_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	dark_mat.albedo_color = Color(0.02, 0.025, 0.035)
	mesh_node(root, "Dark", orb_mesh(0.32), dark_mat)
	sprite(root, "Glow", "soft_glow", 3.2, C_ICE, 0.0)
	var cr := Node3D.new()
	add(root, cr, "Crescents")
	for i in 3:
		var b := Basis(Vector3.UP, i * TAU / 3.0) * Basis(Vector3.RIGHT, deg_to_rad(-20.0 + i * 15.0))
		trail(cr, "Crescent%d" % (i + 1), "crescent", {"auto_speed": 0.8 + i * 0.25, "trail_length": 0.9, "edge_power": 1.0, "color": C_WHITE},
			Transform3D(b.scaled(Vector3.ONE * (3.4 + i * 0.4)), Vector3.ZERO))
	return root


func build_detonation() -> Node3D:
	var root := module_root("Detonation", "res://scripts/detonation.gd")
	ground(root, "FrostWave", "frost_ground", 16.0, C_FROST, 1.5, 0.05, {"reveal": 0.0, "edge_boost": 3.5, "noise_amount": 0.25})
	var sw := mesh_node(root, "Shockwave", plane(20.0), smat(SH_DISTORT, {"progress": 0.0, "strength": 0.05, "ring_width": 0.1}), Vector3(0, 0.15, 0))
	sw.visible = false
	sprite(root, "Glow", "soft_glow", 9.0, C_ICE, 0.0, Vector3(0, 1.3, 0))
	sprite(root, "Flash", "star_flare", 10.0, C_WHITE, 0.0, Vector3(0, 1.5, 0))
	mesh_node(root, "Anamorphic", quad(18.0, 1.6), sprite_mat("anamorphic_flare", Color(0.6, 0.8, 1.0), 0.0), Vector3(0, 1.5, 0))
	var loops := Node3D.new()
	add(root, loops, "Loops")
	loops.position = Vector3(0, 1.6, 0)
	for i in 6:
		arc(loops, "Loop%d" % (i + 1), 3.2, {"radius": 0.4, "thickness": 0.012, "arc_length": 0.8, "spin_speed": 1.4, "arc_offset": i * 0.17, "chroma_fringe": 0.008, "color": C_WHITE},
			Vector3(15.0 * (i % 3), i * 30.0, 0), Vector3(cos(i * 1.05) * 0.8, 0.3 * (i % 2), sin(i * 1.05) * 0.8))
	particles(root, "Debris", {
		"amount": 160, "lifetime": 1.6, "one_shot": true, "explosiveness": 0.95, "pos": Vector3(0, 1.2, 0),
		"process": ppm({
			"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_SPHERE, "emission_sphere_radius": 0.8,
			"spread": 180.0, "initial_velocity_min": 6.0, "initial_velocity_max": 16.0, "gravity": Vector3(0, -3, 0),
			"damping_min": 6.0, "damping_max": 9.0, "scale_min": 0.6, "scale_max": 1.6,
			"scale_curve": pop_curve(), "color_ramp": spark_ramp(),
		}),
		"mesh": quad(0.13), "mat": sprite_mat("soft_glow", C_WHITE, 6.0),
	})
	particles(root, "Shards", {
		"amount": 40, "lifetime": 1.4, "one_shot": true, "explosiveness": 0.95, "pos": Vector3(0, 1.0, 0),
		"process": ppm({
			"spread": 180.0, "initial_velocity_min": 5.0, "initial_velocity_max": 12.0, "gravity": Vector3(0, -9, 0),
			"damping_min": 1.0, "damping_max": 2.0, "angle_min": -180.0, "angle_max": 180.0,
			"angular_velocity_min": -360.0, "angular_velocity_max": 360.0, "scale_min": 0.6, "scale_max": 1.4,
			"color_ramp": spark_ramp(),
		}),
		"mesh": quad(0.35), "mat": sprite_mat("ice_shard", C_WHITE, 3.0, 1, true),
	})
	particles(root, "Streaks", {
		"amount": 110, "lifetime": 0.6, "one_shot": true, "explosiveness": 1.0, "pos": Vector3(0, 1.2, 0),
		"process": ppm({
			"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_SPHERE, "emission_sphere_radius": 0.5,
			"spread": 180.0, "initial_velocity_min": 10.0, "initial_velocity_max": 22.0,
			"damping_min": 12.0, "damping_max": 18.0, "particle_flag_align_y": true,
			"scale_min": 0.7, "scale_max": 1.5, "color_ramp": spark_ramp(),
		}),
		"mesh": quad(0.08, 1.5), "mat": sprite_mat("spark_streak", C_WHITE, 6.0, 2),
	})
	particles(root, "Explosion", {
		"amount": 8, "lifetime": 1.6, "one_shot": true, "explosiveness": 0.95, "pos": Vector3(0, 1.4, 0),
		"process": ppm({
			"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_SPHERE, "emission_sphere_radius": 0.9,
			"spread": 180.0, "initial_velocity_min": 1.5, "initial_velocity_max": 3.5, "damping_min": 2.0, "damping_max": 3.0,
			"angle_min": -180.0, "angle_max": 180.0, "scale_min": 4.5, "scale_max": 6.5,
			"color_ramp": fade_ramp(C_WHITE, 1.0),
		}),
		"mesh": quad(1.0), "mat": flipbook_mat("explosion", C_ICE, 0.9, 1.0),
	})
	var dome := mesh_node(root, "Dome", mesh("shock_dome"), smat(SH_ORB, {"noise_tex": noise, "intensity": 0.0, "rim_power": 2.0, "core_amount": 0.05, "iridescence": 0.5}))
	dome.material_override.render_priority = 1
	dome.visible = false
	particles(root, "SmokeRing", {
		"amount": 34, "lifetime": 2.2, "one_shot": true, "explosiveness": 0.95, "pos": Vector3(0, 0.3, 0),
		"process": ppm({
			"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_SPHERE, "emission_sphere_radius": 0.6,
			"direction": Vector3(1, 0, 0), "spread": 180.0, "flatness": 1.0,
			"initial_velocity_min": 4.0, "initial_velocity_max": 8.0, "damping_min": 3.0, "damping_max": 5.0,
			"angle_min": -180.0, "angle_max": 180.0, "scale_min": 3.0, "scale_max": 5.0,
			"scale_curve": curve([[0, 0.4], [1, 1]]), "color_ramp": fade_ramp(Color(0.8, 0.9, 1.0), 0.45),
		}),
		"mesh": quad(1.0), "mat": smoke_mat(1.3, "frost_cloud"),
	})
	return root


func build_crystal_eruption() -> Node3D:
	var root := module_root("CrystalEruption", "res://scripts/crystal_eruption.gd")
	ground(root, "Frost", "frost_ground", 9.0, C_FROST, 1.0, 0.04, {"reveal": 0.0, "edge_boost": 1.0})
	ground(root, "Cracks", "ground_cracks", 12.0, C_ICE, 1.0, 0.05, {"reveal": 0.0, "edge_boost": 2.0, "noise_amount": 0.2})
	var ice_params := {"noise_tex": noise, "grow": 0.0, "tint": Color(0.7, 0.85, 1.0), "emission_strength": 2.0, "opacity": 0.3}
	for nm in ["Crystals", "Arms"]:
		var cl := MultiMeshInstance3D.new()
		cl.name = nm
		cl.set_script(load("res://scripts/crystal_cluster.gd"))
		cl.material_override = smat(SH_CRYSTAL, ice_params)
		cl.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		if nm == "Crystals":  # spuntoni centrali: cristallo tozzo
			cl.crystal_mesh = mesh("crystal_a")
			cl.arm_count = 0
			cl.width_ratio = 0.16
		else:  # bracci a fiocco di neve: cristallo lungo a lama
			cl.crystal_mesh = mesh("crystal_b")
			cl.spike_count = 0
			cl.arm_width = 0.32
		root.add_child(cl)
		cl.build()
	var sword := Node3D.new()
	add(root, sword, "Sword")
	var blade := mesh_node(sword, "Blade", mesh("ice_sword"), smat(SH_CRYSTAL, {"noise_tex": noise, "grow": 1.0, "delay_spread": 0.0, "emission_strength": 1.6, "opacity": 0.6}))
	blade.scale = Vector3.ONE * 1.15
	for i in 3:
		arc(sword, "Crescent%s" % "ABC"[i], 1.3 - i * 0.15, {"radius": 0.38, "thickness": 0.045, "arc_length": 0.62, "arc_offset": 0.56, "tail_fade": 0.2, "billboard": true, "color": C_WHITE}, Vector3.ZERO, Vector3(0, 2.0 + i * 1.0, 0))
	particles(root, "Glints", {
		"amount": 22, "lifetime": 0.5, "pos": Vector3(0, 1.0, 0),
		"process": ppm({
			"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_BOX, "emission_box_extents": Vector3(2.8, 1.2, 2.8),
			"scale_min": 0.4, "scale_max": 1.0, "scale_curve": curve([[0, 0], [0.3, 1], [1, 0]]),
			"angle_min": -45.0, "angle_max": 45.0,
		}),
		"mesh": quad(0.7), "mat": sprite_mat("star_flare", C_WHITE, 3.0, 1, true),
	})
	particles(root, "DissolveDust", {
		"amount": 220, "lifetime": 1.6, "pos": Vector3(0, 0.8, 0),
		"process": ppm({
			"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_BOX, "emission_box_extents": Vector3(2.6, 1.0, 2.6),
			"direction": Vector3.UP, "spread": 25.0, "initial_velocity_min": 0.8, "initial_velocity_max": 3.0,
			"scale_min": 0.5, "scale_max": 1.3, "scale_curve": pop_curve(), "color_ramp": spark_ramp(),
		}),
		"mesh": quad(0.08), "mat": sprite_mat("soft_glow", C_WHITE, 4.0),
	})
	var light := OmniLight3D.new()
	light.light_color = Color(0.6, 0.8, 1.0)
	light.omni_range = 10.0
	light.light_energy = 0.0
	light.position = Vector3(0, 2.0, 0)
	add(root, light, "Light")
	return root


# =============================================================== master
func build_ice_ultimate() -> Node3D:
	var root := Node3D.new()
	root.name = "IceUltimate"
	with_script(root, "res://scripts/ice_ultimate.gd")
	instance(root, "res://scenes/vfx/target_flares.tscn", "TargetFlares")
	instance(root, "res://scenes/vfx/magic_circle.tscn", "MagicCircle")
	instance(root, "res://scenes/vfx/cast_frost.tscn", "CastFrost", root.caster_offset)
	instance(root, "res://scenes/vfx/ice_orb.tscn", "IceOrb")
	instance(root, "res://scenes/vfx/impact_burst.tscn", "ImpactBurst", Vector3(0, 1.6, 0))
	instance(root, "res://scenes/vfx/ring_orb.tscn", "RingOrbA", Vector3(0, 1.6, 0))
	instance(root, "res://scenes/vfx/ring_orb.tscn", "RingOrbB", Vector3(0, 1.6, 0))
	instance(root, "res://scenes/vfx/charge_core.tscn", "ChargeCore", Vector3(0, 1.7, 0))
	instance(root, "res://scenes/vfx/detonation.tscn", "Detonation")
	instance(root, "res://scenes/vfx/crystal_eruption.tscn", "CrystalEruption")
	var ap := AnimationPlayer.new()
	add(root, ap, "AnimationPlayer")
	var lib := AnimationLibrary.new()
	lib.add_animation(&"cast", build_cast_animation())
	lib.add_animation(&"RESET", build_reset_animation())
	ap.add_animation_library(&"", lib)
	return root


const EASE_OUT := 0.4
const EASE_IN := 2.4
const EASE_IO := -2.0
const LIN := 1.0


func vtrack(a: Animation, path: String, keys: Array, discrete := false) -> void:
	var t := a.add_track(Animation.TYPE_VALUE)
	a.track_set_path(t, NodePath(path))
	a.value_track_set_update_mode(t, Animation.UPDATE_DISCRETE if discrete else Animation.UPDATE_CONTINUOUS)
	a.track_set_interpolation_type(t, Animation.INTERPOLATION_LINEAR)
	for k in keys:
		a.track_insert_key(t, k[0], k[1], k[2] if k.size() > 2 else LIN)


func mtrack(a: Animation, events: Array) -> void:
	var t := a.add_track(Animation.TYPE_METHOD)
	a.track_set_path(t, NodePath("."))
	for e in events:
		a.track_insert_key(t, e[0], {"method": e[1], "args": e[2]})


## Coreografia completa (tempi presi dal video di riferimento, ~10 s).
func build_cast_animation() -> Animation:
	var a := Animation.new()
	a.length = 10.0
	# --- 0.0 lock-on sui bersagli
	vtrack(a, "TargetFlares:flash", [[0.0, 0.0], [0.06, 1.6, EASE_OUT], [0.5, 0.0]])
	# --- 0.0-1.6 caster: esplosione di gelo + 5.2-7.4 ricarica
	vtrack(a, "CastFrost:flash", [[0.0, 0.0], [0.1, 1.6, EASE_OUT], [0.5, 1.0], [1.1, 0.3], [1.7, 0.0], [5.25, 0.0], [5.4, 1.2, EASE_OUT], [6.0, 0.4], [6.80, 1.0], [7.20, 0.0]])
	vtrack(a, "CastFrost:frost", [[0.0, 0.0, EASE_OUT], [0.5, 1.0], [5.2, 1.0], [5.21, 0.0, EASE_OUT], [5.7, 1.0]])
	vtrack(a, "CastFrost:fade", [[0.0, 1.0], [1.6, 1.0], [2.6, 0.0], [5.21, 0.0], [5.25, 1.0], [7.30, 1.0], [8.30, 0.0]])
	vtrack(a, "CastFrost:mist_emitting", [[0.0, true], [1.4, false], [5.2, true], [7.50, false]], true)
	# --- 0.35-1.7 sfera in volo, 1.7-2.5 sospesa, 2.55 impatto
	vtrack(a, "IceOrb:intensity", [[0.0, 0.0], [0.2, 0.0, EASE_OUT], [0.4, 1.6], [2.35, 2.2], [2.55, 0.0]])
	vtrack(a, "IceOrb:progress", [[0.0, 0.0], [0.35, 0.0, EASE_IO], [1.7, 1.0]])
	vtrack(a, "ImpactBurst:flash", [[0.0, 0.0], [2.5, 0.0, EASE_OUT], [2.56, 2.0], [2.9, 0.3], [3.3, 0.0]])
	vtrack(a, "ImpactBurst:rings", [[0.0, 0.0], [2.52, 0.0, EASE_OUT], [3.3, 1.0]])
	# --- 2.6-3.95 satelliti che si aprono e rientrano
	vtrack(a, "RingOrbA:intensity", [[0.0, 0.0], [2.6, 0.0], [2.8, 1.3], [3.7, 1.3], [3.95, 0.0]])
	vtrack(a, "RingOrbB:intensity", [[0.0, 0.0], [2.6, 0.0], [2.8, 1.3], [3.7, 1.3], [3.95, 0.0]])
	vtrack(a, "RingOrbA:position", [[0.0, Vector3(0, 1.6, 0)], [2.6, Vector3(0, 1.6, 0), EASE_OUT], [3.05, Vector3(-2.7, 1.1, 0.5)], [3.6, Vector3(-2.4, 1.0, 0.8), EASE_IN], [3.95, Vector3(0, 1.6, 0)]])
	vtrack(a, "RingOrbB:position", [[0.0, Vector3(0, 1.6, 0)], [2.6, Vector3(0, 1.6, 0), EASE_OUT], [3.05, Vector3(2.7, 1.3, -0.4)], [3.6, Vector3(2.4, 1.2, -0.7), EASE_IN], [3.95, Vector3(0, 1.6, 0)]])
	# --- 2.8-7.0 sigillo
	vtrack(a, "MagicCircle:reveal", [[0.0, 0.0], [2.8, 0.0, EASE_OUT], [3.6, 1.0]])
	vtrack(a, "MagicCircle:intensity", [[0.0, 0.0], [2.75, 0.0], [2.85, 1.0], [4.0, 1.2], [6.8, 1.5], [6.90, 2.5], [7.15, 0.0]])
	vtrack(a, "MagicCircle:spin_speed", [[0.0, 1.2], [2.8, 1.2, EASE_OUT], [3.6, 0.35], [6.4, 0.6, EASE_IN], [6.85, 2.2]])
	vtrack(a, "MagicCircle:mist_emitting", [[0.0, false], [2.9, true], [6.90, false]], true)
	vtrack(a, "MagicCircle:streaks_emitting", [[0.0, false], [3.9, true], [6.85, false]], true)
	# --- 3.6-7.0 nucleo di carica
	vtrack(a, "ChargeCore:intensity", [[0.0, 0.0], [3.6, 0.0], [3.9, 1.0], [6.6, 1.6], [6.85, 2.5], [6.92, 0.0]])
	vtrack(a, "ChargeCore:charge", [[0.0, 0.0], [3.6, 0.0, EASE_IN], [6.80, 1.0]])
	# --- 6.97 detonazione
	vtrack(a, "Detonation:flash", [[0.0, 0.0], [6.85, 0.0], [6.90, 2.0], [7.10, 0.8], [7.60, 0.0]])
	vtrack(a, "Detonation:progress", [[0.0, 0.0], [6.87, 0.0, EASE_OUT], [7.80, 1.0]])
	vtrack(a, "Detonation:fade", [[0.0, 1.0], [7.25, 1.0], [8.10, 0.0]])
	# --- 7.0-10.0 cristalli, spada, dissoluzione
	vtrack(a, "CrystalEruption:grow", [[0.0, 0.0], [6.90, 0.0, EASE_OUT], [7.35, 1.0]])
	vtrack(a, "CrystalEruption:sword", [[0.0, 0.0], [6.90, 0.0, EASE_IN], [7.10, 1.0]])
	vtrack(a, "CrystalEruption:cracks", [[0.0, 0.0], [6.90, 0.0, EASE_OUT], [7.50, 1.0]])
	vtrack(a, "CrystalEruption:glow", [[0.0, 0.0], [6.90, 3.0, EASE_OUT], [7.60, 0.15]])
	vtrack(a, "CrystalEruption:dissolve", [[0.0, 0.0], [8.30, 0.0, EASE_IN], [9.50, 1.0]])
	# --- eventi (particelle one-shot, camera shake, post-process, segnali)
	mtrack(a, [
		[0.02, &"evt_burst", [^"CastFrost"]],
		[0.02, &"evt_shake", [0.25, 0.3]],
		[2.52, &"evt_burst", [^"ImpactBurst"]],
		[2.52, &"evt_shake", [0.6, 0.5]],
		[2.52, &"evt_punch", [4.0, 0.5]],
		[2.52, &"evt_post", [1.2, 0.4, 0.35, 0.6]],
		[2.52, &"evt_signal", [&"impact"]],
		[5.22, &"evt_burst", [^"CastFrost"]],
		[6.88, &"evt_burst", [^"Detonation"]],
		[6.88, &"evt_shake", [1.2, 0.9]],
		[6.88, &"evt_punch", [14.0, 1.1]],
		[6.88, &"evt_post", [2.2, 1.0, 1.1, 0.9]],
		[6.88, &"evt_signal", [&"detonated"]],
		[7.10, &"evt_shake", [0.45, 0.35]],
	])
	return a


## Stato "a riposo" (tutto spento) usato dall'editor.
func build_reset_animation() -> Animation:
	var a := Animation.new()
	a.length = 0.001
	for p in [["TargetFlares:flash", 0.0], ["CastFrost:flash", 0.0], ["CastFrost:frost", 0.0], ["CastFrost:fade", 1.0],
			["CastFrost:mist_emitting", false], ["IceOrb:intensity", 0.0], ["IceOrb:progress", 0.0],
			["ImpactBurst:flash", 0.0], ["ImpactBurst:rings", 0.0], ["RingOrbA:intensity", 0.0], ["RingOrbB:intensity", 0.0],
			["RingOrbA:position", Vector3(0, 1.6, 0)], ["RingOrbB:position", Vector3(0, 1.6, 0)],
			["MagicCircle:reveal", 0.0], ["MagicCircle:intensity", 0.0], ["MagicCircle:mist_emitting", false],
			["MagicCircle:streaks_emitting", false], ["ChargeCore:intensity", 0.0], ["ChargeCore:charge", 0.0],
			["Detonation:flash", 0.0], ["Detonation:progress", 0.0], ["Detonation:fade", 1.0],
			["CrystalEruption:grow", 0.0], ["CrystalEruption:sword", 0.0], ["CrystalEruption:cracks", 0.0],
			["CrystalEruption:glow", 0.0], ["CrystalEruption:dissolve", 0.0]]:
		vtrack(a, p[0], [[0.0, p[1]]], typeof(p[1]) == TYPE_BOOL)
	return a


# =============================================================== demo
## Personaggio low-poly modellato e animato in Blender (models/caster.glb).
func character(parent: Node, nm: String, pos: Vector3, look_target: Vector3) -> Node3D:
	var c: Node3D = load("res://models/caster.glb").instantiate(PackedScene.GEN_EDIT_STATE_INSTANCE)
	add(parent, c, nm)
	c.position = pos
	var dir := (look_target - pos) * Vector3(1, 0, 1)
	c.basis = Basis.looking_at(dir.normalized(), Vector3.UP, true)
	return c


func build_demo() -> Node3D:
	var root := Node3D.new()
	root.name = "Demo"
	with_script(root, "res://scripts/demo.gd")

	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.03, 0.035, 0.045)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.36, 0.38, 0.42)
	env.ambient_light_energy = 1.4
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = 1.0
	env.glow_enabled = true
	env.glow_intensity = 0.5
	env.glow_strength = 1.0
	env.glow_bloom = 0.0
	env.glow_blend_mode = Environment.GLOW_BLEND_MODE_SCREEN
	env.glow_hdr_threshold = 1.2
	env.set_glow_level(0, 0.0)
	env.set_glow_level(1, 0.8)
	env.set_glow_level(2, 1.0)
	env.set_glow_level(3, 0.6)
	env.set_glow_level(4, 0.3)
	env.fog_enabled = true
	env.fog_light_color = Color(0.16, 0.17, 0.19)
	env.fog_density = 0.035
	var we := WorldEnvironment.new()
	we.environment = env
	add(root, we, "WorldEnvironment")

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55, 35, 0)
	sun.light_energy = 0.7
	sun.light_color = Color(0.75, 0.82, 1.0)
	sun.shadow_enabled = true
	add(root, sun, "Sun")

	var fmat := StandardMaterial3D.new()
	fmat.albedo_texture = tex("floor_checker")
	fmat.uv1_scale = Vector3(20, 20, 1)
	fmat.roughness = 0.55
	fmat.metallic = 0.15
	var floor_mi := mesh_node(root, "Floor", plane(80.0), fmat)
	floor_mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

	var ult := instance(root, "res://scenes/ice_ultimate.tscn", "IceUltimate")
	var caster_pos: Vector3 = ult.caster_offset
	character(root, "Caster", caster_pos, Vector3.ZERO)
	var enemies := Node3D.new()
	add(root, enemies, "Enemies")
	for i in 3:
		var p: Vector3 = [Vector3(-3.4, 0, -3.0), Vector3(0.4, 0, -5.0), Vector3(2.6, 0, -3.6)][i]
		character(enemies, "Enemy%d" % (i + 1), p, caster_pos)

	var cam := Camera3D.new()
	cam.set_script(load("res://scripts/camera_shake.gd"))
	var cam_pos := Vector3(2.4, 8.6, 12.6)
	cam.transform = Transform3D(Basis.looking_at(Vector3(0.5, 0.2, 1.4) - cam_pos, Vector3.UP), cam_pos)
	cam.fov = 40.0
	cam.current = true
	add(root, cam, "Camera3D")

	var cl := CanvasLayer.new()
	add(root, cl, "Overlay")
	var post := ColorRect.new()
	post.set_script(load("res://scripts/post_fx.gd"))
	post.material = smat(SH_POST, {})
	post.set_anchors_preset(Control.PRESET_FULL_RECT)
	add(cl, post, "PostFX")
	var label := Label.new()
	label.text = "Ice Ultimate VFX  -  Spazio / Click: rilancia"
	label.position = Vector2(16, 12)
	label.modulate = Color(1, 1, 1, 0.55)
	add(cl, label, "Hint")
	return root
