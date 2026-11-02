"""
Felcio — personaggio cartoon originale (geco d'erba chibi).

Genera da zero, con Blender come modulo Python (bpy 5.x):
  - mesh del corpo da un campo SDF (unioni morbide) + marching cubes
  - occhi, guance, bocca, germoglio e foglie come geometria separata
  - armatura con pesi automatici
  - 3 animazioni: Idle, Walk, Attack
  - esportazione .blend, .glb (glTF 2.0) e .fbx

Uso:
  python felcio_build.py <cartella_output> [--render]

Unità: metri. Altezza finale ~0.6 m. Il personaggio guarda verso -Y (vista frontale di Blender).
"""
import math
import os
import sys

import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector, Quaternion
from mathutils.bvhtree import BVHTree
from skimage.measure import marching_cubes

OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
RENDER = "--render" in sys.argv
os.makedirs(OUT, exist_ok=True)

S = 0.6  # scala finale: il design è pensato con altezza ~1.0, poi ridotto a 0.6 m


def V(x, y, z):
    return Vector((x * S, y * S, z * S))


# ---------------------------------------------------------------------------
# Scena pulita
# ---------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1.0
scene.render.fps = 30

# ---------------------------------------------------------------------------
# Materiali (colori cartoon piatti, compatibili con glTF/FBX)
# ---------------------------------------------------------------------------
def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1.0]


def make_mat(name, hexcol, rough=0.6, spec=0.25, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = srgb(hexcol)
    b.inputs["Roughness"].default_value = rough
    if "Specular IOR Level" in b.inputs:
        b.inputs["Specular IOR Level"].default_value = spec
    if emit > 0:
        b.inputs["Emission Color"].default_value = srgb(hexcol)
        b.inputs["Emission Strength"].default_value = emit
    m.diffuse_color = srgb(hexcol)
    return m


MAT = {
    "skin": make_mat("Felcio_Pelle", "#3DBB8E"),
    "belly": make_mat("Felcio_Pancia", "#F4E6BF"),
    "spots": make_mat("Felcio_Macchie", "#23856A"),
    "leaf": make_mat("Felcio_Foglia", "#9BD94A", rough=0.5),
    "vein": make_mat("Felcio_Venatura", "#5FA331", rough=0.5),
    "stem": make_mat("Felcio_Stelo", "#4E9A3A"),
    "eye": make_mat("Felcio_OcchioBianco", "#FFFFFF", rough=0.25, spec=0.5),
    "iris": make_mat("Felcio_Iride", "#E8902F", rough=0.25, spec=0.5),
    "pupil": make_mat("Felcio_Pupilla", "#16161D", rough=0.2, spec=0.5),
    "shine": make_mat("Felcio_Riflesso", "#FFFFFF", rough=0.1, emit=1.5),
    "cheek": make_mat("Felcio_Guance", "#FF8F6B", rough=0.7),
    "mouth": make_mat("Felcio_Bocca", "#3A1F24", rough=0.7),
}

# ---------------------------------------------------------------------------
# Corpo: campo SDF con unioni morbide
# ---------------------------------------------------------------------------
def sd_ell(p, c, r):
    q = (p - np.asarray(c)) / np.asarray(r)
    k0 = np.linalg.norm(q, axis=1)
    k1 = np.linalg.norm(q / np.asarray(r), axis=1)
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)


def sd_sph(p, c, r):
    return np.linalg.norm(p - np.asarray(c), axis=1) - r


def sd_rcone(p, a, b, r1, r2):
    a = np.asarray(a, float); b = np.asarray(b, float)
    ba = b - a
    l2 = ba @ ba
    rr = r1 - r2
    a2 = l2 - rr * rr
    il2 = 1.0 / l2
    pa = p - a
    y = pa @ ba
    z = y - l2
    xv = pa * l2 - np.outer(y, ba)
    x2 = np.einsum("ij,ij->i", xv, xv)
    y2 = y * y * l2
    z2 = z * z * l2
    k = np.sign(rr) * rr * rr * x2
    d3 = (np.sqrt(np.maximum(x2 * a2 * il2, 0)) + y * rr) * il2 - r1
    d1 = np.sqrt(x2 + z2) * il2 - r2
    d2 = np.sqrt(x2 + y2) * il2 - r1
    out = np.where(np.sign(y) * a2 * y2 < k, d2, d3)
    out = np.where(np.sign(z) * a2 * z2 > k, d1, out)
    return out


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b * (1 - h) + a * h - k * h * (1 - h)


