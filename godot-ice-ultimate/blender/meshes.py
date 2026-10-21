"""Modella le mesh dell'effetto e le esporta in glTF (.glb) per Godot.

Uso (headless), Blender 4.2+ / 5.x:
  blender -b --python blender/meshes.py
oppure con il modulo `bpy` di PyPI:
  python blender/meshes.py

Output in models/:
  swirl_ribbon.glb    nastro a spirale con UV (u = lunghezza, v = larghezza) per le scie
  crescent.glb        mezzaluna affusolata (scie a "C" di spada, carica, satelliti)
  shock_dome.glb      cupola per l'onda d'urto della detonazione
  ice_sword.glb       spada di ghiaccio (punta all'origine, verso il basso)
  crystal_a.glb       cristallo tozzo sfaccettato (base a y=0, punta a y=1)
  crystal_b.glb       cristallo lungo a lama (bracci a fiocco di neve)
  caster.glb          personaggio low-poly con scheletro e animazioni "idle" e "cast"

Convenzioni: in Blender Z e' l'alto; l'exporter glTF converte in Y-up.
Ogni funzione build_* e' indipendente: modifica i parametri e riesegui.
"""
import math
import os
import random
import sys

import bpy  # deve precedere bmesh quando si usa il modulo bpy di PyPI
import bmesh
from mathutils import Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "models")
# `-- --fbx <cartella>` esporta anche in FBX (per Unity) nella cartella indicata
_args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
FBX_OUT = _args[_args.index("--fbx") + 1] if "--fbx" in _args else None


# ------------------------------------------------------------------ util
def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def new_object(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def export(objects, filename, animations=False):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    path = os.path.join(OUT, filename)
    kw = dict(filepath=path, export_format="GLB", use_selection=True, export_apply=True,
              export_yup=True, export_animations=animations)
    if animations:
        kw["export_animation_mode"] = "ACTIONS"
    bpy.ops.export_scene.gltf(**kw)
    print("  ->", os.path.relpath(path, ROOT), flush=True)
    if FBX_OUT:
        export_fbx(objects, filename.replace(".glb", ".fbx"), animations)


def export_fbx(objects, filename, animations):
    """FBX per Unity: Y-up, -Z forward (il fronte -Y di Blender diventa +Z in Unity).
    Le mesh statiche hanno la conversione d'assi applicata ai vertici (niente
    rotazione di -90 gradi sull'oggetto); il personaggio esporta le azioni come clip."""
    os.makedirs(FBX_OUT, exist_ok=True)
    path = os.path.join(FBX_OUT, filename)
    has_armature = any(o.type == "ARMATURE" for o in objects)
    kw = dict(filepath=path, use_selection=True, apply_scale_options="FBX_SCALE_ALL",
              axis_forward="-Z", axis_up="Y", use_mesh_modifiers=True, mesh_smooth_type="FACE",
              add_leaf_bones=False, bake_space_transform=not has_armature,
              object_types={"MESH", "ARMATURE"}, bake_anim=animations)
    if animations:
        kw.update(bake_anim_use_all_actions=True, bake_anim_use_nla_strips=False,
                  bake_anim_force_startend_keying=True, bake_anim_simplify_factor=0.0)
    bpy.ops.export_scene.fbx(**kw)
    print("  ->", path, flush=True)


def flat_shade(ob):
    for p in ob.data.polygons:
        p.use_smooth = False


def set_material(ob, name, color=(0.8, 0.9, 1.0, 1.0), roughness=0.6):
    """Materiale base: l'exporter glTF legge il nodo Principled BSDF, non diffuse_color."""
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    if mat.node_tree is None:
        mat.use_nodes = True
    bsdf = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        bsdf = mat.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
        out = next(n for n in mat.node_tree.nodes if n.type == "OUTPUT_MATERIAL")
        mat.node_tree.links.new(bsdf.outputs[0], out.inputs["Surface"])
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    ob.data.materials.append(mat)


def strip(bm, uv, rows, cols, closed=False):
    """Crea facce da una griglia di vertici rows x cols (lista di liste) con UV."""
    for i in range(rows - 1):
        for j in range(cols - 1):
            vs = (grid_v[i][j], grid_v[i][j + 1], grid_v[i + 1][j + 1], grid_v[i + 1][j])
            f = bm.faces.new(vs)
            for loop, (a, b) in zip(f.loops, ((i, j), (i, j + 1), (i + 1, j + 1), (i + 1, j))):
                loop[uv].uv = grid_uv[a][b]


grid_v = []
grid_uv = []


# ------------------------------------------------------------------ ribbon
def build_swirl_ribbon(turns=1.15, r0=0.55, r1=0.32, height=1.0, width=0.32, segs=96):
    """Nastro elicoidale: il ribbon "avvolge" un asse verticale come un vortice."""
    global grid_v, grid_uv
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    grid_v, grid_uv = [], []
    for i in range(segs + 1):
        t = i / segs
        a = t * turns * math.tau
        r = r0 + (r1 - r0) * t
        c = Vector((math.cos(a) * r, math.sin(a) * r, t * height))
        # larghezza affusolata alle estremita'; il nastro e' inclinato verso l'asse
        w = width * math.sin(math.pi * min(1.0, t * 1.15)) ** 0.6
        up = Vector((0, 0, 1))
        inward = Vector((-math.cos(a), -math.sin(a), 0)) * 0.35
        d = (up + inward).normalized() * w * 0.5
        grid_v.append([bm.verts.new(c - d), bm.verts.new(c + d)])
        grid_uv.append([(t, 0.0), (t, 1.0)])
    strip(bm, uv, segs + 1, 2)
    ob = new_object("SwirlRibbon", bm)
    set_material(ob, "Trail")
    export([ob], "swirl_ribbon.glb")


def build_crescent(arc_deg=230.0, radius=0.5, width=0.16, thickness=0.025, segs=72):
    """Mezzaluna: arco piatto con larghezza a fuso (punte sottili, ventre largo)."""
    global grid_v, grid_uv
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    grid_v, grid_uv = [], []
    a0 = math.radians(90 - arc_deg / 2)
    for i in range(segs + 1):
        s = i / segs
        a = a0 + math.radians(arc_deg) * s
        w = width * math.sin(math.pi * s) ** 0.8
        dirv = Vector((math.cos(a), 0.0, math.sin(a)))
        outer = dirv * radius
        inner = dirv * (radius - w)
        # sezione a lente: leggero spessore in Y al centro della lama
        mid = dirv * (radius - w * 0.45) + Vector((0, -thickness * math.sin(math.pi * s), 0))
        grid_v.append([bm.verts.new(inner), bm.verts.new(mid), bm.verts.new(outer)])
        grid_uv.append([(s, 0.0), (s, 0.5), (s, 1.0)])
    strip(bm, uv, segs + 1, 3)
    ob = new_object("Crescent", bm)
    set_material(ob, "Trail")
    export([ob], "crescent.glb")


def build_shock_dome(radius=1.0, segs=48, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings * 2, radius=radius)
    ob = bpy.context.object
    ob.name = "ShockDome"
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context="VERTS")
    bm.to_mesh(ob.data)
    bm.free()
    for p in ob.data.polygons:
        p.use_smooth = True
    set_material(ob, "Dome")
    export([ob], "shock_dome.glb")


