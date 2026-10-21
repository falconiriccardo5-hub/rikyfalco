// Scia su mesh (nastri a spirale, mezzelune) modellate in Blender.
// UV.x = lungo la scia (0 coda .. 1 punta), UV.y = attraverso la scia.
// `progress` sposta la "testa" lungo la mesh; `trail_length` e' la coda visibile.
// Con `auto_speed` != 0 la scia scorre da sola in loop.
shader_type spatial;
render_mode unshaded, blend_add, depth_draw_never, cull_disabled, shadows_disabled;

uniform sampler2D noise_tex : filter_linear_mipmap, repeat_enable;
uniform vec4 color : source_color = vec4(0.85, 0.93, 1.0, 1.0);
uniform float intensity : hint_range(0.0, 30.0) = 3.0;
uniform float progress : hint_range(0.0, 2.0) = 1.0;
uniform float trail_length : hint_range(0.01, 1.5) = 0.6;
uniform float auto_speed = 0.0;
// morbidezza dei bordi laterali (piu' alto = linea piu' sottile)
uniform float edge_power : hint_range(0.1, 8.0) = 1.5;
// striature che scorrono lungo la scia
uniform float streak_scale = 3.0;
uniform float streak_speed = 1.5;
uniform float streak_amount : hint_range(0.0, 1.0) = 0.6;
// bordo luminoso sul lato esterno (UV.y = 1)
uniform float rim_boost : hint_range(0.0, 6.0) = 1.5;
uniform float fade : hint_range(0.0, 1.0) = 1.0;

void fragment() {
	if (intensity * fade <= 0.0) {
		discard;
	}
	float u = clamp(UV.x, 0.0, 1.0);
	float v = clamp(UV.y, 0.0, 1.0);
	float head = auto_speed != 0.0 ? fract(TIME * auto_speed) * (1.0 + trail_length) : progress;
	float tail = head - trail_length;
	float along = clamp((u - tail) / max(trail_length, 1e-3), 0.0, 1.0);
	float m = step(tail, u) * (1.0 - smoothstep(head - 0.03, head, u));
	m *= smoothstep(0.0, 0.35, along);
	float across = max(1.0 - abs(v * 2.0 - 1.0), 0.0);
	float edge = pow(across + 1e-4, edge_power);
	float rim = pow(v, 6.0) * rim_boost;
	float n = texture(noise_tex, vec2(u * streak_scale - TIME * streak_speed, v * 0.35)).r;
	float streak = mix(1.0, smoothstep(0.35, 0.75, n) * 1.6, streak_amount);
	float bright = mix(0.35, 1.3, along * along);
	vec3 c = color.rgb * intensity * m * bright * (edge * streak + rim * along);
	ALBEDO = clamp(c * fade * color.a, vec3(0.0), vec3(64.0));
	ALPHA = 1.0;
	FOG = vec4(0.0);
}
