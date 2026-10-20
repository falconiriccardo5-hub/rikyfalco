// Vapore freddo / brina in sospensione per le particelle.
shader_type canvas_item;
render_mode unshaded;

#include "ice_noise.gdshaderinc"

uniform float density = 0.65;

void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	float r = length(p);
	float n = ice_fbm(p * 1.7 + SCREEN_UV * 5.0 + vec2(TIME * 0.25, -TIME * 0.15));
	float a = smoothstep(1.0, 0.15, r + (n - 0.5) * 0.9);
	COLOR = vec4(COLOR.rgb * (0.75 + 0.5 * n), a * a * density * COLOR.a);
}
