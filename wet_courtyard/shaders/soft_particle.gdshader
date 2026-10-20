// Particella morbida additiva (fiamme torce, scintille, bolle).
shader_type spatial;
render_mode unshaded, blend_add, depth_draw_never, cull_disabled;

uniform vec4 tint : source_color = vec4(1.0, 0.6, 0.25, 1.0);
uniform float energy = 3.0;
uniform float softness = 2.2;
uniform bool streak = false;

varying vec4 vcol;

void vertex() {
	vcol = COLOR;
}

void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	if (streak) {
		p.x *= 0.35;
	}
	float d = length(p);
	float a = pow(clamp(1.0 - d, 0.0, 1.0), softness);
	ALBEDO = tint.rgb * vcol.rgb * energy;
	ALPHA = a * vcol.a;
}
