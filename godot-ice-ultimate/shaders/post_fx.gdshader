// Post-process a schermo intero (ColorRect sopra il mondo 3D):
// aberrazione cromatica radiale, blur radiale (zoom blur), flash bianco,
// vignettatura. I parametri vengono animati da scripts/post_fx.gd.
shader_type canvas_item;

uniform sampler2D screen_tex : hint_screen_texture, filter_linear;
uniform vec2 center = vec2(0.5, 0.45);
uniform float chroma : hint_range(0.0, 3.0) = 0.0;
uniform float radial_blur : hint_range(0.0, 2.0) = 0.0;
uniform float flash : hint_range(0.0, 2.0) = 0.0;
uniform vec4 flash_color : source_color = vec4(0.9, 0.96, 1.0, 1.0);
uniform float vignette : hint_range(0.0, 2.0) = 0.55;
uniform float exposure : hint_range(0.0, 4.0) = 1.0;

vec3 sample_rgb(vec2 uv, vec2 dir, float amt) {
	float r = texture(screen_tex, uv + dir * amt).r;
	float g = texture(screen_tex, uv).g;
	float b = texture(screen_tex, uv - dir * amt).b;
	return vec3(r, g, b);
}

void fragment() {
	vec2 uv = SCREEN_UV;
	vec2 dir = uv - center;
	float dist = length(dir);
	float ca = chroma * 0.012 * dist;
	vec3 col = vec3(0.0);
	const int TAPS = 8;
	float w = 0.0;
	for (int i = 0; i < TAPS; i++) {
		float t = float(i) / float(TAPS - 1);
		float s = 1.0 - t * radial_blur * 0.08;
		vec2 suv = center + dir * s;
		float wi = 1.0 - t * 0.5;
		col += sample_rgb(suv, dir, ca) * wi;
		w += wi;
		if (radial_blur <= 0.0) { w = wi; break; }
	}
	col /= w;
	col *= exposure;
	col += flash_color.rgb * flash * (1.0 - dist * 0.6);
	float vig = smoothstep(0.85, 0.25, dist * (0.8 + vignette * 0.4));
	col *= mix(1.0, vig, clamp(vignette, 0.0, 1.0));
	COLOR = vec4(col, 1.0);
}
