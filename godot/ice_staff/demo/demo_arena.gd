class_name DemoArena
extends Node2D
## Ambiente della demo: pavimento di pietra illuminabile, torcia calda che
## tremola (contrasto caldo/freddo col ghiaccio) e vignettatura cinematografica.

const FLOOR_SHADER := preload("stone_floor.gdshader")
const VIGNETTE_SHADER := preload("vignette.gdshader")

var _torch: PointLight2D
var _time := 0.0


func _ready() -> void:
	var size := get_viewport_rect().size
	var ground := ColorRect.new()
	ground.size = size + Vector2(400, 400)
	ground.position = Vector2(-200, -200)
	var mat := ShaderMaterial.new()
	mat.shader = FLOOR_SHADER
	mat.set_shader_parameter("rect_size", ground.size)
	ground.material = mat
	ground.z_index = -10
	ground.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(ground)

	_torch = IceFX.light(0.9, 9.0)
	_torch.color = Color(1.0, 0.62, 0.3)
	_torch.position = Vector2(80, 60)
	add_child(_torch)

	var ambient := IceFX.light(0.22, 14.0)
	ambient.color = Color(0.45, 0.55, 0.85)
	ambient.position = size * 0.5
	add_child(ambient)

	var layer := CanvasLayer.new()
	layer.layer = 10
	var vignette := ColorRect.new()
	vignette.set_anchors_preset(Control.PRESET_FULL_RECT)
	vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var vmat := ShaderMaterial.new()
	vmat.shader = VIGNETTE_SHADER
	vignette.material = vmat
	layer.add_child(vignette)
	add_child(layer)


func _process(delta: float) -> void:
	_time += delta
	_torch.energy = 0.85 + 0.08 * sin(_time * 11.0) + 0.05 * sin(_time * 23.0)
