var init = () => {
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x000308);
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 1, 100000000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);
    controls = new THREE.OrbitControls(camera, renderer.domElement); controls.enableDamping = true;

    // Milky Way equirectangular panorama skybox
    new THREE.TextureLoader().load('milkyway.jpg', function(tex) {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        tex.encoding = THREE.sRGBEncoding;
        scene.background = tex;
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
            // Sönük yıldızlar beyaza yakın, parlak yıldızlar renkli (uzayda göz adaptasyonu)
            '  vColor = mix(vec3(0.85, 0.88, 0.92), color, smoothstep(0.0, 0.6, vSizeNorm));',
            // Sensör gürültüsü: çok hafif, neredeyse fark edilmez (%1-2)
            '  vBright = 1.0 - 0.012 + 0.012 * sin(uTime * 0.4 + aPhase);',
            '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
            '  gl_PointSize = aSize * (uScale / -mv.z);',
            '  gl_PointSize = clamp(gl_PointSize, 0.3, 10.0);',
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
            // Keskin çekirdek: uzayda kırınım yok, iğne ucu nokta
            '  float core = exp(-d * d * 320.0);',
            // Sadece parlak yıldızlarda çok hafif optik halo (teleskop lensi)
            '  float halo = exp(-d * d * 18.0) * 0.06 * vSizeNorm;',
            '  float a = (core + halo) * vBright;',
            '  gl_FragColor = vec4(vColor * vBright, a);',
            '}'
        ].join('\n'),
        transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, vertexColors: true
    });
    starField = new THREE.Points(starGeom, starMat);
    scene.add(starField); camera.position.set(0, 10000000, 20000000);

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
            'varying float vAlpha;',
            'varying float vT;',
            'varying float vBright;',
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
            '  float ps = 1.0 / (z * 1.2 + 0.015);',
            '  float cx = cos(angle) * radius * ps;',
            '  float cy = sin(angle) * radius * ps;',
            '',
            '  vec2 ctr = vec2(cx, cy);',
            '  float cLen = length(ctr);',
            '  vec2 dir = cLen > 0.001 ? ctr / cLen : vec2(0.0,1.0);',
            '  vec2 perp = vec2(-dir.y, dir.x);',
            '',
            '  // Yıldızlar noktadan çizgiye — hız arttıkça kademeli uzama',
            '  float sf = smoothstep(0.0, 30.0, uSpeed);',
            '  float sLen = min(max(0.001, sf * uSpeed * 0.006 * depth * ps), 3.0);',
            '  float sWid = mix(0.0012, 0.00018, sf) * (0.3 + depth * 0.8);',
            '',
            '  vec2 off = dir * position.x * sLen + perp * position.y * sWid;',
            '  vec2 ndc = ctr + off;',
            '  ndc.x /= aspect;',
            '',
            '  vAlpha = bright * depth * depth * smoothstep(0.0, 0.03, z);',
            '  vT = position.x;',
            '  vBright = bright;',
            '',
            '  gl_Position = vec4(ndc, 0.0, 1.0);',
            '}'
        ].join('\n');

        var warpFS = [
            'varying float vAlpha;',
            'varying float vT;',
            'varying float vBright;',
            '',
            'void main() {',
            '  float fade = 1.0 - vT * 0.6;',
            '  float a = vAlpha * fade;',
            '  vec3 blueIndigo = vec3(0.35, 0.45, 0.95);',
            '  vec3 white = vec3(0.85, 0.9, 1.0);',
            '  vec3 baseCol = mix(blueIndigo, white, vBright * vBright);',
            '  vec3 col = mix(baseCol * 0.5, baseCol, 1.0 - vT);',
            '  gl_FragColor = vec4(col, a);',
            '}'
        ].join('\n');

        // Arka plan: siyah zemin + merkez mavi-beyaz glow
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
            '  float flash = uFlash * exp(-d * d * 2.5);',
            '  vec3 col = vec3(0.9, 0.92, 1.0) * flash;',
            '  gl_FragColor = vec4(col, max(uAlpha, flash * 0.4));',
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
                uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
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