# ------------------------------------------------------------------ ice
def hull_crystal(name, seed, sides, rings, height, radius, tip_offset, jitter):
    """Cristallo sfaccettato: convex hull di anelli di punti irregolari + punta."""
    rnd = random.Random(seed)
    bm = bmesh.new()
    for k, (z, rr) in enumerate(rings):
        rot = rnd.uniform(0, math.tau)
        for i in range(sides):
            a = rot + i * math.tau / sides + rnd.uniform(-jitter, jitter)
            r = radius * rr * rnd.uniform(0.8, 1.1)
            bm.verts.new((math.cos(a) * r, math.sin(a) * r, z * height))
    bm.verts.new((tip_offset[0], tip_offset[1], height))
    bmesh.ops.convex_hull(bm, input=bm.verts)
    # UV: u = angolo, v = altezza (usato da dissolve ed emissione negli shader)
    uv = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        for loop in f.loops:
            co = loop.vert.co
            loop[uv].uv = ((math.atan2(co.y, co.x) / math.tau) % 1.0, co.z / height)
    ob = new_object(name, bm)
    flat_shade(ob)
    set_material(ob, "Ice")
    return ob


def build_crystals():
    # normalizzati: base a z=0, punta a z=1, larghezza ~1 (lo script Godot li scala)
    a = hull_crystal("CrystalA", 3, 6, [(0.0, 0.5), (0.55, 0.48), (0.78, 0.3)], 1.0, 1.0, (0.06, 0.03), 0.25)
    export([a], "crystal_a.glb")
    b = hull_crystal("CrystalB", 8, 5, [(0.0, 0.5), (0.35, 0.45), (0.85, 0.22)], 1.0, 1.0, (0.0, 0.0), 0.15)
    export([b], "crystal_b.glb")


