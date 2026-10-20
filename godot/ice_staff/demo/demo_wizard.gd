extends CharacterBody2D
## Mago segnaposto (tunica, cappello, barba). Sostituiscilo col tuo personaggio.


func _ready() -> void:
	var shape := CollisionShape2D.new()
	var capsule := CapsuleShape2D.new()
	capsule.radius = 12.0
	capsule.height = 44.0
	shape.shape = capsule
	add_child(shape)


func _process(_delta: float) -> void:
	queue_redraw()


func _draw() -> void:
	var robe := Color(0.22, 0.3, 0.62)
	draw_colored_polygon(PackedVector2Array([Vector2(-16, 24), Vector2(0, -12), Vector2(16, 24)]), robe)
	draw_circle(Vector2(0, -14), 8.0, Color(0.96, 0.82, 0.68))
	draw_colored_polygon(PackedVector2Array([Vector2(-7, -12), Vector2(0, 4), Vector2(7, -12)]), Color(0.92, 0.92, 0.96))
	draw_colored_polygon(PackedVector2Array([Vector2(-13, -18), Vector2(4, -46), Vector2(13, -18)]), robe.darkened(0.25))
	draw_circle(Vector2(4, -30), 2.0, Color(0.7, 0.9, 1.0))
