// Superficie della pozza magica: acqua blu profonda, caustiche (bordi di
// Voronoi che si muovono), onde concentriche e due anelli luminosi sul bordo.
shader_type spatial;
render_mode unshaded, blend_mix, depth_draw_never, cull_disabled;

#include "res://shaders/common.gdshaderinc"

uniform vec4 deep : source_color = vec4(0.015, 0.17, 0.6, 1.0);
uniform vec4 tint : source_color = vec4(0.45, 0.8, 1.0, 1.0);
uniform float energy = 2.0;
uniform float reveal : hint_range(0.0, 1.0) = 1.0;

float ring(float r, float center, float w) {
	return exp(-pow((r - center) / w, 2.0));
}

void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	float r = length(p) / max(reveal, 0.001);
	vec2 warp = (vec2(fbm(p * 2.0 + TIME * 0.05), fbm(p * 2.0 - TIME * 0.04 + 9.0)) - 0.5) * 0.35;
	float caustic = 1.0 - smoothstep(0.0, 0.09, voronoi_edge((p + warp) * 4.5, TIME * 0.7).x);
	float ripple = sin(r * 48.0 - TIME * 5.5) * exp(-r * 3.5) * 0.5 + 0.5;
	vec3 col = deep.rgb * energy;
	col += tint.rgb * (caustic * 1.3 + ripple * exp(-r * 3.5) * 0.25);
	col += tint.rgb * 2.6 * (ring(r, 0.82, 0.012) + ring(r, 0.865, 0.007));
	float disc = 1.0 - smoothstep(0.88, 0.9, r);
	ALBEDO = col;
	ALPHA = disc * 0.88;
}
