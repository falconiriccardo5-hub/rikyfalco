@tool
extends MultiMeshInstance3D
## Generatore procedurale del cluster di cristalli (MultiMesh).
## Cambia i parametri nell'Inspector e premi "regenerate" per ricostruirlo.
## Dati custom per istanza: r = ritardo di crescita (0..1), g = random.

@export var crystal_mesh: Mesh
@export var seed := 7
@export_group("Spuntoni centrali")
@export var spike_count := 110
@export var base_radius := 1.3
@export var length_min := 0.8
@export var length_max := 3.8
@export_range(0.0, 90.0) var tilt_min_deg := 8.0
@export_range(0.0, 90.0) var tilt_max_deg := 70.0
@export var width_ratio := 0.1
@export_group("Bracci a fiocco di neve")
@export var arm_count := 6
@export var arm_length := 4.2
@export var arm_width := 0.22
@export var arm_side_spikes := 3
@export_group("")
@export var regenerate := false:
	set(v):
		if v:
			build()


func _ready() -> void:
	# Ricostruito sempre all'avvio: e' deterministico (seed) e cosi' la scena
	# non dipende dal buffer salvato del MultiMesh.
	build()


func build() -> void:
	if crystal_mesh == null:
		crystal_mesh = make_crystal_mesh()
	var rng := RandomNumberGenerator.new()
	rng.seed = seed
	var items: Array = []  # [Transform3D, Color]

	# bracci orizzontali disposti a fiocco di neve
	for k in arm_count:
		var az := TAU * k / arm_count + rng.randf_range(-0.12, 0.12)
		var dir := Vector3(cos(az), 0.0, sin(az))
		var arm_dir := (dir + Vector3.UP * 0.12).normalized()
		var arm_len := arm_length * rng.randf_range(0.8, 1.1)
		items.append([_xf(dir * 0.2, arm_dir, arm_len, arm_width), Color(rng.randf_range(0.0, 0.15), rng.randf(), 0, 0)])
		for s in arm_side_spikes:
			var t := rng.randf_range(0.3, 0.85)
			var side := 1.0 if s % 2 == 0 else -1.0
			var perp := dir.cross(Vector3.UP) * side
			var sdir := (dir * 0.8 + perp * 0.9 + Vector3.UP * 0.35).normalized()
			var base := dir * arm_len * t
			items.append([_xf(base, sdir, arm_len * rng.randf_range(0.15, 0.3), arm_width * 0.6),
				Color(0.2 + t * 0.4, rng.randf(), 0, 0)])

	# spuntoni centrali che esplodono verso l'alto e verso l'esterno
	for i in spike_count:
		var r := base_radius * sqrt(rng.randf())
		var az := rng.randf() * TAU
		var base := Vector3(cos(az) * r, 0.0, sin(az) * r)
		var rn := r / maxf(base_radius, 0.001)
		var tilt := deg_to_rad(lerpf(tilt_min_deg, tilt_max_deg, rn) + rng.randf_range(-10.0, 10.0))
		var out_az := az + rng.randf_range(-0.4, 0.4)
		var dir := Vector3(cos(out_az) * sin(tilt), cos(tilt), sin(out_az) * sin(tilt))
		var length := lerpf(length_max, length_min, rn) * rng.randf_range(0.6, 1.15)
		var delay := clampf(rn * 0.55 + rng.randf() * 0.45, 0.0, 1.0)
		items.append([_xf(base, dir, length, length * width_ratio), Color(delay, rng.randf(), 0, 0)])

	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_custom_data = true
	mm.mesh = crystal_mesh
	mm.instance_count = items.size()
	for i in items.size():
		mm.set_instance_transform(i, items[i][0])
		mm.set_instance_custom_data(i, items[i][1])
	multimesh = mm


func _xf(origin: Vector3, dir: Vector3, length: float, width: float) -> Transform3D:
	var y := dir.normalized()
	var ref := Vector3.RIGHT if absf(y.dot(Vector3.RIGHT)) < 0.9 else Vector3.FORWARD
	var x := ref.cross(y).normalized()
	var z := x.cross(y).normalized()
	return Transform3D(Basis(x * width, y * length, z * width), origin)


## Prisma esagonale con punta: base a y=0, punta a y=1, larghezza ~1.
## UV: u attorno al prisma, v lungo l'altezza (usato per dissolve/emissione).
static func make_crystal_mesh(sides: int = 6, shoulder: float = 0.72) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var ring: Array[Vector3] = []
	for i in sides:
		var a := TAU * i / sides
		var rr := 0.5 * (0.85 if i % 2 else 1.0)  # facce irregolari
		ring.append(Vector3(cos(a) * rr, 0.0, sin(a) * rr))
	var tip := Vector3(0.04, 1.0, 0.0)
	for i in sides:
		var a0 := ring[i]
		var a1 := ring[(i + 1) % sides]
		var b0 := a0 * 0.8 + Vector3.UP * shoulder
		var b1 := a1 * 0.8 + Vector3.UP * shoulder
		var u0 := float(i) / sides
		var u1 := float(i + 1) / sides
		_quad(st, a0, a1, b1, b0, u0, u1, 0.0, shoulder)
		_tri(st, b0, b1, tip, Vector2(u0, shoulder), Vector2(u1, shoulder), Vector2((u0 + u1) * 0.5, 1.0))
	return st.commit()


static func _quad(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3, u0: float, u1: float, v0: float, v1: float) -> void:
	_tri(st, a, b, c, Vector2(u0, v0), Vector2(u1, v0), Vector2(u1, v1))
	_tri(st, a, c, d, Vector2(u0, v0), Vector2(u1, v1), Vector2(u0, v1))


static func _tri(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, ua: Vector2, ub: Vector2, uc: Vector2) -> void:
	# ordine a-c-b: in Godot le facce frontali sono in senso orario.
	# Normale piatta per faccia, sempre orientata verso l'esterno del prisma.
	var n := (b - a).cross(c - a).normalized()
	var centroid := (a + b + c) / 3.0
	var outward := Vector3(centroid.x, 0.0, centroid.z)
	if n.dot(outward) < 0.0:
		n = -n
	st.set_normal(n)
	st.set_uv(ua)
	st.add_vertex(a)
	st.set_uv(uc)
	st.add_vertex(c)
	st.set_uv(ub)
	st.add_vertex(b)
