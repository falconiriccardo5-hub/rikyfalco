// Cristallo di ghiaccio: rifrazione dello schermo + fresnel + spigoli emissivi.
// Pensato per MultiMeshInstance3D: INSTANCE_CUSTOM.r = ritardo di crescita
// (0..1) per ogni spuntone, cosi' l'esplosione di cristalli non e' sincrona.
// `grow` 0..1 scala gli spuntoni dalla base (anche >1 per overshoot).
// `dissolve` 0..1 dissolve il cristallo con bordo luminoso.
shader_type spatial;
render_mode blend_mix, depth_draw_always, cull_back, specular_schlick_ggx;

uniform sampler2D screen_tex : hint_screen_texture, filter_linear;
uniform sampler2D noise_tex : filter_linear_mipmap, repeat_enable;
uniform vec4 tint : source_color = vec4(0.72, 0.86, 1.0, 1.0);
uniform vec4 edge_color : source_color = vec4(0.85, 0.95, 1.0, 1.0);
uniform float grow : hint_range(0.0, 1.5) = 1.0;
uniform float delay_spread : hint_range(0.0, 0.9) = 0.45;
uniform float refraction : hint_range(0.0, 0.2) = 0.05;
uniform float fresnel_power : hint_range(0.5, 8.0) = 2.0;
uniform float emission_strength : hint_range(0.0, 20.0) = 2.5;
uniform float opacity : hint_range(0.0, 1.0) = 0.8;
uniform float dissolve : hint_range(0.0, 1.0) = 0.0;
uniform float dissolve_edge : hint_range(0.0, 0.3) = 0.08;
uniform float flash : hint_range(0.0, 10.0) = 0.0;

varying float v_local_grow;

void vertex() {
	float delay = INSTANCE_CUSTOM.r * delay_spread;
	float g = clamp((grow - delay) / max(1.0 - delay_spread, 0.05), 0.0, 1.6);
	// easing con overshoot (back-out) per uno "scatto" piu' secco
	float c1 = 1.70158;
	float x = clamp(g, 0.0, 1.0);
	float back = 1.0 + (c1 + 1.0) * pow(x - 1.0, 3.0) + c1 * pow(x - 1.0, 2.0);
	v_local_grow = back * max(g, 1.0);
	VERTEX.y *= v_local_grow;
	VERTEX.xz *= mix(0.4, 1.0, clamp(v_local_grow, 0.0, 1.0));
}

void fragment() {
	if (v_local_grow <= 0.001) {
		discard;
	}
	float ndv = clamp(dot(NORMAL, VIEW), 0.0, 1.0);
	float fres = pow(1.0 - ndv, fresnel_power);
	vec2 off = NORMAL.xy * refraction;
	vec3 behind = texture(screen_tex, SCREEN_UV + off).rgb;

	float n = texture(noise_tex, UV * vec2(1.0, 3.0)).r;
	float cut = n - dissolve * 1.1;
	if (cut < 0.0) {
		discard;
	}
	float burn = smoothstep(dissolve_edge, 0.0, cut) * step(0.001, dissolve);

	// facce "sfaccettate": ogni faccia piatta riceve una luminosita' diversa
	float facet = 0.55 + 0.45 * abs(dot(NORMAL, normalize(vec3(0.3, 0.8, 0.5))));
	ALBEDO = behind * tint.rgb * 0.7 * facet;
	ROUGHNESS = 0.08;
	METALLIC = 0.0;
	SPECULAR = 0.5;
	EMISSION = edge_color.rgb * (fres * fres * emission_strength + burn * 6.0 + flash * facet)
		+ tint.rgb * 0.05 * emission_strength * UV.y * facet;
	ALPHA = clamp(opacity + fres * 0.6, 0.0, 1.0);
}
