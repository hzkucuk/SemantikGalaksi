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
    float turkishFlag(vec3 viewNorm) {
        vec2 uv = viewNorm.xy * 0.55;
        float facing = smoothstep(0.0, 0.25, viewNorm.z);
        float outer = sdCircle2D(uv - vec2(-0.04, 0.0), 0.28);
        float inner = sdCircle2D(uv - vec2(0.07, 0.0), 0.22);
        float crescent = max(outer, -inner);
        float star = sdStar5(uv - vec2(0.20, 0.0), 0.09, 0.42);
        float d = min(crescent, star);
        float shape = 1.0 - smoothstep(-0.01, 0.035, d);
        return shape * facing;
    }
    // İngiliz Bayrağı — Union Jack çapraz + haç
    float britishFlag(vec3 viewNorm) {
        vec2 uv = viewNorm.xy * 0.55;
        float facing = smoothstep(0.0, 0.25, viewNorm.z);
        // Merkez haç
        float cross = min(abs(uv.x), abs(uv.y));
        float crossShape = 1.0 - smoothstep(0.02, 0.06, cross);
        // Çapraz haç (X)
        float d1 = abs(uv.x - uv.y) / 1.414;
        float d2 = abs(uv.x + uv.y) / 1.414;
        float diag = min(d1, d2);
        float diagShape = 1.0 - smoothstep(0.01, 0.04, diag);
        // Daire maskeleme
        float mask = 1.0 - smoothstep(0.28, 0.32, length(uv));
        float shape = max(crossShape * 0.9, diagShape * 0.5) * mask;
        return shape * facing;
    }
    // Rus Bayrağı — yatay üç şerit
    float russianFlag(vec3 viewNorm) {
        vec2 uv = viewNorm.xy * 0.55;
        float facing = smoothstep(0.0, 0.25, viewNorm.z);
        float mask = 1.0 - smoothstep(0.28, 0.32, length(uv));
        // Üst şerit (beyaz) ve alt şerit (kırmızı) parlak, orta (mavi) koyu
        float stripe = smoothstep(-0.01, 0.01, abs(uv.y - 0.10)) * smoothstep(-0.01, 0.01, abs(uv.y + 0.10));
        float bands = 1.0 - stripe;
        // Yıldız merkeze
        float star = sdStar5(uv, 0.08, 0.42);
        float starShape = 1.0 - smoothstep(-0.01, 0.03, star);
        float shape = max(bands * 0.3, starShape * 0.7) * mask;
        return shape * facing;
    }
    // İtalyan Bayrağı — dikey üç şerit
    float italianFlag(vec3 viewNorm) {
        vec2 uv = viewNorm.xy * 0.55;
        float facing = smoothstep(0.0, 0.25, viewNorm.z);
        float mask = 1.0 - smoothstep(0.28, 0.32, length(uv));
        // Dikey şeritler — sol yeşil, orta beyaz, sağ kırmızı
        float stripe = smoothstep(-0.01, 0.01, abs(uv.x - 0.10)) * smoothstep(-0.01, 0.01, abs(uv.x + 0.10));
        float bands = 1.0 - stripe;
        float shape = bands * 0.5 * mask;
        return shape * facing;
    }
    // İspanyol Bayrağı — yatay şeritler + merkez sembol
    float spanishFlag(vec3 viewNorm) {
        vec2 uv = viewNorm.xy * 0.55;
        float facing = smoothstep(0.0, 0.25, viewNorm.z);
        float mask = 1.0 - smoothstep(0.28, 0.32, length(uv));
        // Üst ve alt kırmızı şeritler
        float topBand = 1.0 - smoothstep(0.10, 0.12, uv.y);
        float bottomBand = 1.0 - smoothstep(0.10, 0.12, -uv.y);
        float redBands = max(1.0 - smoothstep(0.08, 0.12, abs(abs(uv.y) - 0.18)), 0.0);
        // Merkez amblem — küçük daire
        float emblem = sdCircle2D(uv + vec2(0.05, 0.0), 0.06);
        float emblemShape = 1.0 - smoothstep(-0.01, 0.02, emblem);
        float shape = max(redBands * 0.4, emblemShape * 0.6) * mask;
        return shape * facing;
    }
    // Bayrak seçici — uFlagType: 0=TR, 1=EN, 2=RU, 3=IT, 4=ES
    float getFlag(vec3 viewNorm, int flagType) {
        if (flagType == 1) return britishFlag(viewNorm);
        if (flagType == 2) return russianFlag(viewNorm);
        if (flagType == 3) return italianFlag(viewNorm);
        if (flagType == 4) return spanishFlag(viewNorm);
        return turkishFlag(viewNorm);
    }
`;

// --- Neon Beam Shader (Kök Bağlantı Işınları) ---
var neonBeamVS = `
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec2 vUv;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
    }
