// Corona di schiuma / fiamma sul bordo del cerchio. Si applica a un
// cilindro aperto: il rumore scorre in coordinate polari (UV.x gira attorno
// al cerchio, l'altezza locale sale) e lo stesso shader fa acqua o fuoco
// cambiando solo colore e velocità.
shader_type spatial;
render_mode unshaded, blend_add, cull_disabled, depth_draw_never;

#include "res://shaders/common.gdshaderinc"

uniform vec4 tint : source_color = vec4(0.45, 0.8, 1.0, 1.0);
uniform vec4 tip_tint : source_color = vec4(0.85, 0.97, 1.0, 1.0);
uniform float energy = 3.2;
uniform float flow_speed = 0.55;
uniform float turbulence = 1.0;
uniform float height_scale = 1.0;
uniform float reveal : hint_range(0.0, 1.0) = 1.0;

varying float hh;

void vertex() {
	hh = clamp(VERTEX.y * height_scale + 0.5, 0.0, 1.0);
}

void fragment() {
	float u = UV.x * 9.0;
	float t = TIME * flow_speed;
	float n1 = fbm(vec2(u, hh * 2.5 * turbulence - t));
	float n2 = fbm(vec2(u * 1.9 + 3.0, hh * 4.0 - t * 1.7 + 8.0));
	float v = n1 * n2 * 3.4;
	float shape = v - hh * 0.9 - 0.05;
	float a = smoothstep(-0.05, 0.35, shape) * smoothstep(0.0, 0.06, hh) * 0.85 * reveal;
	vec3 col = mix(tint.rgb, tip_tint.rgb, smoothstep(0.55, 1.4, shape) * 0.55);
	ALBEDO = col * energy;
	ALPHA = a;
}
