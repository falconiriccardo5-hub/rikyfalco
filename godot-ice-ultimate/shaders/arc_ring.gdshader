// Arco luminoso disegnato in coordinate polari su un QuadMesh.
// Usato per: scie a spirale attorno alla sfera, anelli dei satelliti,
// mezzalune della cupola di carica e i "loop" della detonazione.
// Animare `arc_offset` (rotazione) e `arc_length` per l'effetto "sweep".
shader_type spatial;
render_mode unshaded, blend_add, depth_draw_never, cull_disabled, shadows_disabled;

uniform vec4 color : source_color = vec4(0.8, 0.92, 1.0, 1.0);
uniform float intensity : hint_range(0.0, 30.0) = 4.0;
uniform float radius : hint_range(0.0, 0.5) = 0.4;
uniform float thickness : hint_range(0.001, 0.3) = 0.03;
// lunghezza dell'arco in giri (1.0 = cerchio completo)
uniform float arc_length : hint_range(0.0, 1.0) = 0.35;
// rotazione dell'arco in giri; se spin_speed != 0 ruota da solo
uniform float arc_offset = 0.0;
uniform float spin_speed = 0.0;
// quanto la coda sfuma (0 = uniforme, 1 = tutta sfumata)
uniform float tail_fade : hint_range(0.0, 1.0) = 0.85;
uniform float glow : hint_range(0.0, 4.0) = 1.2;
uniform bool billboard = false;
// aberrazione cromatica finta: frange RGB sul bordo
uniform float chroma_fringe : hint_range(0.0, 0.05) = 0.0;

void vertex() {
	if (billboard) {
		vec3 sc = vec3(length(MODEL_MATRIX[0].xyz), length(MODEL_MATRIX[1].xyz), length(MODEL_MATRIX[2].xyz));
		mat4 bb = mat4(INV_VIEW_MATRIX[0] * sc.x, INV_VIEW_MATRIX[1] * sc.y, INV_VIEW_MATRIX[2] * sc.z, MODEL_MATRIX[3]);
		MODELVIEW_MATRIX = VIEW_MATRIX * bb;
	}
}

float arc_mask(vec2 p, float r_off) {
	float r = length(p);
	float ang = atan(p.y, p.x) / TAU + 0.5;               // 0..1
	float start = fract(arc_offset + TIME * spin_speed);
	float t = fract(ang - start);                         // 0 = coda, arc_length = testa
	float inside = step(t, arc_length);
	float along = clamp(t / max(arc_length, 1e-4), 0.0, 1.0);
	float tail = mix(1.0, along, tail_fade);
	float taper = mix(0.35, 1.0, along);                  // la testa e' piu' spessa
	float d = abs(r - radius - r_off);
	float th = thickness * taper;
	float core = smoothstep(th, 0.0, d);
	float halo = exp(-d / (th * 2.5 + 1e-4)) * 0.6 * glow;
	return (core + halo) * tail * inside;
}

void fragment() {
	vec2 p = UV - 0.5;
	vec3 col;
	if (chroma_fringe > 0.0) {
		col = vec3(arc_mask(p, chroma_fringe), arc_mask(p, 0.0), arc_mask(p, -chroma_fringe));
	} else {
		col = vec3(arc_mask(p, 0.0));
	}
	ALBEDO = col * color.rgb * intensity * color.a;
	ALPHA = 1.0;
	// niente nebbia sugli effetti: altrimenti il colore della nebbia viene sommato al quad
	FOG = vec4(0.0);
}
