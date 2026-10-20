// Pietra bagnata procedurale (ciottoli sfalsati, lastre, muri).
// Il trucco del look: dove l'acqua si raccoglie la roughness scende a ~0.03,
// così SSR e luci colorate si riflettono come uno specchio; le gocce di
// pioggia disegnano anelli che si espandono nelle pozzanghere.
shader_type spatial;

#include "res://shaders/common.gdshaderinc"

uniform vec2 brick_size = vec2(0.34, 0.2);
uniform float bump_strength : hint_range(0.0, 3.0) = 1.0;
uniform float wetness : hint_range(0.0, 1.0) = 0.9;
uniform float puddle_scale = 0.22;
uniform float rain : hint_range(0.0, 1.0) = 1.0;
uniform vec3 stone_dark : source_color = vec3(0.07, 0.075, 0.095);
uniform vec3 stone_light : source_color = vec3(0.2, 0.21, 0.25);
uniform vec3 mortar : source_color = vec3(0.012, 0.014, 0.02);

varying vec3 wpos;
varying vec3 wnrm;

float stone_height(vec2 p, out float id) {
	vec2 warp = (vec2(vnoise(p * 5.0), vnoise(p * 5.0 + 7.3)) - 0.5) * 0.035;
	vec2 q = (p + warp) / brick_size;
	float row = floor(q.y);
	q.x += 0.5 * mod(row, 2.0) + hash11(row) * 0.2;
	vec2 cell = floor(q);
	vec2 f = fract(q);
	id = hash21(cell + 3.7);
	float edge = min(min(f.x, 1.0 - f.x) * (brick_size.x / brick_size.y), min(f.y, 1.0 - f.y));
	float round_top = smoothstep(0.02, 0.22, edge);
	float grain = vnoise(p * 22.0) * 0.035 + vnoise(p * 8.0) * 0.1;
	return round_top * (0.8 + 0.2 * id) + grain;
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wnrm = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	// Mappatura planare automatica: la faccia sceglie il piano più vicino alla sua normale
	bool is_floor = wnrm.y > 0.7;
	vec2 p = is_floor ? wpos.xz : (abs(wnrm.x) > abs(wnrm.z) ? wpos.zy : wpos.xy);
	float id;
	float h = stone_height(p, id);
	float e = 0.006;
	float idd;
	float hx = stone_height(p + vec2(e, 0.0), idd) - h;
	float hy = stone_height(p + vec2(0.0, e), idd) - h;

	// Umidità: pozzanghere nelle zone basse + solchi tra le pietre
	float basin = smoothstep(0.46, 0.8, fbm(p * puddle_scale * 3.0 + 4.0));
	float puddle = is_floor ? basin * wetness : 0.0;
	float damp_amt = clamp(wetness * (0.5 + 0.5 * (1.0 - h)) + puddle, 0.0, 1.0);

	// Colore
	vec3 stone = mix(stone_dark, stone_light, id * 0.7 + fbm(p * 14.0) * 0.5);
	float groove = smoothstep(0.1, 0.45, h);
	vec3 albedo = mix(mortar, stone, groove);
	albedo *= mix(1.0, 0.5, damp_amt);

	// Normali: bump dei ciottoli, appiattito dove c'è l'acqua
	vec3 n = normalize(vec3(-hx / e * 0.03 * bump_strength, -hy / e * 0.03 * bump_strength, 1.0));
	n = normalize(mix(n, vec3(0.0, 0.0, 1.0), puddle * 0.92));

	// Anelli di pioggia (solo nelle pozzanghere)
	if (is_floor && rain > 0.0 && puddle > 0.05) {
		vec2 g = p * 2.2;
		vec2 c = floor(g);
		vec2 ctr = c + 0.15 + 0.7 * hash22(c);
		float t = fract(TIME * 0.8 + hash21(c * 1.7));
		float d = length(g - ctr);
		float wave = (d - t * 0.7) * 38.0;
		float env = smoothstep(0.0, 0.1, t) * (1.0 - t) * smoothstep(0.7, 0.2, d) * step(abs(wave), 6.2831 * 1.5);
		vec2 dir = (g - ctr) / max(d, 0.001);
		n.xy += dir * cos(wave) * env * 0.5 * puddle * rain;
		n = normalize(n);
	}

	ALBEDO = albedo;
	ROUGHNESS = mix(0.85, 0.03, clamp(damp_amt * 1.15, 0.0, 1.0));
	SPECULAR = 0.55;
	NORMAL_MAP = n * 0.5 + 0.5;
	NORMAL_MAP_DEPTH = 1.0;
}
