// Pavimento di lastre di pietra (illuminato dalle luci 2D).
shader_type canvas_item;

#include "res://ice_staff/shaders/ice_noise.gdshaderinc"

uniform vec2 rect_size = vec2(1680.0, 1120.0);
uniform float tile = 86.0;

void fragment() {
	vec2 px = UV * rect_size / tile;
	vec2 q = px;
	q.x += step(1.0, mod(floor(q.y), 2.0)) * 0.5;
	vec2 id = floor(q);
	vec2 f = fract(q);
	float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
	float grout = smoothstep(0.015, 0.05, edge + (ice_noise(px * 9.0) - 0.5) * 0.03);
	float n = ice_fbm(px * 3.0 + ice_hash(id) * 10.0);
	float tone = 0.75 + 0.5 * ice_hash(id + 2.3);
	vec3 stone = vec3(0.085, 0.09, 0.105) * tone * (0.65 + 0.7 * n);
	stone += vec3(0.04) * (1.0 - smoothstep(0.03, 0.09, f.y));
	stone *= 1.0 - 0.25 * (1.0 - smoothstep(0.03, 0.12, 1.0 - f.y));
	COLOR = vec4(mix(vec3(0.025, 0.025, 0.03), stone, grout), 1.0);
}