# Punti chiave del design (altezza ~1, fronte verso -Y, sinistra del personaggio = +X)
SHOULDER = (0.13, 0.0, 0.47)
ELBOW = (0.22, -0.03, 0.39)
HAND = (0.27, -0.09, 0.33)
HIP = (0.10, 0.01, 0.24)
KNEE = (0.115, -0.01, 0.14)
ANKLE = (0.12, 0.0, 0.065)
TAIL = [(0, 0.12, 0.27), (0, 0.27, 0.19), (0, 0.40, 0.20), (0, 0.49, 0.29), (0, 0.52, 0.41)]
TAIL_R = [0.085, 0.07, 0.055, 0.04, 0.03]


def mirror(p, s):
    return (p[0] * s, p[1], p[2])


def groups(p):
    head = smin(sd_ell(p, (0, -0.02, 0.70), (0.215, 0.19, 0.185)),
                sd_ell(p, (0, -0.14, 0.645), (0.14, 0.10, 0.095)), 0.06)
    torso = smin(sd_ell(p, (0, 0.02, 0.36), (0.17, 0.15, 0.19)),
                 sd_ell(p, (0, 0.0, 0.30), (0.18, 0.16, 0.14)), 0.06)
    arms, legs = [], []
    for s in (1, -1):
        sh, el, ha = mirror(SHOULDER, s), mirror(ELBOW, s), mirror(HAND, s)
        a = smin(sd_rcone(p, sh, el, 0.05, 0.042), sd_rcone(p, el, ha, 0.042, 0.044), 0.02)
        hand = sd_ell(p, ha, (0.048, 0.05, 0.042))
        for dx, dz in ((0.0, -0.012), (0.026, -0.02), (-0.024, -0.02)):
            hand = smin(hand, sd_sph(p, (ha[0] + dx * s, ha[1] - 0.042, ha[2] + dz), 0.018), 0.012)
        arms.append(smin(a, hand, 0.02))

        hp, kn, an = mirror(HIP, s), mirror(KNEE, s), mirror(ANKLE, s)
        l = smin(sd_rcone(p, hp, kn, 0.075, 0.06), sd_rcone(p, kn, an, 0.06, 0.055), 0.02)
        foot = sd_ell(p, (0.12 * s, -0.04, 0.04), (0.07, 0.095, 0.045))
        for dx in (-0.038, 0.0, 0.038):
            foot = smin(foot, sd_sph(p, (0.12 * s + dx, -0.125, 0.03), 0.024), 0.015)
        legs.append(smin(l, foot, 0.03))
    tail = sd_rcone(p, TAIL[0], TAIL[1], TAIL_R[0], TAIL_R[1])
    for i in range(1, 4):
        tail = smin(tail, sd_rcone(p, TAIL[i], TAIL[i + 1], TAIL_R[i], TAIL_R[i + 1]), 0.02)
    return {"head": head, "torso": torso, "armL": arms[0], "armR": arms[1],
            "legL": legs[0], "legR": legs[1], "tail": tail}


def body_sdf(p):
    g = groups(p)
    d = smin(g["torso"], g["head"], 0.05)
    d = smin(d, g["armL"], 0.03)
    d = smin(d, g["armR"], 0.03)
    d = smin(d, g["legL"], 0.04)
    d = smin(d, g["legR"], 0.04)
    d = smin(d, g["tail"], 0.05)
    return np.maximum(d, -p[:, 2])  # pianta dei piedi piatta a z = 0


h = 0.0045
xs = np.arange(-0.40, 0.40 + h, h)
ys = np.arange(-0.36, 0.64 + h, h)
zs = np.arange(-0.02, 0.93 + h, h)
P = np.stack(np.meshgrid(xs, ys, zs, indexing="ij"), axis=-1).reshape(-1, 3)
vol = np.empty(len(P))
for i in range(0, len(P), 1_000_000):
    vol[i:i + 1_000_000] = body_sdf(P[i:i + 1_000_000])
