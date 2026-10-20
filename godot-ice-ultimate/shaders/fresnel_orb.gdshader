// Sfera/bolla di energia: bordo fresnel luminoso + flusso di rumore interno
// + iridescenza (riflessi arcobaleno visibili nel video).
shader_type spatial;
render_mode unshaded, blend_add, depth_draw_never, cull_back, shadows_disabled;

uniform sampler2D noise_tex : filter_linear_mipmap, repeat_enable;
uniform vec4 rim_color : source_color = vec4(0.85, 0.95, 1.0, 1.0);
uniform vec4 core_color : source_color = vec4(0.35, 0.55, 0.85, 1.0);
uniform float intensity : hint_range(0.0, 20.0) = 2.0;
uniform float rim_power : hint_range(0.5, 8.0) = 2.5;
uniform float core_amount : hint_range(0.0, 2.0) = 0.35;
uniform float flow_speed = 0.35;
uniform float iridescence : hint_range(0.0, 1.0) = 0.35;
uniform float fade : hint_range(0.0, 1.0) = 1.0;

void fragment() {
	float ndv = clamp(dot(NORMAL, VIEW), 0.0, 1.0);
	float rim = pow(1.0 - ndv, rim_power);
	vec2 flow = UV * vec2(3.0, 1.5) + vec2(TIME * flow_speed, -TIME * flow_speed * 0.6);
	float n = texture(noise_tex, flow).r;
	float n2 = texture(noise_tex, UV * 5.0 - vec2(TIME * flow_speed * 0.7, 0.0)).g;
	float swirl = smoothstep(0.45, 0.8, n * n2 * 2.0);
	vec3 irid = 0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.33, 0.67) + rim * 1.5 + TIME * 0.2));
	vec3 rimc = mix(rim_color.rgb, rim_color.rgb * irid * 1.4, iridescence);
	vec3 col = rimc * rim + core_color.rgb * (core_amount * swirl + core_amount * 0.25);
	ALBEDO = col * intensity * fade;
	ALPHA = 1.0;
	// niente nebbia sugli effetti: altrimenti il colore della nebbia viene sommato al quad
	FOG = vec4(0.0);
}
