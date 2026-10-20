// Crosta di ghiaccio che avvolge il nemico congelato. Si propaga dal punto
// d'impatto con un fronte di brina luminoso, rifrange il nemico sotto
// (desaturato e raffreddato), ha celle cristalline, foschia di brina ai bordi,
// micro-scintille e crepe che si allargano poco prima della rottura.
shader_type canvas_item;
render_mode unshaded;

#include "ice_noise.gdshaderinc"

uniform sampler2D screen_texture : hint_screen_texture, filter_linear_mipmap;
uniform vec2 origin = vec2(0.5, 0.5);
uniform float spread = 1.6;
uniform float crack = 0.0;
uniform float seed = 0.0;
uniform float refraction = 0.012;
uniform float alpha_mult = 1.0;

void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	vec3 jag = ice_voronoi(p * 3.0 + seed * 3.0);
	float shape = length(p) + (ice_fbm(p * 2.2 + seed) - 0.5) * 0.3 + jag.x * 0.12 - 0.9;
	float aa = fwidth(shape) * 1.5;
	float inside = 1.0 - smoothstep(-aa, aa, shape);
	float dist_o = length(UV - origin) * 1.5 + (ice_fbm(p * 6.0 + seed * 2.0) - 0.5) * 0.4;
	float front = spread - dist_o;
	float covered = smoothstep(0.0, 0.03, front);
	float depth = clamp(-shape * 2.2, 0.0, 1.0);

	vec3 cell = ice_voronoi(p * 3.4 + seed * 13.0);
	float ca = cell.z * 6.2831;
	vec3 n = normalize(vec3(cos(ca) * 0.55, sin(ca) * 0.55, 1.0));
	vec3 behind = textureLod(screen_texture, SCREEN_UV + n.xy * refraction * (0.5 + depth), 0.0).rgb;
	float lum = dot(behind, vec3(0.3, 0.59, 0.11));
	behind = mix(vec3(lum), behind, 0.4) * vec3(0.72, 0.9, 1.18);

	float frost = smoothstep(0.5, 0.85, ice_fbm(p * 13.0 + seed * 4.0));
	float haze = mix(0.5, 0.04, depth) + frost * 0.3;
	float cracks = (1.0 - smoothstep(0.0, 0.03 + crack * 0.035, cell.y)) * (0.14 + crack * 1.1);
	float front_glow = (1.0 - smoothstep(0.0, 0.1, front)) * covered;
	float rim = 1.0 - smoothstep(0.0, 0.12, -shape);
	vec3 L = normalize(vec3(-0.45, -0.65, 0.8));
	float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 24.0);
	vec2 sp = floor(p * 26.0 + seed);
	float sparkle = step(0.965, ice_hash(sp)) * pow(max(sin(TIME * 9.0 + ice_hash(sp + 3.1) * 40.0), 0.0), 6.0);

	vec3 col = behind * 0.95 + vec3(0.72, 0.9, 1.0) * haze * 0.55;
	col += vec3(1.0) * (cracks + front_glow * 0.9 + rim * 0.55 + spec * 0.5 + sparkle * 1.2);
	COLOR = vec4(col, inside * covered * alpha_mult * COLOR.a);
}