vol = vol.reshape(len(xs), len(ys), len(zs))
del P
verts, faces, _, _ = marching_cubes(vol, level=0.0, spacing=(h, h, h))
verts += np.array([xs[0], ys[0], zs[0]])
tri = verts[faces]
if np.einsum("ij,ij->i", tri[:, 0], np.cross(tri[:, 1], tri[:, 2])).sum() < 0:
    faces = faces[:, ::-1]

me = bpy.data.meshes.new("Felcio")
me.from_pydata((verts * S).tolist(), [], faces.tolist())
me.update()
body = bpy.data.objects.new("Felcio", me)
scene.collection.objects.link(body)

bm = bmesh.new(); bm.from_mesh(me)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
bm.to_mesh(me); bm.free()

# Materiali del corpo per regione
for k in ("skin", "belly", "spots"):
    me.materials.append(MAT[k])
cent = np.array([p.center for p in me.polygons]) / S
nrm = np.array([p.normal for p in me.polygons])
g = groups(cent)
names = list(g.keys())
label = np.array(names)[np.argmin(np.stack([g[n] for n in names]), axis=0)]
idx = np.zeros(len(cent), int)
x, y, z = cent[:, 0], cent[:, 1], cent[:, 2]
belly = (label == "torso") & (nrm[:, 1] < -0.15) & ((x / 0.125) ** 2 + ((z - 0.33) / 0.16) ** 2 < 1)
chin = (label == "head") & (z < 0.615) & (nrm[:, 1] < 0.25) & (np.abs(x) < 0.15)
idx[belly | chin] = 1
spots = [(0.08, 0.80, 0.03), (-0.08, 0.80, 0.03), (0, 0.845, 0.028), (0.13, 0.70, 0.026), (-0.13, 0.70, 0.026),
         (0.07, 0.43, 0.034), (-0.07, 0.43, 0.034), (0, 0.35, 0.03), (0.095, 0.29, 0.028), (-0.095, 0.29, 0.028)]
back = np.isin(label, ["head", "torso"]) & (nrm[:, 1] > 0.3)
for sx, sz, r in spots:
    idx[back & ((x - sx) ** 2 + (z - sz) ** 2 < r * r)] = 2
for ty, r in ((0.27, 0.03), (0.40, 0.026)):
    idx[(label == "tail") & (nrm[:, 2] > 0.45) & (x ** 2 + (y - ty) ** 2 < r * r)] = 2
for poly, m in zip(me.polygons, idx):
    poly.material_index = int(m)

# Copia ad alta risoluzione: serve solo come sorgente per cuocere la texture di colore
dense = bpy.data.objects.new("Felcio_dense", me.copy())
scene.collection.objects.link(dense)

dec = body.modifiers.new("dec", "DECIMATE")
dec.ratio = 18000 / len(me.polygons)
deps = bpy.context.evaluated_depsgraph_get()
me2 = bpy.data.meshes.new_from_object(body.evaluated_get(deps))
body.modifiers.clear()
body.data = me2
bpy.data.meshes.remove(me)
me = body.data
me.name = "Felcio"
for poly in me.polygons:
    poly.use_smooth = True
    poly.material_index = 0

# UV automatiche + texture di colore cotta dalla copia densa (bordi puliti in qualsiasi motore)
TEX = 2048
me.materials.clear()
body_mat = bpy.data.materials.new("Felcio_Corpo")
body_mat.use_nodes = True
nt = body_mat.node_tree
bsdf = nt.nodes.get("Principled BSDF")
bsdf.inputs["Roughness"].default_value = 0.6
if "Specular IOR Level" in bsdf.inputs:
    bsdf.inputs["Specular IOR Level"].default_value = 0.25
img = bpy.data.images.new("Felcio_Corpo_Colore", TEX, TEX, alpha=False)
tex_node = nt.nodes.new("ShaderNodeTexImage")
tex_node.image = img
nt.links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])
nt.nodes.active = tex_node
me.materials.append(body_mat)

