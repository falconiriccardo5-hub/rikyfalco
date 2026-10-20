// Onda d'urto: distorsione radiale dello schermo con leggero bordo freddo.
shader_type canvas_item;
render_mode unshaded;

uniform sampler2D screen_texture : hint_screen_texture, filter_linear_mipmap;
uniform float progress = 0.0;
uniform float strength = 0.02;
uniform vec4 tint : source_color = vec4(0.7, 0.9, 1.0, 1.0);

void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	float r = length(p);
	float ring = 1.0 - smoothstep(0.0, 0.22, abs(r - progress));
	ring *= 1.0 - smoothstep(0.85, 1.0, r);
	float fade = 1.0 - progress;
	vec2 dir = r > 0.0001 ? p / r : vec2(0.0);
	vec3 col = textureLod(screen_texture, SCREEN_UV - dir * ring * strength * fade, 0.0).rgb;
	col += tint.rgb * ring * 0.2 * fade;
	COLOR = vec4(col, smoothstep(0.0, 0.15, ring));
}
