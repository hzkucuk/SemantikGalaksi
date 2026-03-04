/** SemantikGalaksi — GLSL Shader Kodları */

// --- GLSL Noise Kütüphanesi (i.html güneş simülasyonundan) ---
var noiseShaderCode = `
    precision highp float;
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
    float fbm(vec3 p) {
        float v = 0.0; float a = 0.5;
        for (int i = 0; i < 6; i++) { v += a * snoise(p); p *= 2.1; a *= 0.5; }
        return v;
    }
    float ridge(float h) { h = abs(h); h = 1.0 - h; return h * h * h; }
    float solarFilaments(vec3 p) {
        float v = 0.0; float a = 0.5; float f = 1.0;
        for (int i = 0; i < 5; i++) { v += a * ridge(snoise(p * f)); f *= 2.2; a *= 0.5; }
        return v;
    }
`;

// Türk Bayrağı Ay-Yıldız SDF kodu
var turkishFlagCode = `
    float sdCircle2D(vec2 p, float r) {
        return length(p) - r;
    }
    float sdStar5(vec2 p, float r, float rf) {
        const vec2 k1 = vec2(0.809016994, -0.587785252);
        const vec2 k2 = vec2(-0.809016994, -0.587785252);
        p.x = abs(p.x);
        p -= 2.0 * max(dot(k1, p), 0.0) * k1;
        p -= 2.0 * max(dot(k2, p), 0.0) * k2;
        p.x = abs(p.x);
        p.y -= r;
        vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
        float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
        return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
    }
    float turkishFlag(vec3 pos, float t) {
        vec3 n = normalize(pos);
        vec2 uv = n.xy * 0.55;
        float facing = smoothstep(0.0, 0.25, n.z);
        float outer = sdCircle2D(uv - vec2(-0.04, 0.0), 0.28);
        float inner = sdCircle2D(uv - vec2(0.07, 0.0), 0.22);
        float crescent = max(outer, -inner);
        float star = sdStar5(uv - vec2(0.20, 0.0), 0.09, 0.42);
        float d = min(crescent, star);
        float shape = 1.0 - smoothstep(-0.01, 0.035, d);
        return shape * facing;
    }
`;

// Güneş gövdesi shader (prosedürel plazma + filament)
var sunBodyVS = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewDir;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
    }
`;
var sunBodyFS = `
    uniform float time;
    uniform vec3 uColor;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewDir;
    ` + noiseShaderCode + turkishFlagCode + `
    void main() {
        vec3 p = normalize(vPosition) * 0.9;
        float t = time * 0.12;
        float n = fbm(p + vec3(t));
        float filaments = solarFilaments(p * 2.2 - vec3(t * 1.5));
        vec3 darkCore = uColor * 0.25;
        vec3 plasma = uColor;
        vec3 whiteHot = mix(uColor, vec3(1.0), 0.7);
        vec3 color = mix(darkCore, plasma, n * 0.6 + 0.4);
        color = mix(color, whiteHot, pow(filaments, 3.8) * 1.1);
        float dotNV = max(dot(vNormal, vViewDir), 0.0);
        float rim = pow(1.0 - dotNV, 2.5);
        color += uColor * rim * 2.2;
        float flag = turkishFlag(vPosition, time);
        float pulse = 0.9 + 0.1 * sin(time * 0.4);
        vec3 flagGlow = mix(uColor * 1.5, vec3(1.0, 0.98, 0.95), 0.5);
        color = mix(color, flagGlow, flag * 0.55 * pulse);
        gl_FragColor = vec4(color, 1.0);
    }
`;

// Ayah güneş shader (InstancedMesh desteği, hafifletilmiş 3-octave noise)
var ayahSunVS = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewDir;
    varying vec3 vColor;
    void main() {
        #ifdef USE_INSTANCING_COLOR
            vColor = instanceColor;
        #else
            vColor = vec3(1.0);
        #endif
        vPosition = position;
        #ifdef USE_INSTANCING
            vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        #else
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        #endif
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
    }
`;
var ayahSunFS = `
    uniform float time;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewDir;
    varying vec3 vColor;
    ` + noiseShaderCode + turkishFlagCode + `
    void main() {
        vec3 p = normalize(vPosition) * 0.9;
        float t = time * 0.12;
        float n = fbm(p + vec3(t));
        float filaments = solarFilaments(p * 2.2 - vec3(t * 1.5));
        vec3 darkCore = vColor * 0.25;
        vec3 plasma = vColor;
        vec3 whiteHot = mix(vColor, vec3(1.0), 0.7);
        vec3 color = mix(darkCore, plasma, n * 0.6 + 0.4);
        color = mix(color, whiteHot, pow(filaments, 3.8) * 1.1);
        float dotNV = max(dot(vNormal, vViewDir), 0.0);
        float rim = pow(1.0 - dotNV, 2.5);
        color += vColor * rim * 2.2;
        float flag = turkishFlag(vPosition, time);
        float pulse = 0.9 + 0.1 * sin(time * 0.4);
        vec3 flagGlow = mix(vColor * 1.5, vec3(1.0, 0.98, 0.95), 0.5);
        color = mix(color, flagGlow, flag * 0.55 * pulse);
        gl_FragColor = vec4(color, 1.0);
    }
`;