for o in bpy.context.view_layer.objects:
    o.select_set(False)
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004)
bpy.ops.object.mode_set(mode="OBJECT")

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 1
dense.select_set(True)
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"}, use_selected_to_active=True,
                    cage_extrusion=0.01 * S, max_ray_distance=0.03 * S, margin=12)
img.filepath_raw = os.path.join(OUT, "Felcio_Corpo_Colore.png")
img.file_format = "PNG"
img.save()
img.pack()
dense_me = dense.data
bpy.data.objects.remove(dense)
bpy.data.meshes.remove(dense_me)

bm = bmesh.new(); bm.from_mesh(me)
bvh = BVHTree.FromBMesh(bm)


def ray(origin, direction):
    hit, n, _, _ = bvh.ray_cast(Vector(origin), Vector(direction).normalized())
    return hit, n


# ---------------------------------------------------------------------------
# Accessori
# ---------------------------------------------------------------------------
ACC = []  # (oggetto, osso)


def frame(z_axis, x_hint):
    zv = Vector(z_axis).normalized()
    xv = (Vector(x_hint) - zv * Vector(x_hint).dot(zv)).normalized()
    yv = zv.cross(xv)
    return Matrix((xv, yv, zv)).transposed()


def blob(name, mat, center, rot3, scale, seg=20, rings=12, bone="head"):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=1.0)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(MAT[mat])
    m = Matrix.Translation(center) @ rot3.to_4x4() @ Matrix.Diagonal(Vector(scale)).to_4x4()
    o.data.transform(m)
    for p in o.data.polygons:
        p.use_smooth = True
    ACC.append((o, bone))
    return o


def leaf(name, base, direction, normal, length, width, curl=0.12, fold=0.35, bone="head"):
    vs = [-1, -0.72, -0.44, -0.2, -0.05, 0.05, 0.2, 0.44, 0.72, 1]
    nu = 14
    verts, faces, mats = [], [], []
    for i in range(nu + 1):
        u = i / nu
        w = max(width * math.sin(math.pi * u ** 0.75), width * 0.07 * (1 - u))
        for v in vs:
            verts.append((u * length, v * w * 0.5, curl * length * u * u + fold * abs(v) * w * 0.5))
    nv = len(vs)
    for i in range(nu):
        for j in range(nv - 1):
            a = i * nv + j
            faces.append((a, a + nv, a + nv + 1, a + 1))
            mats.append(1 if j == 4 else 0)
    m = bpy.data.meshes.new(name)
    m.from_pydata(verts, [], faces)
    m.materials.append(MAT["leaf"]); m.materials.append(MAT["vein"])
    for p, mi in zip(m.polygons, mats):
        p.material_index = mi
        p.use_smooth = True
    o = bpy.data.objects.new(name, m)
    scene.collection.objects.link(o)
    d = Vector(direction).normalized()
    n = Vector(normal)
    n = (n - d * n.dot(d)).normalized()
    rot = Matrix((d, n.cross(d), n)).transposed()
    o.matrix_world = Matrix.Translation(base) @ rot.to_4x4()
    sol = o.modifiers.new("sol", "SOLIDIFY"); sol.thickness = 0.006 * S; sol.offset = 0
    ACC.append((o, bone))
    return o


def tube(name, pts, radius, mat, bone):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 3
    cu.use_fill_caps = True
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    o = bpy.data.objects.new(name, cu)
    o.data.materials.append(MAT[mat])
    scene.collection.objects.link(o)
    ACC.append((o, bone))
    return o


