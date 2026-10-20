// Vignettatura e leggera grana, per un look cinematografico.
shader_type canvas_item;
render_mode unshaded;

#include "res://ice_staff/shaders/ice_noise.gdshaderinc"

void fragment() {
	vec2 p = UV - 0.5;
	float v = smoothstep(0.3, 0.85, length(p * vec2(1.0, 0.85)));
	float grain = ice_hash(UV * 731.0 + fract(TIME) * 37.0) - 0.5;
	COLOR = vec4(vec3(0.0, 0.01, 0.03) + grain * 0.05, v * 0.75 + abs(grain) * 0.04);
}
