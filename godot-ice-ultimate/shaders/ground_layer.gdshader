// Strato a terra (sigillo, brina, crepe, onda di gelo).
// `reveal` (0..1) fa crescere la texture dal centro verso l'esterno con un
// bordo frastagliato da rumore e un "edge glow" sul fronte d'avanzamento.
// `fade` e' il master alpha; `rotation`/`spin_speed` ruotano la texture.
shader_type spatial;
render_mode unshaded, blend_add, depth_draw_never, cull_disabled, shadows_disabled;

uniform sampler2D layer_tex : source_color, filter_linear_mipmap, repeat_disable;
uniform sampler2D noise_tex : filter_linear_mipmap, repeat_enable;
uniform vec4 color : source_color = vec4(0.7, 0.86, 1.0, 1.0);
uniform float intensity : hint_range(0.0, 20.0) = 2.0;
uniform float reveal : hint_range(0.0, 1.2) = 1.0;
uniform float fade : hint_range(0.0, 1.0) = 1.0;
uniform float edge_width : hint_range(0.0, 0.5) = 0.08;
uniform float edge_boost : hint_range(0.0, 10.0) = 3.0;
uniform float noise_amount : hint_range(0.0, 0.5) = 0.12;
uniform float rotation = 0.0;
uniform float spin_speed = 0.0;
// pulsazione luminosa (Hz); 0 = off
uniform float pulse_speed = 0.0;
uniform float pulse_amount : hint_range(0.0, 1.0) = 0.25;
// dissoluzione finale con rumore (0 = intatto, 1 = sparito)
uniform float dissolve : hint_range(0.0, 1.0) = 0.0;

void fragment() {
	vec2 p = UV - 0.5;
	float ang = rotation + TIME * spin_speed;
	mat2 rot = mat2(vec2(cos(ang), sin(ang)), vec2(-sin(ang), cos(ang)));
	vec2 uv = rot * p + 0.5;
	vec4 tex = texture(layer_tex, uv);

	float r = length(p) * 2.0;                                      // 0 centro, 1 bordo
	float n = texture(noise_tex, UV * 1.7).r;
	float front = reveal * (1.0 + noise_amount) - n * noise_amount;
	float m = smoothstep(front, front - 0.02, r);
	float edge = smoothstep(edge_width, 0.0, abs(r - front)) * step(0.001, reveal) * step(reveal, 1.0);

	float d = texture(noise_tex, UV * 2.3 + 0.37).g;
	float dm = smoothstep(dissolve, dissolve + 0.08, d);

	float pulse = 1.0 + sin(TIME * TAU * pulse_speed) * pulse_amount * step(0.001, pulse_speed);
	float a = tex.a * (m + edge * edge_boost * tex.a) * fade * dm * color.a;
	ALBEDO = tex.rgb * color.rgb * intensity * pulse * a;
	ALPHA = 1.0;
	// niente nebbia sugli effetti: altrimenti il colore della nebbia viene sommato al quad
	FOG = vec4(0.0);
}
