// Cerchio magico procedurale: anelli concentrici con tacche, stelle
// poligonali ruotanti in senso opposto, glifi sul bordo e fumo che
// vortica all'interno. Tutto è distanza da linee e archi, poi un alone.
shader_type spatial;
render_mode unshaded, blend_add, cull_disabled, depth_draw_never;

#include "res://shaders/common.gdshaderinc"

uniform vec4 tint : source_color = vec4(1.0, 0.45, 0.2, 1.0);
uniform vec4 hot : source_color = vec4(1.0, 0.85, 0.6, 1.0);
uniform float energy = 3.0;
uniform float reveal : hint_range(0.0, 1.0) = 1.0;
uniform float spin = 0.25;

float seg(vec2 p, vec2 a, vec2 b) {
	vec2 pa = p - a;
	vec2 ba = b - a;
	float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
	return length(pa - ba * h);
}

vec2 rot(vec2 p, float a) {
	float c = cos(a);
	float s = sin(a);
	return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

float line_glow(float d, float w) {
	return w / (d + w) * smoothstep(0.03, 0.0, d - w * 3.0) + exp(-d * d / (w * w * 0.5)) * 0.8;
}

void fragment() {
	vec2 p = (UV * 2.0 - 1.0) / max(reveal, 0.001);
	float r = length(p);
	float ang = atan(p.y, p.x);
	float acc = 0.0;

	// Anelli
	float w = 0.0045;
	acc += exp(-pow((r - 0.96) / w, 2.0)) * 1.2;
	acc += exp(-pow((r - 0.9) / (w * 0.7), 2.0)) * 0.9;
	acc += exp(-pow((r - 0.72) / w, 2.0));
	acc += exp(-pow((r - 0.45) / w, 2.0)) * 0.9;
	acc += exp(-pow((r - 0.2) / w, 2.0)) * 0.8;

	// Tacche tra i due anelli esterni, in rotazione
	vec2 pr = rot(p, TIME * spin);
	float sector = 6.2831 / 72.0;
	float a2 = mod(atan(pr.y, pr.x) + sector * 0.5, sector) - sector * 0.5;
	float tick_len = 0.02 + 0.03 * step(0.5, hash11(floor((atan(pr.y, pr.x) + 3.1416) / sector)));
	acc += smoothstep(0.003, 0.0, abs(a2 * r)) * step(0.9, r) * step(r, 0.9 + tick_len + 0.02) * 0.9;

	// Stella {7/3} in rotazione inversa
	vec2 ps = rot(p, -TIME * spin * 1.6);
	float star = 9.0;
	for (int i = 0; i < 7; i++) {
		float a0 = 6.2831 * float(i) / 7.0;
		float a1 = 6.2831 * float((i + 3) % 7) / 7.0;
		star = min(star, seg(ps, vec2(cos(a0), sin(a0)) * 0.72, vec2(cos(a1), sin(a1)) * 0.72));
	}
	acc += exp(-star * star / 0.00005) * 1.1 * smoothstep(0.76, 0.7, r);

	// Stella a 4 punte interna
	vec2 pi = rot(p, TIME * spin * 2.2);
	float cross_d = min(abs(pi.x), abs(pi.y));
	acc += exp(-cross_d * cross_d / 0.00003) * smoothstep(0.45, 0.4, r) * 0.9;

	// Glifi: piccoli segmenti casuali tra gli anelli 0.72 e 0.9
	float gs = 6.2831 / 24.0;
	float gid = floor((ang + 3.1416) / gs);
	float ga = mod(ang + 3.1416, gs) - gs * 0.5;
	vec2 gp = vec2(r, ga * r);
	float gh = hash11(gid * 3.1);
	float g1 = seg(gp, vec2(0.76, -0.012), vec2(0.86 - 0.04 * gh, 0.012 * (gh * 2.0 - 1.0)));
	float g2 = seg(gp, vec2(0.8 + 0.04 * gh, 0.0), vec2(0.84, 0.02));
	acc += exp(-min(g1, g2) * min(g1, g2) / 0.000012) * step(0.45, gh) * 0.8;

	// Fumo che vortica all'interno
	float twist = r * 5.0 - TIME * 0.5;
	vec2 sw = rot(p, twist);
	float smoke = fbm(sw * 2.6 + TIME * 0.08);
	float smoke_a = smoothstep(0.35, 0.8, smoke) * smoothstep(1.0, 0.2, r) * 0.55;

	float edge = 1.0 - smoothstep(0.97, 1.0, r);
	float glow = acc * 0.9 + smoke_a;
	vec3 col = mix(tint.rgb, hot.rgb, clamp(acc * 0.5, 0.0, 1.0)) * glow * energy;
	ALBEDO = col;
	ALPHA = clamp(glow, 0.0, 1.0) * edge;
}
