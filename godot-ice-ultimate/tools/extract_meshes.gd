extends SceneTree
## Estrae le mesh dai .glb esportati da Blender (models/) in risorse Godot
## (meshes/*.res) usate dalle scene VFX. NON tocca le scene.
##
##   godot --headless --path . --import
##   godot --headless --path . --script res://tools/extract_meshes.gd
##
## Flusso: modifichi blender/meshes.py -> esporti -> rilanci questo script ->
## tutte le scene che usano quella mesh si aggiornano.

const MODELS := ["swirl_ribbon", "crescent", "shock_dome", "ice_sword", "crystal_a", "crystal_b"]


func _initialize() -> void:
	DirAccess.make_dir_recursive_absolute("res://meshes")
	for m in MODELS:
		var scene: PackedScene = load("res://models/%s.glb" % m)
		var root := scene.instantiate()
		var mis := root.find_children("*", "MeshInstance3D", true, false)
		if root is MeshInstance3D:
			mis.insert(0, root)
		var mesh: Mesh = (mis[0] as MeshInstance3D).mesh.duplicate()
		# i materiali li danno gli shader delle scene VFX
		for i in mesh.get_surface_count():
			mesh.surface_set_material(i, null)
		var path := "res://meshes/%s.res" % m
		print("  ", path, " -> ", error_string(ResourceSaver.save(mesh, path)))
		root.free()
	quit()
