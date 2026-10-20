extends OmniLight3D
## Tremolio di una fiamma: somma di due seni + rumore, attorno all'energia base.

@export var flicker := 0.18
@export var speed := 11.0

var _base := 1.0
var _seed := randf() * 100.0


func _ready() -> void:
	_base = light_energy


func _process(_delta: float) -> void:
	var t := Time.get_ticks_msec() / 1000.0 * speed + _seed
	var f := sin(t) * 0.4 + sin(t * 2.37 + 1.3) * 0.35 + sin(t * 5.1) * 0.25
	light_energy = _base * (1.0 + f * flicker)
