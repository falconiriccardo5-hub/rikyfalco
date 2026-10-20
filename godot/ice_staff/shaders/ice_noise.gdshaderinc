// Rumore procedurale condiviso dagli shader del ghiaccio (niente texture esterne).

float ice_hash(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

vec2 ice_hash2(vec2 p) {
	float n = ice_hash(p);
	return vec2(n, ice_hash(p + n));
}

float ice_noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(ice_hash(i), ice_hash(i + vec2(1.0, 0.0)), u.x),
			mix(ice_hash(i + vec2(0.0, 1.0)), ice_hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float ice_fbm(vec2 p) {
	float v = 0.0;
	float a = 0.5;
	for (int i = 0; i < 5; i++) {
		v += a * ice_noise(p);
		p = p * 2.03 + vec2(1.7, 9.2);
		a *= 0.5;
	}
	return v;
}

// x = distanza dal centro cella, y = distanza dal bordo cella (crepe), z = id cella
vec3 ice_voronoi(vec2 p) {
	vec2 n = floor(p);
	vec2 f = fract(p);
	float f1 = 8.0;
	float f2 = 8.0;
	float id = 0.0;
	for (int j = -1; j <= 1; j++) {
		for (int i = -1; i <= 1; i++) {
			vec2 g = vec2(float(i), float(j));
			vec2 r = g + ice_hash2(n + g) - f;
			float d = dot(r, r);
			if (d < f1) {
				f2 = f1;
				f1 = d;
				id = ice_hash(n + g);
			} else if (d < f2) {
				f2 = d;
			}
		}
	}
	return vec3(sqrt(f1), sqrt(f2) - sqrt(f1), id);
}
