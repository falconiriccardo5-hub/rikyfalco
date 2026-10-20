extends ColorRect
## Controller del post-process a schermo intero (shaders/post_fx.gdshader).
## IceUltimate chiama pulse() negli istanti chiave (impatto, detonazione).

@export var base_vignette := 0.55

var _mat: ShaderMaterial
var _tween: Tween


func _ready() -> void:
	add_to_group(&"vfx_post_fx")
	_mat = material as ShaderMaterial
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func pulse(chroma: float, blur: float, flash: float, duration: float) -> void:
	if _mat == null:
		return
	if _tween:
		_tween.kill()
	_mat.set_shader_parameter(&"chroma", chroma)
	_mat.set_shader_parameter(&"radial_blur", blur)
	_mat.set_shader_parameter(&"flash", flash)
	_tween = create_tween().set_parallel().set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	_tween.tween_method(func(v): _mat.set_shader_parameter(&"chroma", v), chroma, 0.0, duration)
	_tween.tween_method(func(v): _mat.set_shader_parameter(&"radial_blur", v), blur, 0.0, duration * 0.8)
	_tween.tween_method(func(v): _mat.set_shader_parameter(&"flash", v), flash, 0.0, duration * 0.5)
