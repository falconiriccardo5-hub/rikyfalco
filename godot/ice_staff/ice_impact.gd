class_name IceImpact
extends Node2D
## Impatto del ghiaccio: lampo di luce fredda, onda d'urto che distorce lo
## schermo, schegge fisiche che rimbalzano, sbuffo di vapore, polvere di
## diamante e una chiazza di brina che resta sul terreno e poi si scioglie.

@export var strength := 1.0
@export var with_decal := true
## La brina va sotto i personaggi: z_index relativo al genitore.
@export var decal_z_index := -1

var normal := Vector2.LEFT

const WAVE_TIME := 0.4
const DECAL_TIME := 2.2

var _t := 0.0
var _wave: Sprite2D
var _flash: Sprite2D
var _decal: Sprite2D


func _ready() -> void:
	var s := strength
	var world := get_parent()

	if with_decal:
		_decal = IceFX.quad(IceFX.shader_material(IceFX.FROST_DECAL_SHADER), Vector2(84, 84) * s)
		_decal.z_index = decal_z_index
		_decal.scale.y *= 0.75  # leggera prospettiva sul terreno
		add_child(_decal)

	var wave_mat := IceFX.shader_material(IceFX.SHOCKWAVE_SHADER)
	_wave = IceFX.quad(wave_mat, Vector2(150, 150) * s)
	add_child(_wave)

	_flash = IceFX.glow(150.0 * s, Color(0.8, 0.94, 1.0, 0.9))
	add_child(_flash)

	IceFX.flash_light(world, global_position, 3.5 * s, 3.0 * s, 0.45)
	IceFragment.spawn_burst(world, global_position, int(10 * s), 60.0 * s, 240.0 * s,
		80.0, 320.0, 5.0 * s, 13.0 * s, normal, 1.2)
	IceFX.vapor_burst(world, global_position, int(12 * s), 15.0, 80.0, 0.95, 22.0 * s, 52.0 * s)
	IceFX.sparkle_burst(world, global_position, int(24 * s), 60.0 * s, 260.0 * s, 0.6,
		260.0, normal, 110.0)


func _process(delta: float) -> void:
	_t += delta
	var k := clampf(_t / WAVE_TIME, 0.0, 1.0)
	var e := 1.0 - pow(1.0 - k, 3.0)
	_wave.visible = k < 1.0
	_wave.material.set_shader_parameter("progress", e)
	_flash.modulate.a = 0.9 * pow(1.0 - clampf(_t / 0.2, 0.0, 1.0), 2.0)
	_flash.scale = Vector2.ONE * 150.0 * strength / 128.0 * (0.6 + 0.6 * e)
	if _decal:
		_decal.material.set_shader_parameter("grow", minf(_t / 0.12, 1.0) * 0.95)
		_decal.material.set_shader_parameter("fade", 1.0 - smoothstep(DECAL_TIME * 0.5, DECAL_TIME, _t))
	if _t >= (DECAL_TIME if _decal else WAVE_TIME):
		queue_free()
