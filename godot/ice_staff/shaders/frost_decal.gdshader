// Chiazza di brina cristallina sul terreno nel punto d'impatto.
shader_type canvas_item;
render_mode unshaded;

#include "ice_noise.gdshaderinc"

uniform float grow = 1.0;
uniform float fade = 1.0;
uniform float seed = 0.0;

void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	float r = length(p);
	float wob = (ice_fbm(p * 3.0 + seed) - 0.5) * 0.45;
	float mask = 1.0 - smoothstep(grow - 0.25, grow, r + wob);
	vec3 v = ice_voronoi(p * 9.0 + seed * 7.0);
	float lines = (1.0 - smoothstep(0.0, 0.025, v.y)) * ice_noise(p * 4.0 + seed) * 0.6;
	float fine = smoothstep(0.55, 0.85, ice_fbm(p * 16.0 + seed * 3.0));
	float streak = pow(abs(sin(atan(p.y, p.x) * 23.0 + ice_fbm(p * 2.5 + seed) * 9.0)), 24.0) * (1.0 - r) * smoothstep(0.1, 0.4, r);
	float crystal = clamp(lines * 0.6 + fine * 0.7 + streak * 0.6, 0.0, 1.0);
	vec3 col = mix(vec3(0.45, 0.72, 0.95), vec3(0.95, 0.99, 1.0), crystal);
	float a = mask * (0.1 + crystal * 0.5) * fade * (1.0 - smoothstep(0.7, 1.0, r));
	COLOR = vec4(col, a * COLOR.a);
}
