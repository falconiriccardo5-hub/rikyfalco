// Scintilla a croce per i micro-cristalli (polvere di diamante).
shader_type canvas_item;
render_mode unshaded, blend_add;

void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	float cross = exp(-abs(p.y) * 22.0) * (1.0 - abs(p.x)) + exp(-abs(p.x) * 22.0) * (1.0 - abs(p.y));
	float core = exp(-dot(p, p) * 14.0);
	float twinkle = 0.55 + 0.45 * sin(TIME * 25.0 + (SCREEN_UV.x + SCREEN_UV.y) * 400.0);
	float v = clamp((cross * 0.8 + core) * twinkle, 0.0, 1.0);
	COLOR = vec4(COLOR.rgb, COLOR.a * v);
}
