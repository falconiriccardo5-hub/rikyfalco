@tool
class_name IceUltimate
extends Node3D
## Ultimate di ghiaccio: orchestratore. Posiziona questo nodo SUL BERSAGLIO;
## `caster_offset` indica dove si trova chi lancia l'abilita' (in locale).
## Tutta la coreografia e' nella animazione "cast" dell'AnimationPlayer:
## apri ice_ultimate.tscn, seleziona AnimationPlayer e modifica le chiavi.

signal impact            ## la sfera colpisce il bersaglio
signal detonated         ## esplosione principale
signal finished          ## fine dell'effetto

@export var caster_offset := Vector3(2.6, 0.0, 5.0):
	set(v):
		caster_offset = v
		_layout()
@export var autoplay := false
@export_range(0.1, 3.0) var speed := 1.0

@onready var anim: AnimationPlayer = $AnimationPlayer


func _ready() -> void:
	_layout()
	if Engine.is_editor_hint():
		return
	anim.animation_finished.connect(func(_n): finished.emit())
	if autoplay:
		play()


func play() -> void:
	anim.speed_scale = speed
	anim.stop()
	anim.play(&"cast")


func _layout() -> void:
	if not is_node_ready():
		return
	var cf := get_node_or_null(^"CastFrost") as Node3D
	if cf:
		cf.position = caster_offset
	var orb := get_node_or_null(^"IceOrb")
	if orb:
		orb.start_point = caster_offset + Vector3(-0.3, 1.5, -0.4)


# ---- eventi chiamati dalle method track dell'animazione -------------------

## Scuote la camera (nodi nel gruppo "vfx_camera_shake").
func evt_shake(amount: float, duration: float) -> void:
	if Engine.is_editor_hint():
		return
	get_tree().call_group(&"vfx_camera_shake", &"add_shake", amount, duration)


## Impulso di post-process (nodi nel gruppo "vfx_post_fx").
func evt_post(chroma: float, blur: float, flash: float, duration: float) -> void:
	if Engine.is_editor_hint():
		return
	get_tree().call_group(&"vfx_post_fx", &"pulse", chroma, blur, flash, duration)


func evt_signal(sig: StringName) -> void:
	if Engine.is_editor_hint():
		return
	emit_signal(sig)


func evt_burst(module: NodePath) -> void:
	if Engine.is_editor_hint():
		return
	var m := get_node_or_null(module)
	if m and m.has_method(&"burst"):
		m.burst()
