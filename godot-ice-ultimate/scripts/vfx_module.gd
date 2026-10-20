@tool
class_name VfxModule
extends Node3D
## Classe base dei moduli VFX.
## Ogni modulo espone pochi parametri "macro" (es. reveal, intensity, grow)
## che l'AnimationPlayer di ice_ultimate.tscn anima nel tempo. I setter
## traducono quei valori nei parametri degli shader dei nodi figli, quindi
## lo scrubbing della timeline nell'editor mostra l'anteprima in tempo reale.


## Imposta un parametro dello ShaderMaterial (material_override) di un figlio.
func set_param(path: NodePath, param: StringName, value: Variant) -> void:
	var n := get_node_or_null(path) as GeometryInstance3D
	if n == null:
		return
	var mat := n.material_override as ShaderMaterial
	if mat:
		mat.set_shader_parameter(param, value)


## Accende/spegne un emettitore continuo.
func set_emitting(path: NodePath, on: bool) -> void:
	var p := get_node_or_null(path) as GPUParticles3D
	if p and p.emitting != on:
		p.emitting = on


## Fa ripartire tutte le particelle one-shot del modulo (chiamato dalla timeline).
func burst() -> void:
	_restart_one_shots(self)


func _restart_one_shots(node: Node) -> void:
	for c in node.get_children():
		if c is GPUParticles3D and c.one_shot:
			c.restart()
		_restart_one_shots(c)


func _ready() -> void:
	_apply()


## Da sovrascrivere: applica i parametri macro ai figli.
func _apply() -> void:
	pass
