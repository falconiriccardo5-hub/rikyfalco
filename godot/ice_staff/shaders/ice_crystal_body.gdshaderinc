// Cristallo di ghiaccio sfaccettato: forma a scheggia (punta verso +X),
// facce piane illuminate, fresnel sui bordi, crepe interne, nuvolosità
// lattiginosa, riflesso che scorre e (opzionale) rifrazione dello sfondo.

#include "ice_noise.gdshaderinc"

uniform vec4 deep_color : source_color = vec4(0.04, 0.22, 0.50, 1.0);
uniform vec4 mid_color : source_color = vec4(0.36, 0.74, 1.0, 1.0);
uniform vec4 rim_color : source_color = vec4(0.88, 0.97, 1.0, 1.0);
uniform float node_rotation = 0.0;
uniform float seed = 0.0;
uniform float glint_speed = 1.6;
uniform float alpha_mult = 1.0;
#ifndef NO_REFRACTION
uniform sampler2D screen_texture : hint_screen_texture, filter_linear_mipmap;
uniform float refraction = 0.018;
#endif

const float RIDGE = -0.25;
const float HALF_H = 0.9;

float shard_halfwidth(float x) {
	if (x > RIDGE) {
		return HALF_H * (1.0 - x) / (1.0 - RIDGE);
	}
	return HALF_H * (0.5 + 0.5 * (x + 1.0) / (RIDGE + 1.0));
}

void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	float hw = shard_halfwidth(p.x);
	float back = -0.95 + 0.1 * ice_noise(vec2(p.y * 6.0, seed));
	float d = max(abs(p.y) - hw, back - p.x);
	float depth = clamp(-d * 2.2, 0.0, 1.0);

	// Facce: cresta centrale, cresta trasversale e smussi laterali
	float bevel = step(0.55 * hw, abs(p.y));
	float sx = p.x > RIDGE ? 1.0 : -0.7;
	vec3 n = normalize(vec3(sx * (0.25 + 0.35 * bevel), sign(p.y) * (0.2 + 0.75 * bevel), 1.0));
	vec3 vor = ice_voronoi(p * vec2(2.0, 3.5) + seed * 11.0);
	float ca = vor.z * 6.2831;
	n = normalize(n + vec3(cos(ca), sin(ca), 0.0) * 0.12);
	float c = cos(node_rotation);
	float s = sin(node_rotation);
	vec3 nw = vec3(c * n.x - s * n.y, s * n.x + c * n.y, n.z);

	vec3 L = normalize(vec3(-0.45, -0.65, 0.8));
	float diff = max(dot(nw, L), 0.0);
	float spec = pow(max(dot(reflect(-L, nw), vec3(0.0, 0.0, 1.0)), 0.0), 28.0);
	float fres = pow(1.0 - n.z, 1.4);
	float rim = 1.0 - smoothstep(0.0, 0.18, depth);
	float cracks = (1.0 - smoothstep(0.0, 0.05, vor.y)) * smoothstep(0.1, 0.5, depth);
	float cloud = smoothstep(0.45, 0.85, ice_fbm(p * 3.0 + seed * 5.0)) * depth;
	float band = p.x * 0.8 + p.y * 0.5 - (mod(TIME * glint_speed + seed * 3.7, 3.5) - 1.75) * 1.4;
	float glint = exp(-band * band * 18.0);

	vec3 body = mix(rim_color.rgb, mix(mid_color.rgb, deep_color.rgb, depth), smoothstep(0.0, 0.6, depth));
	vec3 col = body * (0.35 + 0.75 * diff);
#ifndef NO_REFRACTION
	vec2 off = nw.xy * refraction * (0.4 + depth);
	vec3 behind = textureLod(screen_texture, SCREEN_UV + off, 0.0).rgb;
	col += behind * mix(vec3(0.75, 0.92, 1.0), deep_color.rgb * 1.6, depth) * 0.6;
	float body_alpha = 1.0;
#else
	// Senza sfondo rifratto: ghiaccio più chiaro e semitrasparente
	col += mix(vec3(0.8, 0.93, 1.0), mid_color.rgb, depth) * 0.5;
	float body_alpha = mix(0.95, 0.8, depth);
#endif
	col += rim_color.rgb * (rim * 0.85 + fres * 0.35);
	col += vec3(1.0) * (spec * 1.2 + glint * 0.7 + cracks * 0.35);
	col += vec3(0.85, 0.95, 1.0) * cloud * 0.45;

	float aa = fwidth(d) * 1.2;
	float a = 1.0 - smoothstep(-aa, aa, d);
	COLOR = vec4(col, a * body_alpha * alpha_mult * COLOR.a);
}
