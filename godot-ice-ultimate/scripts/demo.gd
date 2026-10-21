extends Node3D
## Scena demo: rilancia l'abilita' con Spazio / Invio / click,
## oppure in loop automatico. Il caster (modello Blender) esegue l'animazione
## "cast" sincronizzata con l'effetto; caster e nemici sono in "idle" a riposo.
## Debug: `godot --path . -- --seek=7.5` blocca l'effetto all'istante 7.5 s.

@export var loop := true
@export var loop_delay := 1.0

@onready var ult: IceUltimate = $IceUltimate
@onready var caster_anim: AnimationPlayer = $Caster/AnimationPlayer


func _ready() -> void:
	for ap in find_children("AnimationPlayer", "AnimationPlayer", true, false):
		if ap.has_animation(&"idle"):
			ap.get_animation(&"idle").loop_mode = Animation.LOOP_LINEAR
			ap.play(&"idle")
			ap.seek(randf() * 2.0)
	caster_anim.animation_finished.connect(func(_n): caster_anim.play(&"idle"))
	ult.finished.connect(_on_finished)
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--seek="):
			var t := arg.trim_prefix("--seek=").to_float()
			loop = false
			_play()
			ult.anim.seek(t, true)
			ult.anim.pause()
			caster_anim.seek(t, true)
			caster_anim.pause()
			return
	await get_tree().create_timer(0.4).timeout
	_play()


func _play() -> void:
	caster_anim.play(&"cast", 0.15)
	caster_anim.seek(0.0, true)
	ult.play()


func _on_finished() -> void:
	if loop:
		await get_tree().create_timer(loop_delay).timeout
		_play()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed(&"ui_accept") or (event is InputEventMouseButton and event.pressed):
		_play()
