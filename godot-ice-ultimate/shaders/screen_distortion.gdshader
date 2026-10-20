// Onda d'urto: distorce lo schermo dietro un anello che si espande.
// Applicare a un QuadMesh orizzontale (a terra) o billboard.
shader_type spatial;
render_mode unshaded, blend_mix, depth_draw_never, cull_disabled, shadows_disabled;

uniform sampler2D screen_tex : hint_screen_texture, filter_linear;
uniform float progress : hint_range(0.0, 1.0) = 0.5;
uniform float strength : hint_range(0.0, 0.2) = 0.04;
uniform float ring_width : hint_range(0.01, 0.5) = 0.06;
uniform vec4 tint : source_color = vec4(0.85, 0.95, 1.0, 1.0);
uniform float tint_amount : hint_range(0.0, 2.0) = 0.04;

void fragment() {
	vec2 p = UV - 0.5;
	float r = length(p) * 2.0;
	float d = r - progress;
	float ring = exp(-(d * d) / (ring_width * ring_width));
	float fade = 1.0 - smoothstep(0.7, 1.0, progress);
	vec2 dir = normalize(p + 1e-5);
	vec2 suv = SCREEN_UV - dir * ring * strength * fade;
	vec3 c = texture(screen_tex, suv).rgb;
	ALBEDO = c + tint.rgb * ring * tint_amount * fade;
	ALPHA = smoothstep(1.0, 0.95, r) * ring * fade;
	// niente nebbia sugli effetti: altrimenti il colore della nebbia viene sommato al quad
	FOG = vec4(0.0);
}
