class_name MagicCircle
extends Node3D
## Controller degli effetti ad area (pozza d'acqua / cerchio infuocato).
## Struttura dei nodi (vedi effects/*.tscn):
##   Surface  superficie con shader (acqua o rune)
##   Rim      corona di schiuma/fiamma attorno al bordo
##   Sparks   particelle (bolle o scintille)
##   Orbs     sfere luminose che girano (opzionale)
##   Light    luce che colora il pavimento bagnato
## Qui si anima solo: comparsa, cambio colore, orbite e pulsazione.

enum Kind { WATER, FIRE }

@export var kind: Kind = Kind.WATER
@export var cycle_colors := true
@export var seconds_per_color := 3.0
@export var orb_radius := 1.95
@export var orb_speed := 0.85

const WATER_PALETTE := [
	{"tint": Color(0.45, 0.8, 1.0), "deep": Color(0.015, 0.17, 0.6), "tip": Color(0.85, 0.97, 1.0)},
	{"tint": Color(0.3, 1.0, 0.72), "deep": Color(0.0, 0.34, 0.3), "tip": Color(0.85, 1.0, 0.95)},
]
const FIRE_PALETTE := [
	{"tint": Color(1.0, 0.42, 0.18), "deep": Color(1.0, 0.85, 0.6), "tip": Color(1.0, 0.8, 0.5)},
	{"tint": Color(1.0, 0.4, 0.62), "deep": Color(1.0, 0.82, 0.9), "tip": Color(1.0, 0.85, 0.9)},
	{"tint": Color(0.55, 0.35, 1.0), "deep": Color(0.85, 0.75, 1.0), "tip": Color(0.9, 0.85, 1.0)},
]

var _surface: ShaderMaterial
var _rim: ShaderMaterial
var _spark: ShaderMaterial
var _light: OmniLight3D
var _orbs: Node3D
var _tween: Tween
var _time := 0.0
var _reveal := 0.0
var _tint := Color.WHITE
var _deep := Color.WHITE
var _tip := Color.WHITE


func _ready() -> void:
	_surface = ($Surface as MeshInstance3D).material_override as ShaderMaterial
	_rim = ($Rim as MeshInstance3D).material_override as ShaderMaterial
	_spark = (($Sparks as GPUParticles3D).draw_pass_1 as QuadMesh).material as ShaderMaterial
	_light = $Light as OmniLight3D
	_orbs = get_node_or_null("Orbs") as Node3D
	var p: Dictionary = _palette()[0]
	_tint = p.tint
	_deep = p.deep
	_tip = p.tip
	play()


func _palette() -> Array:
	return WATER_PALETTE if kind == Kind.WATER else FIRE_PALETTE


## Ripete la comparsa: il cerchio si allarga con un piccolo rimbalzo.
func play() -> void:
	if _tween:
		_tween.kill()
	_tween = create_tween()
	_tween.tween_method(_set_reveal, 0.0, 1.0, 0.9).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	if cycle_colors:
		_tween.tween_interval(seconds_per_color)
		_tween.tween_callback(_cycle.bind(1))


func _cycle(index: int) -> void:
	var pal := _palette()
	var from := {"tint": _tint, "deep": _deep, "tip": _tip}
	var to: Dictionary = pal[index % pal.size()]
	_tween = create_tween()
	_tween.tween_method(func(k: float) -> void:
		_tint = from.tint.lerp(to.tint, k)
		_deep = from.deep.lerp(to.deep, k)
		_tip = from.tip.lerp(to.tip, k), 0.0, 1.0, 1.4)
	_tween.tween_interval(seconds_per_color)
	_tween.tween_callback(_cycle.bind(index + 1))


func _set_reveal(v: float) -> void:
	_reveal = v


func _process(delta: float) -> void:
	_time += delta
	var r := clampf(_reveal, 0.0, 1.0)
	_surface.set_shader_parameter("reveal", r)
	_rim.set_shader_parameter("reveal", r)
	_surface.set_shader_parameter("tint", _tint)
	_rim.set_shader_parameter("tint", _tint)
	_rim.set_shader_parameter("tip_tint", _tip)
	_spark.set_shader_parameter("tint", _tip)
	if kind == Kind.WATER:
		_surface.set_shader_parameter("deep", _deep)
	else:
		_surface.set_shader_parameter("hot", _deep)

	_light.light_color = _tint
	_light.light_energy = (1.5 + 0.2 * sin(_time * 3.1)) * r

	if _orbs:
		for i in _orbs.get_child_count():
			var orb := _orbs.get_child(i) as Node3D
			var a := _time * orb_speed + TAU * i / _orbs.get_child_count()
			var bob := 0.18 + 0.07 * sin(_time * 2.3 + i * 2.0)
			orb.position = Vector3(cos(a) * orb_radius * r, bob, sin(a) * orb_radius * r)
			var mi := orb.get_node_or_null("Mesh") as MeshInstance3D
			if mi:
				(mi.material_override as StandardMaterial3D).emission = _tip
			var ol := orb.get_node_or_null("Light") as OmniLight3D
			if ol:
				ol.light_color = _tint
