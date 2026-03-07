var fetchDataAutomatically = async () => {
    try {
        var [dataRes, rootsRes] = await Promise.all([
            fetch('quran_data.json'),
            fetch('quran_roots.json').catch(() => null)
        ]);
        if (dataRes.ok) {
            var data = await dataRes.json();
            originalData = data;
            processData(data);
        }
        if (rootsRes && rootsRes.ok) {
            rootDictionary = await rootsRes.json();
        }
    } catch (e) {
        console.log("JSON bulunamadı, manuel yükleme bekleniyor.");
    } finally {
        hideLoadingScreen();
    }
};

var createTextSprite = (text, isSurah) => {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = 512; canvas.height = 64;
    ctx.font = `bold ${isSurah ? 40 : 30}px Inter, sans-serif`;
    ctx.fillStyle = isSurah ? '#00f2ff' : '#ffffff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    var texture = new THREE.CanvasTexture(canvas);
    var mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    var sprite = new THREE.Sprite(mat);
    var s = isSurah ? 5000 : 3000;
    sprite.scale.set(s, s * (canvas.height / canvas.width), 1);
    return sprite;
};

// Dünya-Ay ölçeği: Dünya r=6371km, Ay r=1737km (0.27×), mesafe=384400km (60×Dünya r)
// Sure (Dünya) = 1500, Ayet (Ay) = 400, yörünge mesafesi = 45000 (30×sure r)
var calcLayoutPositions = (surahIds, layoutType) => {
    var surahPosMap = {};
    var ayahScatterR, scatterThickness;

    switch(layoutType) {
        case 'galaxy': {
            var totalTurns = 4;
            var maxRadius = 25000000;
            ayahScatterR = 60000;
            scatterThickness = 300000;
            surahIds.forEach((sid, sIdx) => {
                var t = sIdx / Math.max(surahIds.length - 1, 1);
                var theta = t * totalTurns * Math.PI * 2;
                var r = t * maxRadius;
                surahPosMap[sid] = { x: Math.cos(theta) * r, y: 0, z: Math.sin(theta) * r };
            });
            break;
        }
        case 'nebula': {
            var clusterCount = 7;
            var clusterSpread = 12000000;
            var clusterRadius = 4000000;
            ayahScatterR = 400000;
            scatterThickness = 400000;
            var clusters = [];
            for (var i = 0; i < clusterCount; i++) {
                var phi = Math.acos(1 - 2 * (i + 0.5) / clusterCount);
                var theta = Math.PI * (1 + Math.sqrt(5)) * i;
                clusters.push({
                    x: Math.sin(phi) * Math.cos(theta) * clusterSpread,
                    y: Math.sin(phi) * Math.sin(theta) * clusterSpread * 0.4,
                    z: Math.cos(phi) * clusterSpread
                });
            }
            var gaussRand = () => {
                var u = 0, v = 0;
                while (u === 0) u = Math.random();
                while (v === 0) v = Math.random();
                return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
            };
            surahIds.forEach((sid, sIdx) => {
                var ci = sIdx % clusterCount;
                var cc = clusters[ci];
                surahPosMap[sid] = {
                    x: cc.x + gaussRand() * clusterRadius,
                    y: cc.y + gaussRand() * clusterRadius * 0.3,
                    z: cc.z + gaussRand() * clusterRadius
                };
            });
            break;
        }
        case 'cube': {
            var dim = 5;
            var spacing = 5000000;
            ayahScatterR = 300000;
            scatterThickness = 300000;
            var offset = (dim - 1) / 2 * spacing;
            surahIds.forEach((sid, sIdx) => {
                var ix = sIdx % dim;
                var iy = Math.floor(sIdx / dim) % dim;
                var iz = Math.floor(sIdx / (dim * dim));
                surahPosMap[sid] = {
                    x: ix * spacing - offset,
                    y: iy * spacing - offset,
                    z: iz * spacing - offset
                };
            });
            break;
        }
        case 'sphere': {
            var sphereRadius = 20000000;
            ayahScatterR = 350000;
            scatterThickness = 350000;
            var golden = Math.PI * (3 - Math.sqrt(5));
            surahIds.forEach((sid, sIdx) => {
                var yNorm = 1 - (sIdx / Math.max(surahIds.length - 1, 1)) * 2;
                var radH = Math.sqrt(1 - yNorm * yNorm);
                var theta = golden * sIdx;
                surahPosMap[sid] = {
                    x: Math.cos(theta) * radH * sphereRadius,
                    y: yNorm * sphereRadius,
                    z: Math.sin(theta) * radH * sphereRadius
                };
            });
            break;
        }
        case 'allah': {
            var S = 3000000;
            ayahScatterR = 200000;
            scatterThickness = 200000;
            // Catmull-Rom spline: tüm noktalardan geçen pürüzsüz eğri (C1 süreklilik)
            var catmull = function(points, perSeg) {
                var res = [];
                for (var ci = 0; ci < points.length - 1; ci++) {
                    var p0 = points[Math.max(ci - 1, 0)];
                    var p1 = points[ci];
                    var p2 = points[ci + 1];
                    var p3 = points[Math.min(ci + 2, points.length - 1)];
                    for (var cj = 0; cj < perSeg; cj++) {
                        var ct = cj / perSeg, ct2 = ct * ct, ct3 = ct2 * ct;
                        res.push([
                            0.5 * ((2*p1[0]) + (-p0[0]+p2[0])*ct + (2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*ct2 + (-p0[0]+3*p1[0]-3*p2[0]+p3[0])*ct3),
                            0.5 * ((2*p1[1]) + (-p0[1]+p2[1])*ct + (2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*ct2 + (-p0[1]+3*p1[1]-3*p2[1]+p3[1])*ct3)
                        ]);
                    }
                }
                res.push([points[points.length - 1][0], points[points.length - 1][1]]);
                return res;
            };
            // الله tek sürekli yol — anahtar noktalar (köşe yok)
            var wp = [
                // ── Taban sağ başlangıç ──
                [7, -1],
                // ── Elif (ا): yukarı çıkış ──
                [6.3, 0], [6.2, 4], [6, 7], [5.7, 8.5],
                // ── Elif tepe yuvarlama & geri iniş ──
                [5.4, 9], [5.2, 7], [5.3, 3], [5.5, 0],
                // ── Taban kavisi: Elif → Lam1 ──
                [4.5, -1.3], [3.5, -0.9],
                // ── Lam1 (ل): yukarı çıkış ──
                [2.9, 0], [2.7, 5], [2.5, 9], [2.3, 11],
                // ── Lam1 tepe yuvarlama & geri iniş ──
                [2.0, 11.5], [1.7, 9], [1.8, 5], [2.0, 0],
                // ── Taban kavisi: Lam1 → Lam2 ──
                [1.3, -1.1], [0.7, -0.8],
                // ── Lam2 (ل): yukarı çıkış ──
                [0.3, 0], [0.1, 5], [-0.1, 9], [-0.3, 11],
                // ── Lam2 tepe yuvarlama & geri iniş ──
                [-0.6, 11.5], [-0.9, 9], [-0.8, 5], [-0.6, 0],
                // ── Taban kavisi: Lam2 → Ha ──
                [-1.2, -0.8], [-1.8, -1],
                // ── Ha (ه): büyük kıvrımlı kuyruk ──
                [-3, -3], [-5, -5.5], [-7, -6.2], [-8.5, -4.5],
                // ── Ha: geri kıvrım & kapanış ──
                [-9.2, -2.5], [-8.8, -0.5], [-7.2, 0.5], [-5.5, -0.3]
            ];
            // Pürüzsüz yol oluştur (segment başına 4 örnekleme)
            var smooth = catmull(wp, 4);
            // Toplam yol uzunluğu
            var pathLen = 0;
            for (var pli = 1; pli < smooth.length; pli++) {
                var pdx = smooth[pli][0] - smooth[pli - 1][0];
                var pdy = smooth[pli][1] - smooth[pli - 1][1];
                pathLen += Math.sqrt(pdx * pdx + pdy * pdy);
            }
            // 114 sureyi eşit aralıklarla dağıt
            surahIds.forEach(function(sid, idx) {
                var target = (idx / Math.max(surahIds.length - 1, 1)) * pathLen;
                var acc = 0, px = smooth[0][0], py = smooth[0][1];
                for (var pli = 1; pli < smooth.length; pli++) {
                    var pdx = smooth[pli][0] - smooth[pli - 1][0];
                    var pdy = smooth[pli][1] - smooth[pli - 1][1];
                    var segL = Math.sqrt(pdx * pdx + pdy * pdy);
                    if (acc + segL >= target || pli === smooth.length - 1) {
                        var segT = segL > 0 ? Math.min((target - acc) / segL, 1) : 0;
                        px = smooth[pli - 1][0] + pdx * segT;
                        py = smooth[pli - 1][1] + pdy * segT;
                        break;
                    }
                    acc += segL;
                }
                surahPosMap[sid] = { x: px * S, y: py * S, z: (Math.random() - 0.5) * S * 0.12 };
            });
            break;
        }
    }
    return { surahPosMap, ayahScatterR, scatterThickness };
};

var toggleLayoutMenu = () => {
    var menu = document.getElementById('layout-menu');
    menu.classList.toggle('hidden');
    var close = (e) => {
        if (!document.getElementById('layout-menu-wrap').contains(e.target)) {
            menu.classList.add('hidden');
            document.removeEventListener('click', close);
        }
    };
    if (!menu.classList.contains('hidden')) setTimeout(() => document.addEventListener('click', close), 0);
};

var switchLayout = (type) => {
    currentLayout = type;
    document.querySelectorAll('.layout-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.layout === type);
    });
    document.getElementById('layout-menu').classList.add('hidden');
    if (originalData) processData(originalData);
    else if (nodes.length > 0) processData({ nodes });
};

var processData = (data) => {
    if (!data || !data.nodes) return;
    surahGroups.forEach(g => { scene.remove(g); g.traverse(child => { if (child.isMesh) { child.geometry?.dispose(); if (child.material) { if (Array.isArray(child.material)) child.material.forEach(m => m.dispose()); else child.material.dispose(); } } if (child.isSprite) { child.material?.map?.dispose(); child.material?.dispose(); } }); });
    if(ayahMesh) { scene.remove(ayahMesh); ayahMesh.geometry?.dispose(); ayahMesh.material?.dispose(); }
    if(lineSegments) { scene.remove(lineSegments); lineSegments.geometry?.dispose(); lineSegments.material?.dispose(); }
     labelSprites.forEach(s => { scene.remove(s); s.material?.map?.dispose(); s.material?.dispose(); });
     if (highlightLines) { highlightLines.forEach(l => { scene.remove(l); l.geometry?.dispose(); l.material?.dispose(); }); highlightLines = []; }
     surahGroups = []; ayahNodes = []; rootMap.clear(); labelSprites = []; lineNodePairs = [];
    nodes = data.nodes.map(n => ({ ...n, roots: Array.isArray(n.roots) ? n.roots : [], dipnot: n.dipnot || '' }));
    var surahIds = [...new Set(nodes.map(n => n.id.split(':')[0]))].sort((a,b) => parseInt(a)-parseInt(b));

    // Surah başına ayet sayısı
    var surahAyahCounts = {};
    surahIds.forEach(sid => {
        surahAyahCounts[sid] = nodes.filter(n => n.id.split(':')[0] === sid).length;
    });

    // Yerleşim modeline göre pozisyon hesapla
    var layout = calcLayoutPositions(surahIds, currentLayout);
    var surahPosMap = layout.surahPosMap;
    var ayahScatterR = layout.ayahScatterR;
    var scatterThickness = layout.scatterThickness;

    var lineV = []; var lineC = [];

    nodes.forEach((node, idx) => {
        var parts = node.id.split(':');
        var surahNum = parts[0];
        var ayahNum = parseInt(parts[1]);
        var sp = surahPosMap[surahNum];

        if (ayahNum === 1) {
            node.x = sp.x; node.y = sp.y; node.z = sp.z;
            var g = new THREE.Group();
            g.position.set(node.x, node.y, node.z);
            g.userData = { nodeData: node };
            var c = surahNum === '1' ? new THREE.Color(0xff0000) : new THREE.Color(getRootCSSColor(surahNum));

            // İç çekirdek küre (güneş gövdesi shader)
            var coreMat = new THREE.ShaderMaterial({
                uniforms: { time: { value: 0.0 }, uColor: { value: c.clone() } },
                vertexShader: sunBodyVS,
                fragmentShader: sunBodyFS
            });
            var core = new THREE.Mesh(new THREE.SphereGeometry(1500, 64, 64), coreMat);
            core.renderOrder = 2;
            g.add(core);

            var sLabel = createTextSprite(`${surahNamesTR[surahNum]} ${surahNum}:1`, true);
            sLabel.position.set(0, 4000, 0);
            g.add(sLabel);
            surahGroups.push(g); scene.add(g);
        } else {
            // Ayetler: surenin etrafında dağılım (Dünya-Ay oranı)
            var angle = Math.random() * Math.PI * 2;
            var dist = (Math.random() * 0.7 + 0.3) * ayahScatterR;
            if (currentLayout === 'galaxy') {
                var totalAyahs = surahAyahCounts[surahNum];
                var isUpper = ayahNum <= Math.ceil(totalAyahs / 2);
                node.x = sp.x + Math.cos(angle) * dist;
                node.z = sp.z + Math.sin(angle) * dist;
                node.y = sp.y + (isUpper ? 1 : -1) * (Math.random() * 0.8 + 0.2) * scatterThickness;
            } else {
                var phi = Math.acos(2 * Math.random() - 1);
                node.x = sp.x + Math.sin(phi) * Math.cos(angle) * dist;
                node.y = sp.y + Math.sin(phi) * Math.sin(angle) * dist;
                node.z = sp.z + Math.cos(phi) * dist;
            }
            ayahNodes.push(node);
        }
        (node.roots || []).forEach(r => { if(!rootMap.has(r)) rootMap.set(r, []); rootMap.get(r).push(idx); });
    });

    // Kök bağlantı çizgileri
    rootMap.forEach((ids, root) => {
        if (ids.length < 2) return;
        var color = new THREE.Color(getRootCSSColor(root));
        for (var i = 0; i < ids.length - 1; i++) {
            var n1 = nodes[ids[i]]; var n2 = nodes[ids[i+1]];
            lineV.push(n1.x, n1.y, n1.z, n2.x, n2.y, n2.z);
            lineC.push(color.r, color.g, color.b, color.r, color.g, color.b);
            lineNodePairs.push({ n1: n1.id, n2: n2.id, root: root });
        }
    });
    var lG = new THREE.BufferGeometry();
    lG.setAttribute('position', new THREE.Float32BufferAttribute(lineV, 3));
    lG.setAttribute('color', new THREE.Float32BufferAttribute(lineC, 3));
    var lineOpacity = currentLayout === 'galaxy' ? 0.012 : 0.03;
    lineSegments = new THREE.LineSegments(lG, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: lineOpacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    lineSegments.renderOrder = 1; scene.add(lineSegments);

    // Ayet küreleri (surah rengine göre renk + GLSL animasyon)
    var ayahGeo = new THREE.SphereGeometry(400, 24, 24);
    var ayahMat = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0.0 } },
        vertexShader: ayahSunVS,
        fragmentShader: ayahSunFS
    });
    ayahMesh = new THREE.InstancedMesh(ayahGeo, ayahMat, ayahNodes.length);
    ayahMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(ayahNodes.length * 3), 3);
    var dum = new THREE.Object3D();
    ayahNodes.forEach((a, i) => {
        dum.position.set(a.x, a.y, a.z);
        dum.updateMatrix();
        ayahMesh.setMatrixAt(i, dum.matrix);
        var sid = a.id.split(':')[0];
        var c = sid === '1' ? new THREE.Color(0xff0000) : new THREE.Color(getRootCSSColor(sid));
        ayahMesh.setColorAt(i, c);
    });
    ayahMesh.instanceColor.needsUpdate = true;
    scene.add(ayahMesh);
    ayahNodes.forEach(a => {
        var ap = a.id.split(':');
        var lbl = createTextSprite(`${surahNamesTR[ap[0]]} ${ap[0]}:${ap[1]}`, false);
        lbl.position.set(a.x, a.y + 1200, a.z);
        lbl.visible = false;
        labelSprites.push(lbl);
        scene.add(lbl);
    });
    setTimeout(() => { if(nodes.length > 0) warpTo(nodes[0]); }, 100);
};