def build_sword():
    """Spada di ghiaccio conficcata a terra: punta all'origine, elsa in alto."""
    bm = bmesh.new()
    blade_len, half_w, half_t = 4.2, 0.2, 0.05
    # lama: sezione a rombo, dalla punta (z=0) alla guardia (z=blade_len)
    prof = [(0.0, 0.0), (0.35, 0.65), (1.0, 1.0)]  # (frazione altezza, frazione larghezza)
    layers = []
    for fz, fw in prof:
        z = fz * blade_len
        w, t = half_w * fw, half_t * fw
        layers.append([bm.verts.new(p) for p in ((w, 0, z), (0, t, z), (-w, 0, z), (0, -t, z))])
    for a, b in zip(layers, layers[1:]):
        for i in range(4):
            bm.faces.new((a[i], a[(i + 1) % 4], b[(i + 1) % 4], b[i]))
    # guardia: barra a rombo + due corna a mezzaluna
    gz = blade_len
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, 0, gz + 0.06)) @ Matrix.Diagonal((0.9, 0.14, 0.12, 1)))
    for side in (-1, 1):
        prev = None
        for i in range(9):
            s = i / 8
            ang = math.radians(10 + 70 * s)
            x = side * (0.45 + math.sin(ang) * 0.35)
            z = gz + 0.06 + (1 - math.cos(ang)) * 0.55
            w = 0.07 * (1 - s) + 0.01
            ring = [bm.verts.new((x + dx, dy, z)) for dx, dy in ((w, 0), (0, w), (-w, 0), (0, -w))]
            if prev:
                for k in range(4):
                    bm.faces.new((prev[k], prev[(k + 1) % 4], ring[(k + 1) % 4], ring[k]))
            prev = ring
    # impugnatura e pomolo
    bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.05, radius2=0.05, depth=0.8,
                          matrix=Matrix.Translation((0, 0, gz + 0.55)))
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.1, matrix=Matrix.Translation((0, 0, gz + 1.0)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    uv = bm.loops.layers.uv.new("UVMap")
    top = gz + 1.1
    for f in bm.faces:
        for loop in f.loops:
            co = loop.vert.co
            loop[uv].uv = (0.5 + co.x, co.z / top)
    ob = new_object("IceSword", bm)
    flat_shade(ob)
    set_material(ob, "Ice")
    export([ob], "ice_sword.glb")


# ------------------------------------------------------------------ caster
def build_caster():
    """Personaggio low-poly con tunica, skinning rigido e due animazioni.

    Le parti sono unite in una sola mesh; ogni parte e' pesata al 100% sul suo
    osso (skinning rigido). Animazioni (azioni): "idle" (respiro, loop) e
    "cast" (10 s, sincronizzata con l'animazione "cast" di ice_ultimate.tscn).
    Il personaggio guarda verso -Y in Blender (= +Z in Godot).
    """
    arm_data = bpy.data.armatures.new("CasterRig")
    rig = bpy.data.objects.new("Caster", arm_data)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm_data.edit_bones

    def bone(name, head, tail, parent=None):
        b = eb.new(name)
        b.head, b.tail = head, tail
        if parent:
            b.parent = eb[parent]
        return b

    bone("Root", (0, 0, 0), (0, 0, 0.3))
    bone("Spine", (0, 0, 0.95), (0, 0, 1.4), "Root")
    bone("Head", (0, 0, 1.45), (0, 0, 1.8), "Spine")
    for s, x in (("L", 0.24), ("R", -0.24)):
        bone(f"UpperArm.{s}", (x, 0, 1.38), (x * 1.15, 0, 1.06), "Spine")
        bone(f"Forearm.{s}", (x * 1.15, 0, 1.06), (x * 1.2, -0.02, 0.78), f"UpperArm.{s}")
    bpy.ops.object.mode_set(mode="OBJECT")

    bm = bmesh.new()
    deform = bm.verts.layers.deform.verify()
    bone_names = ["Root", "Spine", "Head", "UpperArm.L", "Forearm.L", "UpperArm.R", "Forearm.R"]

    def add_part(bone_name, fn):
        # skinning rigido: i vertici nuovi pesano 1.0 sull'osso della parte
        before = set(bm.verts)
        fn()
        gi = bone_names.index(bone_name)
        for v in bm.verts:
            if v not in before:
                v[deform][gi] = 1.0

    # tunica (cono) e busto
    add_part("Root", lambda: bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.42, radius2=0.2, depth=1.0,
                                                    matrix=Matrix.Translation((0, 0, 0.5))))
    add_part("Spine", lambda: bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.2, radius2=0.24, depth=0.45,
                                                     matrix=Matrix.Translation((0, 0, 1.2))))
    # testa + capelli raccolti
    add_part("Head", lambda: bmesh.ops.create_icosphere(bm, subdivisions=2, radius=0.14,
                                                         matrix=Matrix.Translation((0, 0, 1.6))))
    add_part("Head", lambda: bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.07, radius2=0.0, depth=0.22,
                                                    matrix=Matrix.Translation((0, 0.08, 1.75)) @ Matrix.Rotation(math.radians(-35), 4, "X")))
    for s, x in (("L", 0.24), ("R", -0.24)):
        sx = 1 if x > 0 else -1
        add_part(f"UpperArm.{s}", lambda x=x: bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.07, radius2=0.08, depth=0.34,
                                                                     matrix=Matrix.Translation((x * 1.07, 0, 1.22))))
        # manica larga
        add_part(f"Forearm.{s}", lambda x=x: bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.13, radius2=0.06, depth=0.32,
                                                                    matrix=Matrix.Translation((x * 1.18, -0.01, 0.92))))
        add_part(f"Forearm.{s}", lambda x=x: bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.05,
                                                                         matrix=Matrix.Translation((x * 1.2, -0.02, 0.74))))
    body = new_object("CasterBody", bm)
    flat_shade(body)
    set_material(body, "Cloth", (0.035, 0.04, 0.05, 1.0), 0.45)
    for name in bone_names:  # stesso ordine degli indici del deform layer
        body.vertex_groups.new(name=name)
    body.parent = rig
    mod = body.modifiers.new("Armature", "ARMATURE")
    mod.object = rig

    # ---- animazioni (rotazioni in gradi sugli assi locali delle ossa)
    def pose(action_name, keys, length):
        act = bpy.data.actions.new(action_name)
        rig.animation_data_create()
        rig.animation_data.action = act
        fps = bpy.context.scene.render.fps
        for pb in rig.pose.bones:
            pb.rotation_mode = "XYZ"
        for t, values in keys:
            for pb in rig.pose.bones:
                rot = values.get(pb.name, (0, 0, 0))
                pb.rotation_euler = [math.radians(a) for a in rot]
                pb.keyframe_insert("rotation_euler", frame=1 + t * fps)
            rootz = values.get("_rootz", 0.0)
            rig.pose.bones["Root"].location = (0, rootz, 0)
            rig.pose.bones["Root"].keyframe_insert("location", frame=1 + t * fps)
        act.use_fake_user = True
        # in Blender 4.4+ le azioni hanno slot: i keyframe appena inseriti ne creano uno
        return act

    idle = {"Spine": (0, 0, 0), "UpperArm.L": (0, -8, 0), "UpperArm.R": (0, 8, 0)}
    breathe = {"Spine": (3, 0, 0), "Head": (-2, 0, 0), "UpperArm.L": (0, -10, 0), "UpperArm.R": (0, 10, 0)}
    pose("idle", [(0.0, idle), (1.5, breathe), (3.0, idle)], 3.0)

    thrust = {"Spine": (12, 0, -15), "Head": (-8, 0, 10), "UpperArm.R": (-80, 0, -20), "Forearm.R": (-15, 0, 0),
              "UpperArm.L": (20, -25, 0), "Forearm.L": (-40, 0, 0)}
    hold = {"Spine": (8, 0, -10), "Head": (-5, 0, 6), "UpperArm.R": (-70, 0, -15), "Forearm.R": (-10, 0, 0),
            "UpperArm.L": (15, -20, 0), "Forearm.L": (-35, 0, 0)}
    raise_ = {"Spine": (-10, 0, 0), "Head": (12, 0, 0), "UpperArm.R": (-150, 0, -25), "Forearm.R": (-20, 0, 0),
              "UpperArm.L": (-150, 0, 25), "Forearm.L": (-20, 0, 0)}
    slam = {"Spine": (25, 0, 0), "Head": (-15, 0, 0), "UpperArm.R": (-60, 0, -10), "Forearm.R": (-5, 0, 0),
            "UpperArm.L": (-60, 0, 10), "Forearm.L": (-5, 0, 0), "_rootz": 0.0}
    pose("cast", [
        (0.0, idle), (0.12, thrust), (0.5, hold), (2.4, hold), (3.2, idle),
        (5.0, idle), (5.5, raise_), (6.7, raise_), (6.9, slam), (7.6, hold), (9.0, idle), (10.0, idle),
    ], 10.0)
    rig.animation_data.action = None
    export([rig, body], "caster.glb", animations=True)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for fn in (build_swirl_ribbon, build_crescent, build_shock_dome, build_crystals, build_sword, build_caster):
        clear()
        fn()
