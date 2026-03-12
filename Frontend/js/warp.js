var warpTo = (node) => {
    if(!node) return;
    hideTooltip();
    warpActive = true; warpProgress = 0; warpDrift = false; controls.enabled = false;
    warpStart.copy(camera.position); warpTarget.set(node.x, node.y, node.z);
    warpEnd.set(node.x + 4000, node.y + 8000, node.z + 12000);
    showHUD(node);
    try { localStorage.setItem('sgx_last_node', node.id); } catch(e) {}
};
window.warpToId = (id) => { var t = nodes.find(n => n.id === id); if(t) warpTo(t); };

var _lastFrameTime = 0;
var _fpsFrames = 0;
var _fpsTime = 0;
var animate = (now) => {
    requestAnimationFrame(animate);
    if (!now) now = performance.now();
    var dt = _lastFrameTime ? Math.min((now - _lastFrameTime) * 0.001, 0.05) : 0.016;
    _lastFrameTime = now;
    if (introWarp) {
        introWarpTime += dt;
        var dur = 2.0;
        var p = Math.min(introWarpTime / dur, 1);
        var sp;
        if (p < 0.3) sp = Math.pow(p / 0.3, 3);
        else if (p < 0.7) sp = 1.0;
        else sp = Math.pow((1 - p) / 0.3, 2);
        var spd = 1 + sp * 120;
        if (warpMesh) {
            warpMesh.visible = true;
            warpMesh.material.uniforms.uSpeed.value = spd;
            warpMesh.material.uniforms.uTime.value += dt * spd * 0.1;
            warpMesh.material.uniforms.uSwirl.value = sp * 0.15;
        }
        if (warpBg) {
            var exitFlash = 0;
            if (p > 0.8 && p < 0.95) {
                exitFlash = Math.sin(((p - 0.8) / 0.15) * Math.PI) * 0.6;
            }
            warpBg.visible = (exitFlash > 0.01);
            warpBg.material.uniforms.uAlpha.value = 0;
            warpBg.material.uniforms.uFlash.value = exitFlash;
        }
        if (p >= 1) {
            introWarp = false;
            if (warpMesh) {
                warpMesh.visible = false;
                warpMesh.material.uniforms.uSpeed.value = 0;
                warpMesh.material.uniforms.uTime.value = 0;
                warpMesh.material.uniforms.uSwirl.value = 0;
            }
            if (warpBg) {
                warpBg.visible = false;
                warpBg.material.uniforms.uAlpha.value = 0;
                warpBg.material.uniforms.uFlash.value = 0;
            }
        }
    }
    if (warpActive) {
        // Yavaş birikim → GÜM sonrası anında drift'e geç
        warpProgress += dt * 0.35;
        var p = Math.min(warpProgress, 1);
        var ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

        // ═══════════════════════════════════════════════════════
        // GİRİŞ: yavaşşş... GÜM! → anında drift (ters çıkış)
        // ═══════════════════════════════════════════════════════
        // Faz 1: YAVAŞ BİRİKİM (0-45%)  ~1.3s — yıldızlar yavaşça uzar
        // Faz 2: GÜM!          (45-50%)  ~0.15s — ani patlama
        //        → anında drift'e geç (ters çıkış)

        if (p < 1) {
            var sp, swirl;

            if (p < 0.45) {
                // ── YAVAŞ BİRİKİM ──
                warpPhase = 1;
                var t = p / 0.45;
                sp = Math.pow(t, 3) * 0.08;
                swirl = 0;
                warpShakeX = 0;
                warpShakeY = 0;

            } else if (p < 0.50) {
                // ── GÜM! ──
                warpPhase = 2;
                var t = (p - 0.45) / 0.05;
                sp = 0.08 + Math.pow(t, 0.3) * 0.92;
                swirl = t * 0.2;
                warpShakeX = (Math.sin(t * 71.0) * 0.6 + Math.sin(t * 130.0) * 0.4) * (1.0 - t) * 200;
                warpShakeY = (Math.cos(t * 89.0) * 0.5 + Math.cos(t * 110.0) * 0.4) * (1.0 - t) * 130;

            } else {
                // ── GÜM tamamlandı — anında drift'e geç ──
                sp = 1.0; swirl = 0.2;
                warpShakeX = 0; warpShakeY = 0;
                // Zorla bitir — p'yi de güncelle ki aynı frame'de drift başlasın
                warpProgress = 1.0;
                p = 1.0;
            }

            warpSpeed = 1 + sp * 350;

            if (warpMesh) {
                warpMesh.visible = true;
                warpMesh.material.uniforms.uSpeed.value = warpSpeed;
                warpMesh.material.uniforms.uTime.value += dt * warpSpeed * 0.1;
                warpMesh.material.uniforms.uSwirl.value = swirl;
            }
            if (warpBg) {
                warpBg.visible = false;
            }
        }

        // FOV — minimal, Star Wars tarzı (kamera açısı neredeyse sabit)
        if (p < 0.45) {
            var t = p / 0.45;
            camera.fov = 65 - t * 3;
        } else {
            var t = Math.min((p - 0.45) / 0.05, 1);
            camera.fov = 62 + Math.pow(t, 0.3) * 6;
        }
        camera.updateProjectionMatrix();

        // Kamera hareketi + sarsıntı
        camera.position.lerpVectors(warpStart, warpEnd, ease);
        camera.position.x += warpShakeX;
        camera.position.y += warpShakeY;
        controls.target.copy(warpTarget);

        if (p >= 1) {
            warpActive = false;
            warpDrift = true; warpDriftTime = 0;
            warpDriftDir.copy(warpEnd).sub(warpStart).normalize();
            warpPhase = 0; warpShakeX = 0; warpShakeY = 0;
            if (warpBg) {
                warpBg.visible = false;
                warpBg.material.uniforms.uFlash.value = 0;
                warpBg.material.uniforms.uAlpha.value = 0;
            }
        }
    }
    // ═══════════════════════════════════════════════════════
    // ÇIKIŞ: Girişin TAM TERSİ — GÜM! (ani fren) → yavaşşş (çizgiler söner)
    // ═══════════════════════════════════════════════════════
    if (warpDrift) {
        warpDriftTime += dt;
        var driftDur = 1.8;
        var dp = Math.min(warpDriftTime / driftDur, 1);

        // Ters streak animasyonu: tam hız → GÜM ters → yavaşşş söner
        var revSpeed;
        if (dp < 0.05) {
            // ── GÜM! TERSİ — ani frenleme: 1.0 → 0.08 ──
            var t = dp / 0.05;
            revSpeed = 1.0 - Math.pow(t, 0.3) * 0.92;
        } else {
            // ── YAVAŞŞŞ SÖNME — girişin ayna simetrisi ──
            var t = (dp - 0.05) / 0.95;
            revSpeed = 0.08 * Math.pow(1.0 - t, 3);
        }

        // Streak'leri göster (ters animasyon)
        var exitWarpSpeed = 1 + revSpeed * 350;
        if (warpMesh) {
            warpMesh.visible = (revSpeed > 0.001);
            warpMesh.material.uniforms.uSpeed.value = exitWarpSpeed;
            warpMesh.material.uniforms.uTime.value += dt * exitWarpSpeed * 0.1;
            warpMesh.material.uniforms.uSwirl.value = revSpeed * 0.2;
        }

        // Kamera: hafif overshoot + sönümleme
        var overshoot = 2000;
        var drift = overshoot * Math.sin(dp * Math.PI * 0.5) * Math.pow(1 - dp, 2);
        camera.position.copy(warpEnd).addScaledVector(warpDriftDir, drift);
        controls.target.copy(warpTarget);

        // FOV: girişin tersi — 68 → yavaşça 65'e yerleşme
        if (dp < 0.05) {
            var t = dp / 0.05;
            camera.fov = 68 - Math.pow(t, 0.3) * 6;
        } else {
            var t = (dp - 0.05) / 0.95;
            camera.fov = 62 + t * 3;
        }
        camera.updateProjectionMatrix();

        if (dp >= 1) {
            warpDrift = false; controls.enabled = true;
            camera.position.copy(warpEnd);
            camera.fov = 65; camera.updateProjectionMatrix();
            if (warpMesh) {
                warpMesh.visible = false;
                warpMesh.material.uniforms.uSpeed.value = 0;
                warpMesh.material.uniforms.uTime.value = 0;
                warpMesh.material.uniforms.uSwirl.value = 0;
            }
        }
    }
    if (controls) controls.update();

    var elapsed = now * 0.001;
    if (!warpActive) {
        // Surah kürelerini döndür + shader time güncelle
        surahGroups.forEach((g, i) => {
            g.children.forEach(child => {
                if (child.isMesh && child.material.uniforms && child.material.uniforms.time) {
                    child.material.uniforms.time.value = elapsed + i * 0.5;
                }
                if (child.isMesh && child.renderOrder === 2) {
                    child.rotation.y = elapsed * 0.15 + i;
                }
            });
        });

        // Ayet shader time güncelle
        if (ayahMesh && ayahMesh.material.uniforms && ayahMesh.material.uniforms.time) {
            ayahMesh.material.uniforms.time.value = elapsed;
        }

        // Skybox kamerayı takip etsin (sonsuz uzak görünsün)
        if (skyMesh) skyMesh.position.copy(camera.position);

        // --- Cosmos Atmosfer Güncellemeleri ---
        if (perfMode !== 'low') {
            nebulaMeshes.forEach(function(m) {
                m.material.uniforms.uTime.value = elapsed;
                m.lookAt(camera.position);
            });
            cosmicDustLanes.forEach(function(m) {
                m.material.uniforms.uTime.value = elapsed;
                m.lookAt(camera.position);
            });
            if (spaceDust && spaceDust.material.uniforms) {
                spaceDust.material.uniforms.uTime.value = elapsed;
                spaceDust.position.copy(camera.position);
            }
        }

        // Neon beam ışınları: time uniform güncelle (enerji akış animasyonu)
        if (highlightLines) {
            highlightLines.forEach(function(m) {
                if (m.material && m.material.uniforms && m.material.uniforms.uTime) {
                    m.material.uniforms.uTime.value = elapsed;
                }
            });
        }

        var camP = camera.position;
        _labelFrame = (_labelFrame + 1) % 4;
        if (perfMode !== 'low' || _labelFrame === 0) {
            var _proj = new THREE.Vector3();
            var _shown = [];
            var _minSep = 55;
            labelSprites.forEach(s => {
                if (camP.distanceTo(s.position) > 25000) { s.visible = false; return; }
                _proj.copy(s.position).project(camera);
                if (_proj.z > 1) { s.visible = false; return; }
                var sx = (_proj.x * 0.5 + 0.5) * window.innerWidth;
                var sy = (-_proj.y * 0.5 + 0.5) * window.innerHeight;
                var tooClose = _shown.some(p => {
                    var dx = sx - p[0], dy = sy - p[1];
                    return dx * dx + dy * dy < _minSep * _minSep;
                });
                if (tooClose) { s.visible = false; }
                else { s.visible = true; _shown.push([sx, sy]); }
            });
        }
    }
    // FPS hesaplama (saniyede bir güncellenir)
    _fpsFrames++;
    _fpsTime += dt;
    if (_fpsTime >= 1) {
        sceneStats.fps = Math.round(_fpsFrames / _fpsTime);
        _fpsFrames = 0;
        _fpsTime = 0;
        var fpsEl = document.getElementById('stat-fps');
        if (fpsEl) fpsEl.textContent = sceneStats.fps;
        var perfEl = document.getElementById('stat-perf');
        if (perfEl) perfEl.textContent = perfMode === 'low' ? '🔋 Düşük' : '⚡ Yüksek';
    }
    if (composer) {
        // Warp mesh'lerini bloom'dan hariç tut
        var _wV = warpMesh && warpMesh.visible;
        var _bV = warpBg && warpBg.visible;
        if (warpMesh) warpMesh.visible = false;
        if (warpBg) warpBg.visible = false;
        composer.render();
        // Warp'ı bloom'suz ayrı render et
        if (_wV || _bV) {
            if (warpBg) warpBg.visible = !!_bV;
            if (warpMesh) warpMesh.visible = !!_wV;
            renderer.autoClear = false;
            renderer.clearDepth();
            // Sadece warp layer'ını render et
            camera.layers.disableAll(); camera.layers.enable(1);
            renderer.render(scene, camera);
            camera.layers.enableAll();
            renderer.autoClear = true;
        }
    }
};