# Occhi grandi e ovali
for s in (1, -1):
    p, n = ray(V(0.085 * s, -1, 0.735), (0, 1, 0))
    R = frame(n, (s, 0, 0))
    up = R.col[1]
    side = R.col[0]
    blob(f"Occhio_{s}", "eye", p - n * 0.010 * S, R, (0.058 * S, 0.072 * S, 0.03 * S))
    blob(f"Iride_{s}", "iris", p + n * 0.012 * S, R, (0.038 * S, 0.048 * S, 0.012 * S))
    blob(f"Pupilla_{s}", "pupil", p + n * 0.018 * S, R, (0.022 * S, 0.03 * S, 0.009 * S))
    blob(f"Riflesso_{s}", "shine", p + n * 0.024 * S + up * 0.016 * S + side * 0.01 * S, R,
         (0.01 * S, 0.012 * S, 0.006 * S), seg=12, rings=8)
    p, n = ray(V(0.15 * s, -1, 0.635), (0, 1, 0))
    blob(f"Guancia_{s}", "cheek", p - n * 0.002 * S, frame(n, (s, 0, 0)), (0.032 * S, 0.022 * S, 0.006 * S),
         seg=16, rings=8)

# Bocca sorridente
mouth = []
for xm in np.linspace(-0.05, 0.05, 9):
    p, n = ray(V(xm, -1, 0.598 + 6.0 * xm * xm), (0, 1, 0))
    mouth.append(p + n * 0.001 * S)
tube("Bocca", mouth, 0.006 * S, "mouth", "head")

# Germoglio sulla testa
top, _ = ray(V(0, 0.0, 2), (0, 0, -1))
stem_pts = [top - V(0, 0, 0.02), top + V(0, 0.012, 0.045), top + V(0, 0.0, 0.085)]
tube("Stelo", stem_pts, 0.011 * S, "stem", "sprout")
tip = stem_pts[-1]
for s in (1, -1):
    leaf(f"Germoglio_{s}", tip, (s * 1.0, -0.1, 0.55), (-s * 0.35, -0.25, 1.0), 0.12 * S, 0.075 * S,
         curl=0.1, fold=0.3, bone="sprout")

# Fogliolina sull'avambraccio
for s in (1, -1):
    el, ha = V(*mirror(ELBOW, s)), V(*mirror(HAND, s))
    base = el.lerp(ha, 0.35) + V(0.03 * s, 0.01, 0.025)
    leaf(f"FogliaBraccio_{s}", base, (0.25 * s, 0.85, 0.55), (s, 0.0, -0.2), 0.14 * S, 0.08 * S,
         curl=0.18, fold=0.25, bone=f"forearm.{'L' if s > 0 else 'R'}")

# Grande foglia in punta alla coda
leaf("FogliaCoda", V(*TAIL[-1]) - V(0, 0.01, 0.02), (0, 0.3, 1.0), (0, -1.0, 0.3), 0.27 * S, 0.19 * S,
     curl=-0.18, fold=0.3, bone="tail5")

# Converte gli accessori in mesh semplici
deps = bpy.context.evaluated_depsgraph_get()
baked = []
for o, bone in ACC:
    m = bpy.data.meshes.new_from_object(o.evaluated_get(deps))
    m.transform(o.matrix_world)
    no = bpy.data.objects.new(o.name, m)
    scene.collection.objects.link(no)
    baked.append((no, bone))
    data = o.data
    bpy.data.objects.remove(o)
    if isinstance(data, bpy.types.Mesh) and data.users == 0:
        bpy.data.meshes.remove(data)
    elif isinstance(data, bpy.types.Curve) and data.users == 0:
        bpy.data.curves.remove(data)

# ---------------------------------------------------------------------------
# Armatura
# ---------------------------------------------------------------------------
arm_data = bpy.data.armatures.new("Felcio_Rig")
arm = bpy.data.objects.new("Armature", arm_data)  # "Armature": UE5 non aggiunge un osso radice in più
scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="EDIT")
EB = arm_data.edit_bones


def bone(name, head, tail, parent=None, connect=False, roll=0.0):
    b = EB.new(name)
    b.head, b.tail = head, tail
    b.roll = roll
    if parent:
        b.parent = EB[parent]
        b.use_connect = connect
    return b