`;
var neonBeamFS = `
    uniform vec3 uColor;
    uniform float uTime;
    uniform float uOpacity;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec2 vUv;
    void main() {
        // Normal-view açısı: merkez parlak, kenar sönük (silindir glow)
        float nDotV = abs(dot(normalize(vNormal), normalize(vViewDir)));
        float core = pow(nDotV, 1.5);
        // Enerji akış animasyonu — ışın boyunca hareket eden parıltı
        float flow = sin(vUv.y * 12.0 - uTime * 3.0) * 0.15 + 0.85;
        float pulse = 0.95 + 0.05 * sin(uTime * 2.0);
        // Kenar glow — yumuşak azalma
        float edgeGlow = pow(nDotV, 0.4) * 0.3;
        float intensity = (core * 0.7 + edgeGlow) * flow * pulse;
        vec3 col = uColor * intensity * 1.5;
        // Parlak çekirdek beyazlaşma
        col = mix(col, vec3(1.0), core * core * 0.3);
        float alpha = intensity * uOpacity;
        gl_FragColor = vec4(col, alpha);
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
    uniform int uFlagType;
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
        float flag = getFlag(vNormal, uFlagType);
        float pulse = 0.9 + 0.1 * sin(time * 0.4);
        vec3 flagGlow = mix(uColor * 1.5, vec3(1.0, 0.98, 0.95), 0.5);
        color = mix(color, flagGlow, flag * 0.55 * pulse);
        gl_FragColor = vec4(color, 1.0);
    }
`;

// --- Prosedürel Nebula Shader ---
var nebulaVS = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;
var nebulaFS = `
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uSeed;
    uniform float uDensity;
    varying vec2 vUv;
    ` + noiseShaderCode + `
    void main() {
        vec2 uv = vUv * 2.0 - 1.0;
        float dist = length(uv);
        float mask = 1.0 - smoothstep(0.3, 1.0, dist);
        vec3 p = vec3(uv * 1.8 + uSeed * 10.0, uTime * 0.015 + uSeed);
        float n1 = fbm(p * 1.2);
        float n2 = fbm(p * 2.5 + vec3(43.0, 17.0, 31.0));
        float n3 = fbm(p * 0.6 + vec3(n1 * 0.4, n2 * 0.3, 0.0));
        float filament = ridge(snoise(p * 3.0 + vec3(uTime * 0.02)));
        float density = n3 * 0.6 + n1 * 0.3 + filament * 0.15;
        density = pow(max(density, 0.0), 1.5) * uDensity;
        vec3 col = mix(uColor2, uColor1, n1 * 0.5 + 0.5);
        col += vec3(filament * 0.1) * uColor1;
        float core = exp(-dist * dist * 4.0) * 0.3;
        col += uColor1 * core;
        float alpha = density * mask * 0.55;
        alpha = clamp(alpha, 0.0, 0.7);
        gl_FragColor = vec4(col, alpha);
    }
`;

// --- Uzay Tozu (Space Dust) Shader ---
var spaceDustVS = `
    attribute float aSize;
    attribute float aPhase;
    attribute float aBright;
    uniform float uTime;
    uniform float uScale;
    varying float vAlpha;
    varying vec3 vColor;
    void main() {
        float twinkle = 0.6 + 0.4 * sin(uTime * 1.5 + aPhase * 6.28);
        vAlpha = aBright * twinkle;
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (uScale / -mv.z);
        gl_PointSize = clamp(gl_PointSize, 0.5, 6.0);
        gl_Position = projectionMatrix * mv;
    }
`;
var spaceDustFS = `
    varying float vAlpha;
    varying vec3 vColor;
    void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float glow = exp(-d * d * 20.0);
        gl_FragColor = vec4(vColor, glow * vAlpha * 0.6);
    }
`;

// --- Kozmik Toz Şeridi (Dark Nebula) Shader ---
var cosmicDustVS = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;
var cosmicDustFS = `
    uniform float uTime;
    uniform float uSeed;
    varying vec2 vUv;
    ` + noiseShaderCode + `
    void main() {
        vec2 uv = vUv * 2.0 - 1.0;
        float dist = length(uv);
        float mask = 1.0 - smoothstep(0.2, 0.95, dist);
        vec3 p = vec3(uv * 1.5 + uSeed * 10.0, uTime * 0.008 + uSeed);
        float n = fbm(p * 1.5);
        float n2 = fbm(p * 3.0 + vec3(7.0, 13.0, 23.0));
        float density = (n * 0.7 + n2 * 0.3);
        density = pow(max(density * 0.5 + 0.25, 0.0), 2.0);
        float alpha = density * mask * 0.45;
        vec3 col = mix(vec3(0.0), vec3(0.15, 0.03, 0.02), n * mask * 0.3);
        gl_FragColor = vec4(col, alpha);
    }
`;
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
    uniform int uFlagType;
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
        float flag = getFlag(vNormal, uFlagType);
        float pulse = 0.9 + 0.1 * sin(time * 0.4);
        vec3 flagGlow = mix(vColor * 1.5, vec3(1.0, 0.98, 0.95), 0.5);
        color = mix(color, flagGlow, flag * 0.55 * pulse);
        gl_FragColor = vec4(color, 1.0);
    }
`;
