var init = () => {
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x000308);
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 1, 100000000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);
    controls = new THREE.OrbitControls(camera, renderer.domElement); controls.enableDamping = true;

    // Milky Way panorama skybox — ters-çevrilmiş küre
    new THREE.TextureLoader().load('milkyway.jpg', function(tex) {
        var skyGeo = new THREE.SphereGeometry(50000000, 64, 32);
        var skyMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false, fog: false });
        skyMesh = new THREE.Mesh(skyGeo, skyMat);
        skyMesh.renderOrder = -1;
        scene.add(skyMesh);
    });

    // Post-processing: HDR Bloom Pipeline
    // 1) Sahne HDR olarak render edilir (tone mapping yok → renkler canlı kalır)
    // 2) Bloom yalnızca HDR parlak noktaları yakalar (rim, filament > 1.0)
    // 3) Son adımda ACES tone mapping uygulanır (renkler korunur)
    var hdrRT = new THREE.WebGLRenderTarget(
        window.innerWidth, window.innerHeight,
        { type: THREE.HalfFloatType }
    );
    composer = new THREE.EffectComposer(renderer, hdrRT);

    var renderScene = new THREE.RenderPass(scene, camera);
    composer.addPass(renderScene);

    var bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.7,  // strength
        0.6,  // radius
        0.3   // threshold
    );
    composer.addPass(bloomPass);

    // ACES Filmic Tone Mapping — bloom'dan SONRA uygulanır
    var acesPass = new THREE.ShaderPass({
        uniforms: {
            tDiffuse: { value: null },
            exposure: { value: 0.9 }
        },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float exposure;
            varying vec2 vUv;
            vec3 ACESFilm(vec3 x) {
                float a = 2.51; float b = 0.03;
                float c = 2.43; float d = 0.59; float e = 0.14;
                return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
            }
            void main() {
                vec4 t = texture2D(tDiffuse, vUv);
                gl_FragColor = vec4(ACESFilm(t.rgb * exposure), t.a);
            }
        `
    });
    composer.addPass(acesPass);
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    // --- Uzay Gemisi Navigasyon Yıldız Haritası ---
    // Atmosfer yok → yıldızlar iğne ucu kadar keskin, titreşimsiz.
    // Samanyolu bandı → yüksek yıldız yoğunluğundan doğal olarak belirir.
    var STAR_COUNT = 120000;
    var _sPos = new Float32Array(STAR_COUNT * 3);
    var _sCol = new Float32Array(STAR_COUNT * 3);
    var _sSiz = new Float32Array(STAR_COUNT);
    var _sPha = new Float32Array(STAR_COUNT);
    var bvToRGB = (bv) => {
        var t = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
        var r, g, b;
        if (t >= 6600) r = 1.0;
        else { r = (t - 1000) / 5600; r = Math.pow(Math.max(0, Math.min(1, r)), 0.38); }
        if (t >= 6600) { g = 1.292936 * Math.pow(t / 6600 - 0.1332, -0.0755); g = Math.min(1, g); }
        else { g = 0.39008 * Math.log(t / 1000) - 0.631; g = Math.max(0, Math.min(1, g)); }
        if (t >= 6600) b = 1.0;
        else if (t <= 2000) b = 0;
        else { b = 0.54320 * Math.log(t / 1000 - 10) - 1.195; b = Math.max(0, Math.min(1, b)); }
        return [r, g, b];
    };
    // Galaktik Kuzey Kutbu & Merkez (J2000)
    var _gnp = { x: -0.8676, y: 0.4560, z: -0.1981 };
    var _gc  = { x: -0.0550, y: -0.4838, z: -0.8737 };
    var _gauss = () => {
        var u, v, s;
        do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; s = u*u + v*v; } while (s >= 1 || s === 0);
        return u * Math.sqrt(-2 * Math.log(s) / s);
    };
    var SPHERE_R = 28000000;
    for (var i = 0; i < STAR_COUNT; i++) {
        var i3 = i * 3;
        var pop = Math.random();
        var sx, sy, sz;
        if (pop < 0.48) {
            // Samanyolu Bandı
            var u = Math.random() * 2 - 1;
            var phi = Math.random() * Math.PI * 2;
            var sinT = Math.sqrt(1 - u * u);
            sx = sinT * Math.cos(phi); sy = sinT * Math.sin(phi); sz = u;
            var dot = sx * _gnp.x + sy * _gnp.y + sz * _gnp.z;
            var compress = 0.10 + Math.random() * 0.10;
            sx -= _gnp.x * dot * (1 - compress);
            sy -= _gnp.y * dot * (1 - compress);
            sz -= _gnp.z * dot * (1 - compress);
            var len = Math.sqrt(sx*sx + sy*sy + sz*sz) || 1;
            sx /= len; sy /= len; sz /= len;
        } else if (pop < 0.58) {
            // Galaktik Şişkinlik
            var spread = 0.22;
            sx = _gc.x + _gauss() * spread;
            sy = _gc.y + _gauss() * spread;
            sz = _gc.z + _gauss() * spread;
            var len = Math.sqrt(sx*sx + sy*sy + sz*sz) || 1;
            sx /= len; sy /= len; sz /= len;
        } else if (pop < 0.62) {
            // Macellan Bulutları
            var which = Math.random() < 0.6;
            var cx = which ? 0.35 : 0.28, cy = which ? -0.78 : -0.82, cz = which ? 0.52 : 0.50;
            sx = cx + _gauss() * 0.05; sy = cy + _gauss() * 0.05; sz = cz + _gauss() * 0.05;
            var len = Math.sqrt(sx*sx + sy*sy + sz*sz) || 1;
            sx /= len; sy /= len; sz /= len;
        } else {
            // Alan yıldızları
            var u = Math.random() * 2 - 1;
            var phi = Math.random() * Math.PI * 2;
            var sinT = Math.sqrt(1 - u * u);
            sx = sinT * Math.cos(phi); sy = sinT * Math.sin(phi); sz = u;
        }
        var rVar = SPHERE_R * (0.88 + Math.random() * 0.24);
        _sPos[i3] = sx * rVar; _sPos[i3+1] = sy * rVar; _sPos[i3+2] = sz * rVar;
        // B-V renk dağılımı
        var bv;
        var sp = Math.random();
        if (sp < 0.01) bv = -0.2 + Math.random() * 0.15;
        else if (sp < 0.04) bv = -0.05 + Math.random() * 0.15;
        else if (sp < 0.12) bv = 0.10 + Math.random() * 0.22;
        else if (sp < 0.35) bv = 0.32 + Math.random() * 0.30;
        else if (sp < 0.65) bv = 0.62 + Math.random() * 0.40;
        else bv = 1.02 + Math.random() * 0.50;
        var rgb = bvToRGB(Math.max(-0.4, Math.min(2.0, bv)));
        var bright = 0.45 + Math.random() * 0.55;
        _sCol[i3] = rgb[0]*bright; _sCol[i3+1] = rgb[1]*bright; _sCol[i3+2] = rgb[2]*bright;
        // Boyut: çoğu çok küçük iğne ucu, çok nadir büyük
        var mag = Math.pow(Math.random(), 5.0);
        _sSiz[i] = 180 + mag * 2200;
        if (Math.random() < 0.0008) _sSiz[i] = 1800 + Math.random() * 1200;
        _sPha[i] = Math.random() * 6.2832;
    }
    var starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(_sPos, 3));
    starGeom.setAttribute('color', new THREE.BufferAttribute(_sCol, 3));
    starGeom.setAttribute('aSize', new THREE.BufferAttribute(_sSiz, 1));
    starGeom.setAttribute('aPhase', new THREE.BufferAttribute(_sPha, 1));
    var starMat = new THREE.ShaderMaterial({
        uniforms: { uTime: {value:0}, uScale: {value: window.innerHeight * 0.5} },
        vertexShader: [
            'attribute float aSize;',
            'attribute float aPhase;',
            'varying vec3 vColor;',
            'varying float vBright;',
            'varying float vSizeNorm;',
            'uniform float uTime;',
            'uniform float uScale;',
            'void main(){',
            '  vSizeNorm = clamp((aSize - 180.0) / 2200.0, 0.0, 1.0);',
            // Sönük yıldızlar beyaza yakın, parlak yıldızlar renkli
            '  vColor = mix(vec3(0.85, 0.88, 0.92), color, smoothstep(0.0, 0.6, vSizeNorm));',
            // Geliştirilmiş kırpışma: %5-8 titreşim, çoklu frekans
            '  float twinkle1 = sin(uTime * 0.7 + aPhase * 6.28) * 0.04;',
            '  float twinkle2 = sin(uTime * 1.3 + aPhase * 3.14 + 2.0) * 0.025;',
            '  float twinkle3 = sin(uTime * 2.1 + aPhase * 1.57) * 0.015;',
            '  vBright = 1.0 + (twinkle1 + twinkle2 + twinkle3) * vSizeNorm;',
            '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
            '  gl_PointSize = aSize * (uScale / -mv.z);',
            '  gl_PointSize = clamp(gl_PointSize, 0.3, 14.0);',
            '  gl_Position = projectionMatrix * mv;',
            '}'
        ].join('\n'),
        fragmentShader: [
            'varying vec3 vColor;',
            'varying float vBright;',
            'varying float vSizeNorm;',
            'void main(){',
            '  vec2 c = gl_PointCoord - 0.5;',
            '  float d = length(c);',
            '  if(d > 0.5) discard;',
            // Keskin çekirdek
            '  float core = exp(-d * d * 320.0);',
            // Optik halo
            '  float halo = exp(-d * d * 18.0) * 0.08 * vSizeNorm;',
            // Difraksiyon çizgileri — parlak yıldızlarda 4-kollu çapraz ışık
            '  float spike = 0.0;',
            '  if(vSizeNorm > 0.15) {',
            '    float ax = abs(c.x);',
            '    float ay = abs(c.y);',
            '    float spikeH = exp(-ay * ay * 800.0) * exp(-ax * 8.0);',
            '    float spikeV = exp(-ax * ax * 800.0) * exp(-ay * 8.0);',
            // Çapraz çizgiler (45°)
            '    float d45a = abs(c.x + c.y) * 0.7071;',
            '    float d45b = abs(c.x - c.y) * 0.7071;',
            '    float spikeDa = exp(-d45a * d45a * 1200.0) * exp(-(d45b + d) * 6.0);',
            '    float spikeDb = exp(-d45b * d45b * 1200.0) * exp(-(d45a + d) * 6.0);',
            '    spike = (spikeH + spikeV) * 0.25 + (spikeDa + spikeDb) * 0.12;',
            '    spike *= vSizeNorm * vSizeNorm;',
            '  }',
            '  float a = (core + halo + spike) * vBright;',
            '  gl_FragColor = vec4(vColor * vBright, a);',
            '}'
        ].join('\n'),
        transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, vertexColors: true
    });
    starField = new THREE.Points(starGeom, starMat);
    scene.add(starField); camera.position.set(0, 10000000, 20000000);

    // --- Prosedürel Nebula Bulutsuları ---
    // Sahnenin farklı bölgelerine yerleştirilmiş renkli gaz bulutsları
    var nebulaConfigs = [
        { pos: [-18000000, 8000000, -22000000], scale: 12000000, color1: [0.4, 0.1, 0.8], color2: [0.1, 0.0, 0.3], seed: 1.0, density: 1.2, rotZ: 0.3 },
        { pos: [22000000, -5000000, -15000000], scale: 10000000, color1: [0.0, 0.7, 0.8], color2: [0.0, 0.15, 0.3], seed: 2.7, density: 1.0, rotZ: -0.5 },
        { pos: [-8000000, -18000000, 16000000], scale: 14000000, color1: [0.9, 0.3, 0.1], color2: [0.3, 0.05, 0.0], seed: 4.2, density: 0.9, rotZ: 1.2 },
        { pos: [15000000, 15000000, 10000000], scale: 9000000, color1: [0.8, 0.1, 0.3], color2: [0.2, 0.0, 0.1], seed: 5.8, density: 1.1, rotZ: -0.8 },
        { pos: [-20000000, -10000000, -8000000], scale: 11000000, color1: [0.2, 0.5, 0.9], color2: [0.05, 0.1, 0.3], seed: 7.1, density: 0.8, rotZ: 0.7 },
        { pos: [5000000, 22000000, -20000000], scale: 13000000, color1: [0.6, 0.0, 0.7], color2: [0.15, 0.0, 0.2], seed: 9.3, density: 1.0, rotZ: -1.1 },
        { pos: [-15000000, 5000000, 24000000], scale: 8000000, color1: [0.1, 0.8, 0.4], color2: [0.0, 0.2, 0.1], seed: 3.5, density: 0.7, rotZ: 0.4 }
    ];
    nebulaConfigs.forEach(function(cfg) {
        var geo = new THREE.PlaneGeometry(cfg.scale, cfg.scale);
        var mat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor1: { value: new THREE.Vector3(cfg.color1[0], cfg.color1[1], cfg.color1[2]) },
                uColor2: { value: new THREE.Vector3(cfg.color2[0], cfg.color2[1], cfg.color2[2]) },
                uSeed: { value: cfg.seed },
                uDensity: { value: cfg.density }
            },
            vertexShader: nebulaVS,
            fragmentShader: nebulaFS,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        var mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
        mesh.rotation.z = cfg.rotZ;
        mesh.renderOrder = -0.5;
        scene.add(mesh);
        nebulaMeshes.push(mesh);
    });

    // --- Kozmik Toz Şeritleri (Dark Nebula) ---
    var dustLaneConfigs = [
        { pos: [10000000, -3000000, -18000000], scale: 16000000, seed: 1.5, rotZ: 0.6 },
        { pos: [-12000000, 12000000, -5000000], scale: 12000000, seed: 3.8, rotZ: -0.9 },
        { pos: [0, -20000000, 8000000], scale: 18000000, seed: 6.2, rotZ: 1.5 }
    ];
    dustLaneConfigs.forEach(function(cfg) {
        var geo = new THREE.PlaneGeometry(cfg.scale, cfg.scale * 0.4);
        var mat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uSeed: { value: cfg.seed }
            },
            vertexShader: cosmicDustVS,
            fragmentShader: cosmicDustFS,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending
        });
        var mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
        mesh.rotation.z = cfg.rotZ;
        mesh.renderOrder = -0.3;
        scene.add(mesh);
        cosmicDustLanes.push(mesh);
    });

    // --- Uzay Tozu Partikülleri (Space Dust) ---
    var DUST_COUNT = 3000;
    var _dPos = new Float32Array(DUST_COUNT * 3);
    var _dCol = new Float32Array(DUST_COUNT * 3);
    var _dSiz = new Float32Array(DUST_COUNT);
    var _dPha = new Float32Array(DUST_COUNT);
    var _dBri = new Float32Array(DUST_COUNT);
    for (var di = 0; di < DUST_COUNT; di++) {
        var di3 = di * 3;
        // Kamera etrafında küresel dağılım
        var du = Math.random() * 2 - 1;
        var dphi = Math.random() * Math.PI * 2;
        var dsT = Math.sqrt(1 - du * du);
        var dr = 500000 + Math.random() * 4500000;
        _dPos[di3] = dsT * Math.cos(dphi) * dr;
        _dPos[di3 + 1] = dsT * Math.sin(dphi) * dr;
        _dPos[di3 + 2] = du * dr;
        // Renk: soğuk mavi-beyaz tonları
        var cType = Math.random();
        if (cType < 0.5) { _dCol[di3] = 0.7; _dCol[di3+1] = 0.8; _dCol[di3+2] = 1.0; }
        else if (cType < 0.75) { _dCol[di3] = 1.0; _dCol[di3+1] = 0.9; _dCol[di3+2] = 0.7; }
        else { _dCol[di3] = 0.9; _dCol[di3+1] = 0.95; _dCol[di3+2] = 1.0; }
        _dSiz[di] = 80 + Math.random() * 300;
        _dPha[di] = Math.random();
        _dBri[di] = 0.3 + Math.random() * 0.7;
    }
    var dustGeom = new THREE.BufferGeometry();
    dustGeom.setAttribute('position', new THREE.BufferAttribute(_dPos, 3));
    dustGeom.setAttribute('color', new THREE.BufferAttribute(_dCol, 3));
    dustGeom.setAttribute('aSize', new THREE.BufferAttribute(_dSiz, 1));
    dustGeom.setAttribute('aPhase', new THREE.BufferAttribute(_dPha, 1));
    dustGeom.setAttribute('aBright', new THREE.BufferAttribute(_dBri, 1));
    var dustMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uScale: { value: window.innerHeight * 0.5 } },
        vertexShader: spaceDustVS,
        fragmentShader: spaceDustFS,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true
    });
    spaceDust = new THREE.Points(dustGeom, dustMat);
    scene.add(spaceDust);

    // WebGL Hyperspace warp — Star Wars Lightspeed Jump
    {
        var WARP_COUNT = 10000;
        var baseGeom = new THREE.InstancedBufferGeometry();
        baseGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
            0.0,-0.5,0.0,  1.0,-0.5,0.0,  1.0,0.5,0.0,
            0.0,-0.5,0.0,  1.0,0.5,0.0,   0.0,0.5,0.0
        ]), 3));
        var iData = new Float32Array(WARP_COUNT * 4);
        for (var i = 0; i < WARP_COUNT; i++) {
            iData[i*4]   = Math.random() * Math.PI * 2;
            iData[i*4+1] = 0.01 + Math.pow(Math.random(), 0.4) * 0.99;
            iData[i*4+2] = Math.random();
            iData[i*4+3] = 0.1 + Math.random() * 0.9;
        }
        baseGeom.setAttribute('aInst', new THREE.InstancedBufferAttribute(iData, 4));

        var warpVS = [
            'attribute vec4 aInst;',
            'uniform float uSpeed;',
            'uniform float uTime;',
            'uniform vec2 uRes;',
            'uniform float uSwirl;',
            'varying float vAlpha;',
            'varying float vT;',
            'varying float vBright;',
            'varying float vDepth;',
            '',
            'void main() {',
            '  float angle  = aInst.x;',
            '  float radius = aInst.y;',
            '  float zBase  = aInst.z;',
            '  float bright = aInst.w;',
            '  float aspect = uRes.x / uRes.y;',
            '',
            '  float z = mod(zBase - uTime * 0.5, 1.0);',
            '  float depth = 1.0 - z;',
            '',
            '  // Hafif spiral — çok hızda minimal döndürme',
            '  float swirlAngle = angle + uSwirl * depth * 0.5;',
            '',
            '  float ps = 1.0 / (z * 1.2 + 0.015);',
            '  float cx = cos(swirlAngle) * radius * ps;',
            '  float cy = sin(swirlAngle) * radius * ps;',
            '',
            '  vec2 ctr = vec2(cx, cy);',
            '  float cLen = length(ctr);',
            '  vec2 dir = cLen > 0.001 ? ctr / cLen : vec2(0.0,1.0);',
            '  vec2 perp = vec2(-dir.y, dir.x);',
            '',
            '  // Millennium Falcon: çizgiler ÇOK UZUN ve KALIN olmalı',
            '  float sf = smoothstep(0.0, 20.0, uSpeed);',
            '  float sLen = min(max(0.001, sf * uSpeed * 0.015 * depth * ps), 8.0);',
            '  float sWid = mix(0.002, 0.0004, sf) * (0.5 + depth);',
            '',
            '  // Tam hızda kalınlaşma',
            '  float thicken = smoothstep(60.0, 180.0, uSpeed) * 2.5;',
            '  sWid *= (1.0 + thicken);',
            '',
            '  vec2 off = dir * position.x * sLen + perp * position.y * sWid;',
            '  vec2 ndc = ctr + off;',
            '  ndc.x /= aspect;',
            '',
            '  vAlpha = bright * depth * depth * smoothstep(0.0, 0.03, z);',
            '  // Yüksek hızda ÇOK parlak — ekranı dolduran çizgiler',
            '  vAlpha *= (1.0 + smoothstep(40.0, 150.0, uSpeed) * 2.0);',
            '  vT = position.x;',
            '  vBright = bright;',
            '  vDepth = depth;',
            '',
            '  gl_Position = vec4(ndc, 0.0, 1.0);',
            '}'
        ].join('\n');

        var warpFS = [
            'varying float vAlpha;',
            'varying float vT;',
            'varying float vBright;',
            'varying float vDepth;',
            '',
            'void main() {',
            '  float fade = 1.0 - vT * 0.35;',
            '  float a = vAlpha * fade;',
            '',
            '  // Millennium Falcon: BEYAZ dominant, hafif mavi ton',
            '  vec3 coolWhite = vec3(0.85, 0.9, 1.0);',
            '  vec3 pureWhite = vec3(1.0, 1.0, 1.0);',
            '  vec3 paleBlue  = vec3(0.7, 0.82, 1.0);',
            '',
            '  // Parlak yıldızlar beyaz, soluk olanlar hafif mavimsi',
            '  vec3 baseCol = mix(paleBlue, coolWhite, vBright);',
            '  baseCol = mix(baseCol, pureWhite, vBright * vBright);',
            '',
            '  // Çizgi başlangıcı (baş) daha beyaz ve parlak',
            '  float core = (1.0 - vT) * (1.0 - vT);',
            '  baseCol = mix(baseCol, pureWhite, core * 0.6);',
            '  a *= (1.0 + core * 0.5);',
            '',
            '  gl_FragColor = vec4(baseCol, a);',
            '}'
        ].join('\n');

        // Arka plan: SADECE çıkış flash — hyperspace boyunca karanlık kalır (Millennium Falcon referans)
        var bgGeom = new THREE.BufferGeometry();
        bgGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
            -1,-1,0, 1,-1,0, 1,1,0, -1,-1,0, 1,1,0, -1,1,0
        ]), 3));
        var bgVS = 'varying vec2 vP;void main(){vP=position.xy;gl_Position=vec4(position.xy,0.0,1.0);}';
        var bgFS = [
            'uniform float uAlpha;',
            'uniform float uFlash;',
            'varying vec2 vP;',
            'void main() {',
            '  float d = length(vP);',
            '  // Çıkış flash — kısa beyaz patlama, merkez en parlak',
            '  float flash = uFlash * exp(-d * d * 0.6);',
            '  vec3 col = vec3(0.95, 0.97, 1.0) * flash;',
            '  // Alpha: çok düşük taban + flash anında yüksek',
            '  gl_FragColor = vec4(col, max(uAlpha, flash * 0.85));',
            '}'
        ].join('\n');
        var bgMat = new THREE.ShaderMaterial({
            uniforms: { uAlpha: { value: 0.0 }, uFlash: { value: 0.0 } },
            vertexShader: bgVS, fragmentShader: bgFS,
            transparent: true, depthTest: false, depthWrite: false
        });
        warpBg = new THREE.Mesh(bgGeom, bgMat);
        warpBg.renderOrder = 9998;
        warpBg.frustumCulled = false;
        warpBg.visible = false;
        warpBg.layers.set(1);
        scene.add(warpBg);

        var warpMat = new THREE.ShaderMaterial({
            uniforms: {
                uSpeed: { value: 0.0 },
                uTime: { value: 0.0 },
                uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                uSwirl: { value: 0.0 }
            },
            vertexShader: warpVS, fragmentShader: warpFS,
            transparent: true, depthWrite: false, depthTest: false,
            blending: THREE.AdditiveBlending, side: THREE.DoubleSide
        });
        warpMesh = new THREE.Mesh(baseGeom, warpMat);
        warpMesh.frustumCulled = false;
        warpMesh.renderOrder = 9999;
        warpMesh.visible = false;
        warpMesh.layers.set(1);
        scene.add(warpMesh);
    }
    scene.add(camera);
    renderer.domElement.addEventListener('click', onMouseClick);
    window.addEventListener('mousemove', onMouseMove);
    animate();

    // --- OTOMATİK VERİ ÇEKME (GitHub Pages Desteği) ---
    fetchDataAutomatically();
};