bone("root", V(0, 0, 0), V(0, 0.12, 0))
bone("hips", V(0, 0.02, 0.24), V(0, 0.02, 0.36), "root")
bone("spine", V(0, 0.02, 0.36), V(0, 0.01, 0.50), "hips", True)
bone("head", V(0, 0.0, 0.52), V(0, 0.0, 0.86), "spine")
bone("sprout", V(0, 0.0, 0.86), V(0, 0.0, 0.97), "head", True)
tail_pts = TAIL + [(0, 0.55, 0.58)]
for i in range(5):
    bone(f"tail{i + 1}", V(*tail_pts[i]), V(*tail_pts[i + 1]), "hips" if i == 0 else f"tail{i}", i > 0)
for s, sfx in ((1, "L"), (-1, "R")):
    bone(f"upperarm.{sfx}", V(*mirror(SHOULDER, s)), V(*mirror(ELBOW, s)), "spine")
    bone(f"forearm.{sfx}", V(*mirror(ELBOW, s)), V(*mirror(HAND, s)), f"upperarm.{sfx}", True)
    ha = mirror(HAND, s)
    bone(f"hand.{sfx}", V(*ha), V(ha[0] + 0.02 * s, ha[1] - 0.06, ha[2] - 0.03), f"forearm.{sfx}", True)
    bone(f"thigh.{sfx}", V(*mirror(HIP, s)), V(*mirror(KNEE, s)), "hips")
    bone(f"shin.{sfx}", V(*mirror(KNEE, s)), V(*mirror(ANKLE, s)), f"thigh.{sfx}", True)
    an = mirror(ANKLE, s)
    bone(f"foot.{sfx}", V(*an), V(an[0], -0.13, 0.025), f"shin.{sfx}", True)
bpy.ops.object.mode_set(mode="OBJECT")

# Pesi automatici sul corpo
for o in bpy.context.view_layer.objects:
    o.select_set(False)
body.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type="ARMATURE_AUTO")

missing = sum(1 for v in body.data.vertices if not v.groups)
print("vertici senza peso:", missing)

# Accessori: peso pieno sull'osso di riferimento, poi unione in un'unica mesh
for o, bname in baked:
    vg = o.vertex_groups.new(name=bname)
    vg.add(range(len(o.data.vertices)), 1.0, "REPLACE")
for o in bpy.context.view_layer.objects:
    o.select_set(False)
for o, _ in baked:
    o.select_set(True)
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body.name = "Felcio"
body.data.validate(clean_customdata=False)
bpy.ops.object.vertex_group_limit_total(limit=4)
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
print("triangoli totali:", sum(len(p.vertices) - 2 for p in body.data.polygons))

# ---------------------------------------------------------------------------
# Animazioni
# ---------------------------------------------------------------------------
PB = arm.pose.bones
REST = {b.name: b.matrix_local.to_3x3() for b in arm_data.bones}
for pb in PB:
    pb.rotation_mode = "QUATERNION"

AX = {"X": Vector((1, 0, 0)), "Y": Vector((0, 1, 0)), "Z": Vector((0, 0, 1))}


def pose(name, rots=(), loc=None):
    pb = PB[name]
    R = Matrix.Identity(3)
    for ax, deg in rots:
        R = Matrix.Rotation(math.radians(deg), 3, AX[ax]) @ R
    B = REST[name]
    pb.rotation_quaternion = (B.inverted() @ R @ B).to_quaternion()
    pb.location = B.inverted() @ (Vector(loc) * S if loc else Vector())


def key_all(f):
    for pb in PB:
        pb.keyframe_insert("rotation_quaternion", frame=f)
        pb.keyframe_insert("location", frame=f)


def reset_pose():
    for pb in PB:
        pb.rotation_quaternion = Quaternion()
        pb.location = Vector()


arm.animation_data_create()
actions = []


def new_action(name, f_end):
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    act.use_frame_range = True
    act.frame_start, act.frame_end = 1, f_end
    act.use_cyclic = name != "Attack"
    arm.animation_data.action = act
    actions.append(act)
    return act


