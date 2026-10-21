"""Flipbook volumetrici (sprite sheet 8x8) renderizzati con Cycles per Godot.

Uso (headless), Blender 4.2+ / 5.x:
  blender -b --python blender/flipbooks.py -- [smoke|explosion|frost|all] [--size 256] [--samples 32]
oppure con il modulo `bpy` di PyPI:
  python blender/flipbooks.py -- all

Tecnica: niente simulazione fluida. Una sfera con Principled Volume la cui
densita' = rumore 4D animato (W = tempo) meno una falloff radiale in
espansione. E' il metodo "procedural volume" usato per i flipbook stilizzati:
deterministico, veloce e facile da ritoccare (vedi i parametri in PRESETS).
Il risultato e' bianco/grigio con alpha: la tinta finale si da' in Godot.

Output: textures/flipbooks/<nome>_8x8.png
"""
import math
import os
import sys

import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "textures", "flipbooks")
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def opt(name, default):
    if name in args:
        return type(default)(args[args.index(name) + 1])
    return default


SIZE = opt("--size", 256)
SAMPLES = opt("--samples", 32)
GRID = 8
FRAMES = GRID * GRID

# Parametri dei tre flipbook. Tutti i valori sono "curve" (inizio, fine) sul tempo 0..1.
PRESETS = {
    # sbuffo di fumo/nebbia morbido che si allarga e svanisce
    "smoke_puff": dict(
        radius=(0.55, 1.0), noise_scale=1.6, detail=4.0, roughness=0.6, distortion=0.25,
        density=(25.0, 0.0), threshold=(0.0, 0.25), emission=(0.0, 0.0), rise=0.25, squash=1.0,
        speed=0.9, color=(0.93, 0.95, 1.0),
    ),
    # esplosione: nucleo emissivo che si spegne, volume che si espande veloce
    "explosion": dict(
        radius=(0.25, 1.0), noise_scale=2.2, detail=5.0, roughness=0.65, distortion=0.6,
        density=(40.0, 0.0), threshold=(-0.1, 0.3), emission=(40.0, 0.0), rise=0.15, squash=1.0,
        speed=1.6, color=(0.9, 0.94, 1.0), ease=0.35,
    ),
    # nube di gelo bassa e schiacciata (onda a terra / mist del sigillo)
    "frost_cloud": dict(
        radius=(0.45, 1.0), noise_scale=2.6, detail=5.0, roughness=0.7, distortion=0.4,
        density=(25.0, 0.0), threshold=(0.0, 0.3), emission=(0.0, 0.0), rise=0.0, squash=0.45,
        speed=0.7, color=(0.85, 0.92, 1.0),
    ),
}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True
    sc.cycles.volume_step_rate = 3.0
    sc.cycles.volume_max_steps = 96
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.max_bounces = 4
    sc.cycles.volume_bounces = 1
    sc.render.film_transparent = True
    sc.render.resolution_x = SIZE
    sc.render.resolution_y = SIZE
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.view_settings.view_transform = "Standard"
    sc.frame_start = 1
    sc.frame_end = FRAMES
    w = bpy.data.worlds.new("W")
    sc.world = w
    w.color = (0.12, 0.13, 0.15)
    return sc


def lights_and_camera(sc):
    bpy.ops.object.camera_add(location=(0, -10, 0), rotation=(math.pi / 2, 0, 0))
    cam = bpy.context.object
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 2.3
    sc.camera = cam
    bpy.ops.object.light_add(type="SUN")
    key = bpy.context.object
    key.data.energy = 5.0
    key.rotation_euler = (math.radians(50), math.radians(25), math.radians(30))
    bpy.ops.object.light_add(type="SUN")
    rim = bpy.context.object
    rim.data.energy = 2.0
    rim.data.color = (0.75, 0.85, 1.0)
    rim.rotation_euler = (math.radians(-120), 0, math.radians(-20))


def ramp(nt, frm, to, ease=1.0):
    """Value node animato da `frm` a `to` lungo i frame (con esponente di easing)."""
    v = nt.nodes.new("ShaderNodeValue")
    sc = bpy.context.scene
    for f in range(1, FRAMES + 1):
        t = (f - 1) / (FRAMES - 1)
        te = t ** ease
        v.outputs[0].default_value = frm + (to - frm) * te
        v.outputs[0].keyframe_insert("default_value", frame=f)
    return v.outputs[0]


def math_node(nt, op, a, b=None):
    m = nt.nodes.new("ShaderNodeMath")
    m.operation = op
    for i, x in enumerate((a, b)):
        if x is None:
            continue
        if isinstance(x, (int, float)):
            m.inputs[i].default_value = x
        else:
            nt.links.new(x, m.inputs[i])
    return m.outputs[0]


