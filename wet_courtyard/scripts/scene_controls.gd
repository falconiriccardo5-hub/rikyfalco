extends Node3D
## Controlli della scena. Servono a capire cosa fa ogni impostazione:
## accendi e spegni un effetto alla volta e guarda cosa cambia.
##
##   1 Glow (bloom)   2 SSAO   3 Riflessi SSR   4 Nebbia volumetrica
##   5 Pioggia/pozzanghere   6 SDFGI (luce indiretta)   7 Nebbia semplice
##   E cambia effetto (acqua/fuoco)   Spazio ripete la comparsa
##   H nasconde il testo   Mouse: ruota/zoom

@onready var world_env: WorldEnvironment = $WorldEnvironment
@onready var rain: GPUParticles3D = $Rain
@onready var cam: Camera3D = $Camera
@onready var water: Node3D = $WaterCircle
@onready var rune: Node3D = $RuneCircle
@onready var label: Label = $UI/Label
@onready var floor_mesh: MeshInstance3D = $Architecture/Floor

var _fire := false
var _shot_path := ""
var _shot_after := 150
var _frames := 0
var _elapsed := 0.0
var _switch_at := 0.0


func _ready() -> void:
	var args := {}
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--"):
			var kv := a.substr(2).split("=", true, 1)
			args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	_fire = args.get("effect", "water") == "fire"
	if args.has("yaw"): cam.yaw = float(args["yaw"])
	if args.has("pitch"): cam.pitch = deg_to_rad(float(args["pitch"]))
	if args.has("dist"): cam.distance = float(args["dist"])
	if args.has("hide"): label.visible = false
	if args.has("orbit"): cam.auto_rotate = float(args["orbit"])
	if args.has("switch"): _switch_at = float(args["switch"])
	if args.has("cycle"): (water as MagicCircle).cycle_colors = args["cycle"] == "1"
	if args.has("off"):
		for k in str(args["off"]).split(","):
			_toggle(k)
	if args.has("on"):
		for k in str(args["on"]).split(","):
			_toggle(k)
	if args.has("shot"):
		_shot_path = args["shot"]
		_shot_after = int(args.get("frames", 150))
		label.visible = false
	_apply_effect()
	_update_label()


func _apply_effect() -> void:
	water.visible = not _fire
	water.process_mode = Node.PROCESS_MODE_DISABLED if _fire else Node.PROCESS_MODE_INHERIT
	rune.visible = _fire
	rune.process_mode = Node.PROCESS_MODE_INHERIT if _fire else Node.PROCESS_MODE_DISABLED
	((rune if _fire else water) as MagicCircle).play()


func _toggle(key: String) -> void:
	var e := world_env.environment
	match key:
		"glow": e.glow_enabled = not e.glow_enabled
		"ssao": e.ssao_enabled = not e.ssao_enabled
		"ssr": e.ssr_enabled = not e.ssr_enabled
		"vfog": e.volumetric_fog_enabled = not e.volumetric_fog_enabled
		"sdfgi": e.sdfgi_enabled = not e.sdfgi_enabled
		"fog": e.fog_enabled = not e.fog_enabled
		"rain":
			rain.emitting = not rain.emitting
			(floor_mesh.material_override as ShaderMaterial).set_shader_parameter("rain", 1.0 if rain.emitting else 0.0)


func _unhandled_key_input(event: InputEvent) -> void:
	if not (event is InputEventKey and event.pressed and not event.echo):
		return
	match event.keycode:
		KEY_1: _toggle("glow")
		KEY_2: _toggle("ssao")
		KEY_3: _toggle("ssr")
		KEY_4: _toggle("vfog")
		KEY_5: _toggle("rain")
		KEY_6: _toggle("sdfgi")
		KEY_7: _toggle("fog")
		KEY_E:
			_fire = not _fire
			_apply_effect()
		KEY_SPACE: ((rune if _fire else water) as MagicCircle).play()
		KEY_H: label.visible = not label.visible
	_update_label()


func _update_label() -> void:
	var e := world_env.environment
	var f := func(on: bool) -> String: return "ON " if on else "off"
	label.text = "[1] Glow %s   [2] SSAO %s   [3] SSR %s   [4] Nebbia vol. %s\n[5] Pioggia %s   [6] SDFGI %s   [7] Nebbia %s\n[E] Effetto: %s   [Spazio] Ripeti   [H] Nascondi   Mouse: ruota/zoom" % [
		f.call(e.glow_enabled), f.call(e.ssao_enabled), f.call(e.ssr_enabled), f.call(e.volumetric_fog_enabled),
		f.call(rain.emitting), f.call(e.sdfgi_enabled), f.call(e.fog_enabled),
		"cerchio infuocato" if _fire else "pozza d'acqua"]


func _process(delta: float) -> void:
	_elapsed += delta
	if _switch_at > 0.0 and _elapsed >= _switch_at and not _fire:
		_fire = true
		_apply_effect()
	if _shot_path == "":
		return
	_frames += 1
	if _frames == _shot_after:
		get_viewport().get_texture().get_image().save_png(_shot_path)
		get_tree().quit()