# Idle: respiro, coda che ondeggia, germoglio che dondola (61 frame, loop)
new_action("Idle", 61)
for f in range(1, 62, 4):
    t = (f - 1) / 60 * 2 * math.pi
    reset_pose()
    pose("hips", loc=(0, 0, -0.006 * (1 - math.cos(t)) / 2))
    pose("spine", [("X", 2.0 * math.sin(t))])
    pose("head", [("X", -3.0 * math.sin(t + 0.6)), ("Y", 2.5 * math.sin(t))])
    pose("sprout", [("Y", 9.0 * math.sin(2 * t - 0.8))])
    for i in range(5):
        pose(f"tail{i + 1}", [("Z", 7.0 * math.sin(t - i * 0.7)), ("X", 2.0 * math.sin(t - i * 0.5))])
    pose("upperarm.L", [("Y", 4.0 * math.sin(t)), ("X", 3 * math.sin(t))])
    pose("upperarm.R", [("Y", -4.0 * math.sin(t)), ("X", 3 * math.sin(t))])
    key_all(f)

# Walk: camminata sul posto (33 frame, loop)
new_action("Walk", 33)
for f in range(1, 34, 2):
    t = (f - 1) / 32 * 2 * math.pi
    reset_pose()
    pose("hips", [("Z", 5 * math.sin(t))], loc=(0, 0, -0.012 * (1 + math.cos(2 * t)) / 2))
    pose("spine", [("Z", -4 * math.sin(t)), ("X", 4)])
    pose("head", [("Z", -2 * math.sin(t)), ("X", -4)])
    pose("sprout", [("Y", 10 * math.sin(t - 1.0))])
    for s, sfx in ((1, "L"), (-1, "R")):
        ph = t if s > 0 else t + math.pi
        th = 28 * math.sin(ph)
        sh = 40 * max(0.0, -math.cos(ph))
        pose(f"thigh.{sfx}", [("X", th)])
        pose(f"shin.{sfx}", [("X", sh)])
        pose(f"foot.{sfx}", [("X", -0.5 * (th + sh))])
        pose(f"upperarm.{sfx}", [("X", -24 * math.sin(ph))])
        pose(f"forearm.{sfx}", [("X", -10 - 8 * math.sin(ph))])
    for i in range(5):
        pose(f"tail{i + 1}", [("Z", 9 * math.sin(t - i * 0.7))])
    key_all(f)

# Attack: carica, fendente con la foglia del braccio destro, ritorno (41 frame)
new_action("Attack", 41)
keys = {
    1: dict(),
    10: dict(hips=([("Z", -10)], (0, 0.03, -0.03)), spine=[("Z", -22), ("X", 6)], head=[("Z", 12)],
             upR=[("X", 55), ("Y", -35)], foR=[("X", 40)], upL=[("X", -25), ("Y", 15)], foL=[("X", -40)],
             tail=-14, thL=-12, thR=18, shL=20, shR=10),
    15: dict(hips=([("Z", 18)], (0, -0.05, -0.025)), spine=[("Z", 30), ("X", 10)], head=[("Z", -8)],
             upR=[("X", -75), ("Z", 35), ("Y", 20)], foR=[("X", -10)], upL=[("X", 20), ("Y", -10)], foL=[("X", -30)],
             tail=22, thL=-30, thR=25, shL=25, shR=15),
    19: dict(hips=([("Z", 24)], (0, -0.06, -0.02)), spine=[("Z", 38), ("X", 12)], head=[("Z", -12)],
             upR=[("X", -60), ("Z", 70), ("Y", 25)], foR=[("X", -5)], upL=[("X", 25), ("Y", -10)], foL=[("X", -30)],
             tail=28, thL=-30, thR=25, shL=25, shR=15),
    28: dict(hips=([("Z", 8)], (0, -0.02, -0.01)), spine=[("Z", 12), ("X", 4)], head=[("Z", -4)],
             upR=[("X", -20), ("Z", 20)], foR=[("X", -10)], upL=[("X", 8)], foL=[("X", -15)],
             tail=10, thL=-10, thR=8, shL=8, shR=5),
    41: dict(),
}
for f, k in keys.items():
    reset_pose()
    if k:
        rots, loc = k["hips"]
        pose("hips", rots, loc)
        pose("spine", k["spine"])
        pose("head", k["head"])
        pose("upperarm.R", k["upR"]); pose("forearm.R", k["foR"])
        pose("upperarm.L", k["upL"]); pose("forearm.L", k["foL"])
        for i in range(5):
            pose(f"tail{i + 1}", [("Z", k["tail"] * (0.6 + 0.2 * i))])
        pose("thigh.L", [("X", k["thL"])]); pose("thigh.R", [("X", k["thR"])])
        pose("shin.L", [("X", k["shL"])]); pose("shin.R", [("X", k["shR"])])
        pose("sprout", [("Y", -k["tail"] * 0.8)])
    key_all(f)

