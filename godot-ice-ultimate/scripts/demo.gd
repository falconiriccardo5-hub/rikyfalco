extends Node3D
## Scena demo: rilancia l'abilita' con Spazio / Invio / click,
## oppure in loop automatico.
## Debug: `godot --path . -- --seek=7.5` blocca l'effetto all'istante 7.5 s.

@export var loop := true
@export var loop_delay := 1.0

@onready var ult: IceUltimate = $IceUltimate


func _ready() -> void:
	ult.finished.connect(_on_finished)
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--seek="):
			loop = false
			ult.play()
			ult.anim.seek(arg.trim_prefix("--seek=").to_float(), true)
			ult.anim.pause()
			return
	await get_tree().create_timer(0.4).timeout
	ult.play()


func _on_finished() -> void:
	if loop:
		await get_tree().create_timer(loop_delay).timeout
		ult.play()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed(&"ui_accept") or (event is InputEventMouseButton and event.pressed):
		ult.play()