def build_volume(p):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.15)
    ob = bpy.context.object
    mat = bpy.data.materials.new("Vol")
    ob.data.materials.append(mat)
    nt = mat.node_tree if mat.node_tree else None
    if nt is None:
        mat.use_nodes = True
        nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    ease = p.get("ease", 1.0)

    # coordinate oggetto, con salita e schiacciamento verticale
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    rise = ramp(nt, 0.0, p["rise"])
    z = math_node(nt, "SUBTRACT", sep.outputs["Z"], rise)
    z = math_node(nt, "DIVIDE", z, p["squash"])
    comb = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(sep.outputs["X"], comb.inputs["X"])
    nt.links.new(sep.outputs["Y"], comb.inputs["Y"])
    nt.links.new(z, comb.inputs["Z"])
    vec = comb.outputs[0]

    # rumore 4D animato
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.noise_dimensions = "4D"
    noise.inputs["Scale"].default_value = p["noise_scale"]
    noise.inputs["Detail"].default_value = p["detail"]
    noise.inputs["Roughness"].default_value = p["roughness"]
    noise.inputs["Distortion"].default_value = p["distortion"]
    nt.links.new(vec, noise.inputs["Vector"])
    nt.links.new(ramp(nt, 0.0, p["speed"]), noise.inputs["W"])

    # falloff radiale con raggio in espansione
    vlen = nt.nodes.new("ShaderNodeVectorMath")
    vlen.operation = "LENGTH"
    nt.links.new(vec, vlen.inputs[0])
    radius = ramp(nt, p["radius"][0], p["radius"][1], ease)
    rn = math_node(nt, "DIVIDE", vlen.outputs["Value"], radius)       # 0 centro .. 1 bordo
    # forma = (1 - distanza) + rumore centrato * ampiezza - soglia  -> bordi "a cavolfiore"
    n_c = math_node(nt, "SUBTRACT", noise.outputs["Fac"], 0.5)
    n_c = math_node(nt, "MULTIPLY", n_c, p.get("billow", 1.6))
    shape = math_node(nt, "SUBTRACT", 1.0, rn)
    shape = math_node(nt, "ADD", shape, n_c)
    shape = math_node(nt, "SUBTRACT", shape, ramp(nt, p["threshold"][0], p["threshold"][1]))
    shape = math_node(nt, "MAXIMUM", shape, 0.0)
    shape = math_node(nt, "MINIMUM", shape, 0.35)
    dens = math_node(nt, "MULTIPLY", shape, ramp(nt, p["density"][0], p["density"][1], 0.8))

    pv = nt.nodes.new("ShaderNodeVolumePrincipled")
    pv.inputs["Color"].default_value = (*p["color"], 1.0)
    pv.inputs["Anisotropy"].default_value = 0.25
    nt.links.new(dens, pv.inputs["Density"])
    if p["emission"][0] > 0.0:
        core = math_node(nt, "SUBTRACT", 0.6, rn)
        core = math_node(nt, "MAXIMUM", core, 0.0)
        core = math_node(nt, "MULTIPLY", core, noise.outputs["Fac"])
        em = math_node(nt, "MULTIPLY", core, ramp(nt, p["emission"][0], p["emission"][1], 0.5))
        pv.inputs["Emission Color"].default_value = (0.9, 0.95, 1.0, 1.0)
        nt.links.new(em, pv.inputs["Emission Strength"])
    nt.links.new(pv.outputs[0], out.inputs["Volume"])
    return ob


def assemble(name, frames_dir):
    import numpy as np
    cell = SIZE
    W = cell * GRID
    atlas = np.zeros((W, W, 4), np.float32)
    for i in range(FRAMES):
        img = bpy.data.images.load(os.path.join(frames_dir, f"f_{i + 1:04d}.png"))
        px = np.empty(cell * cell * 4, np.float32)
        img.pixels.foreach_get(px)
        bpy.data.images.remove(img)
        # Blender ha l'origine in basso a sinistra: la riga 0 dell'atlas e' in alto
        cx, cy = (i % GRID) * cell, (GRID - 1 - i // GRID) * cell
        atlas[cy:cy + cell, cx:cx + cell] = px.reshape(cell, cell, 4)
    out_img = bpy.data.images.new(name, W, W, alpha=True)
    out_img.pixels.foreach_set(atlas.ravel())
    out_img.filepath_raw = os.path.join(OUT, f"{name}_8x8.png")
    out_img.file_format = "PNG"
    out_img.save()
    print(f"[{name}] -> {out_img.filepath_raw}", flush=True)


def render_flipbook(name):
    sc = reset()
    lights_and_camera(sc)
    build_volume(PRESETS[name])
    test = opt("--test", 0)
    if test:  # anteprima veloce: rende solo alcuni frame in un'unica striscia
        os.makedirs(os.path.join(OUT, "_test"), exist_ok=True)
        for f in (2, 12, 24, 40, 56):
            sc.frame_set(f)
            sc.render.filepath = os.path.join(OUT, "_test", f"{name}_{f:02d}.png")
            bpy.ops.render.render(write_still=True)
        return
    frames_dir = os.path.join(OUT, "_frames", name)
    os.makedirs(frames_dir, exist_ok=True)
    sc.render.filepath = os.path.join(frames_dir, "f_")
    print(f"[{name}] render {FRAMES} frame {SIZE}px...", flush=True)
    bpy.ops.render.render(animation=True)
    assemble(name, frames_dir)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    # i frame intermedi non devono essere importati da Godot
    for d in ("_frames", "_test"):
        os.makedirs(os.path.join(OUT, d), exist_ok=True)
        open(os.path.join(OUT, d, ".gdignore"), "w").close()
    which = args[0] if args and not args[0].startswith("--") else "all"
    names = list(PRESETS) if which == "all" else [n for n in PRESETS if n.startswith(which)]
    for n in names:
        render_flipbook(n)
