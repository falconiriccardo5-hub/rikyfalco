// Shader additivo per sprite/particelle VFX.
// - billboard_mode: 0 = nessuno, 1 = billboard completo, 2 = billboard su asse Y
//   (lo sprite si allinea alla velocita' della particella: usare con
//   ParticleProcessMaterial.particle_flag_align_y = true) -> scie / streak.
// - Il colore finale = texture * color * COLOR(particella) * intensity.
shader_type spatial;
render_mode unshaded, blend_add, depth_draw_never, cull_disabled, shadows_disabled;

uniform sampler2D albedo_tex : source_color, filter_linear_mipmap, repeat_disable;
uniform vec4 color : source_color = vec4(0.75, 0.88, 1.0, 1.0);
uniform float intensity : hint_range(0.0, 20.0) = 2.0;
uniform int billboard_mode : hint_range(0, 2) = 1;
uniform bool use_particle_angle = true;
// rotazione continua dello sprite (rad/s) in modalita' billboard
uniform float spin_speed = 0.0;
// Erosione: alza la soglia mentre la particella invecchia (COLOR.a scende).
uniform float erosion : hint_range(0.0, 1.0) = 0.0;
uniform sampler2D erosion_noise : filter_linear_mipmap, repeat_enable;

// Soft particles: sfuma lo sprite dove interseca la geometria (es. fumo sul
// pavimento). 0 = disattivato. Distanza in metri.
uniform float soft_distance : hint_range(0.0, 4.0) = 0.0;
uniform sampler2D depth_tex : hint_depth_texture, filter_nearest;
// Attivare solo se il progetto usa il renderer Compatibility (OpenGL):
// li' la profondita' in NDC va da -1 a 1 invece che da 0 a 1.
uniform bool compatibility_depth = false;

varying float v_seed;

void vertex() {
	v_seed = INSTANCE_CUSTOM.y;
	vec3 sc = vec3(length(MODEL_MATRIX[0].xyz), length(MODEL_MATRIX[1].xyz), length(MODEL_MATRIX[2].xyz));
	if (billboard_mode == 1) {
		mat4 bb = mat4(INV_VIEW_MATRIX[0], INV_VIEW_MATRIX[1], INV_VIEW_MATRIX[2], MODEL_MATRIX[3]);
		bb = bb * mat4(vec4(sc.x, 0.0, 0.0, 0.0), vec4(0.0, sc.y, 0.0, 0.0), vec4(0.0, 0.0, sc.z, 0.0), vec4(0.0, 0.0, 0.0, 1.0));
		float a = TIME * spin_speed + (use_particle_angle ? INSTANCE_CUSTOM.x : 0.0);
		{
			bb = bb * mat4(vec4(cos(a), -sin(a), 0.0, 0.0), vec4(sin(a), cos(a), 0.0, 0.0), vec4(0.0, 0.0, 1.0, 0.0), vec4(0.0, 0.0, 0.0, 1.0));
		}
		MODELVIEW_MATRIX = VIEW_MATRIX * bb;
	} else if (billboard_mode == 2) {
		vec3 y_axis = normalize(MODEL_MATRIX[1].xyz);
		vec3 to_cam = normalize(CAMERA_POSITION_WORLD - MODEL_MATRIX[3].xyz);
		vec3 x_axis = normalize(cross(y_axis, to_cam));
		vec3 z_axis = cross(x_axis, y_axis);
		mat4 bb = mat4(vec4(x_axis * sc.x, 0.0), vec4(y_axis * sc.y, 0.0), vec4(z_axis * sc.z, 0.0), MODEL_MATRIX[3]);
		MODELVIEW_MATRIX = VIEW_MATRIX * bb;
	}
}

void fragment() {
	vec4 tex = texture(albedo_tex, UV);
	float a = tex.a * color.a * COLOR.a;
	if (erosion > 0.0) {
		float n = texture(erosion_noise, UV * 0.7 + v_seed).r;
		a *= smoothstep(erosion * (1.0 - COLOR.a), erosion * (1.0 - COLOR.a) + 0.15, n);
	}
	if (soft_distance > 0.0) {
		float d = textureLod(depth_tex, SCREEN_UV, 0.0).r;
		vec3 ndc = compatibility_depth ? vec3(SCREEN_UV, d) * 2.0 - 1.0 : vec3(SCREEN_UV * 2.0 - 1.0, d);
		vec4 scene = INV_PROJECTION_MATRIX * vec4(ndc, 1.0);
		float scene_z = scene.z / scene.w;
		a *= clamp((VERTEX.z - scene_z) / soft_distance, 0.0, 1.0);
	}
	ALBEDO = tex.rgb * color.rgb * COLOR.rgb * intensity * a;
	ALPHA = 1.0;
	// niente nebbia sugli effetti: altrimenti il colore della nebbia viene sommato al quad
	FOG = vec4(0.0);
}