# Ogni azione su una traccia NLA (così restano separate nei formati di scambio)
for act in actions:
    tr = arm.animation_data.nla_tracks.new()
    tr.name = act.name
    tr.strips.new(act.name, 1, act)
    tr.mute = True
arm.animation_data.action = bpy.data.actions["Idle"]
reset_pose()
scene.frame_start, scene.frame_end = 1, 61
scene.frame_set(1)

# ---------------------------------------------------------------------------
# Esportazione
# ---------------------------------------------------------------------------
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "Felcio.blend"), compress=True)

bpy.ops.export_scene.gltf(
    filepath=os.path.join(OUT, "Felcio.glb"),
    export_format="GLB",
    export_animations=True,
    export_animation_mode="ACTIONS",
    export_force_sampling=True,
    export_skins=True,
    export_yup=True,
)

bpy.ops.export_scene.fbx(
    filepath=os.path.join(OUT, "Felcio.fbx"),
    object_types={"ARMATURE", "MESH"},
    apply_unit_scale=True,
    apply_scale_options="FBX_SCALE_ALL",
    add_leaf_bones=False,
    primary_bone_axis="Y",
    secondary_bone_axis="X",
    armature_nodetype="NULL",
    bake_anim=True,
    bake_anim_use_all_actions=True,
    bake_anim_use_nla_strips=False,
    bake_anim_force_startend_keying=True,
    bake_anim_simplify_factor=0.0,
    path_mode="COPY",
    embed_textures=True,
)
print("Esportati: Felcio.blend, Felcio.glb, Felcio.fbx in", OUT)

# ---------------------------------------------------------------------------
# Anteprime (facoltative)
# ---------------------------------------------------------------------------
if RENDER:
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.render.resolution_x = scene.render.resolution_y = 900
    scene.render.film_transparent = True
    scene.render.use_freestyle = True
    scene.render.line_thickness_mode = "ABSOLUTE"
    scene.render.line_thickness = 1.6
    lset = scene.view_layers[0].freestyle_settings.linesets[0] if scene.view_layers[0].freestyle_settings.linesets else scene.view_layers[0].freestyle_settings.linesets.new("Linee")
    if lset.linestyle is None:
        lset.linestyle = bpy.data.linestyles.new("Linee")
    lset.linestyle.color = (0.06, 0.12, 0.09)
    world = bpy.data.worlds.new("Mondo")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.75, 0.82, 0.8, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.9
    scene.world = world
    sun = bpy.data.objects.new("Sole", bpy.data.lights.new("Sole", "SUN"))
    sun.data.energy = 3.2
    sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
    scene.collection.objects.link(sun)
    cam = bpy.data.objects.new("Camera", bpy.data.cameras.new("Camera"))
    cam.data.lens = 60
    scene.collection.objects.link(cam)
    scene.camera = cam
    target = V(0, 0.08, 0.46)

    def shoot(name, az, el=12, dist=2.3, frame_no=None, action=None):
        if action:
            arm.animation_data.action = bpy.data.actions[action]
        if frame_no:
            scene.frame_set(frame_no)
        a, e = math.radians(az), math.radians(el)
        cam.location = target + Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * dist * S
        cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(OUT, "anteprime", name + ".png")
        bpy.ops.render.render(write_still=True)

    shoot("fronte", 0, frame_no=1, action="Idle")
    shoot("tre_quarti", -35)
    shoot("lato", -90, el=8)
    shoot("retro", 160, el=18)
    shoot("attacco", -25, frame_no=17, action="Attack")
    shoot("camminata", -60, frame_no=9, action="Walk")
    arm.animation_data.action = bpy.data.actions["Idle"]
    scene.frame_set(1)
