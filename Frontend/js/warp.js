var warpTo = (node) => {
    if(!node) return;
    hideTooltip();
    warpActive = true; warpProgress = 0; warpDrift = false; controls.enabled = false;
    warpStart.copy(camera.position); warpTarget.set(node.x, node.y, node.z);
    warpEnd.set(node.x + 4000, node.y + 8000, node.z + 12000);
    showHUD(node);
};
window.warpToId = (id) => { var t = nodes.find(n => n.id === id); if(t) warpTo(t); };

var _lastFrameTime = 0;
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
            warpMesh.material.uniforms.uSwirl.value = sp * 0.3;
        }
        if (warpBg) {
            warpBg.visible = true;
            warpBg.material.uniforms.uAlpha.value = sp * 0.6;
            warpBg.material.uniforms.uBlueShift.value = sp * 0.7;
            warpBg.material.uniforms.uTunnel.value = sp * 0.5;
            warpBg.material.uniforms.uEntryFlash.value = p < 0.15 ? (1.0 - p / 0.15) * 0.8 : 0;
            var exitFlash = 0;
            if (p > 0.8 && p < 0.95) {
                exitFlash = Math.sin(((p - 0.8) / 0.15) * Math.PI) * 0.6;
            }
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
                warpBg.material.uniforms.uBlueShift.value = 0;
                warpBg.material.uniforms.uTunnel.value = 0;
                warpBg.material.uniforms.uEntryFlash.value = 0;
            }
        }
    }
    if (warpActive) {
        warpProgress += dt * 0.36; var p = Math.min(warpProgress, 1);
        var ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

        // ═══════════════════════════════════════════════════════
        // STAR WARS MILLENNIUM FALCON — 5 SİNEMATİK FAZ
        // ═══════════════════════════════════════════════════════
        // Faz 1: GERİLİM     (0-10%)  — Yıldızlar yavaşça uzar, hafif zoom-in
        // Faz 2: FIRLATMA    (10-18%) — ANİ ivme, beyaz-mavi patlama, ekran sarsılır
        // Faz 3: HYPERSPACE  (18-78%) — Tam hız tüneli, mavi shift, spiral
        // Faz 4: YAVAŞLAMA   (78-90%) — Hız düşer, çizgiler kısalır
        // Faz 5: ÇIKIŞ       (90-100%)— Beyaz flash, keskin FOV snap, normal uzay

        if (p < 1) {
            var sp, swirl, blueShift, tunnel, entryFlash, exitFlash, bgAlpha;

            if (p < 0.10) {
                // ── FAZ 1: GERİLİM ──
                warpPhase = 1;
                var t = p / 0.10;
                sp = Math.pow(t, 4) * 0.15;
                swirl = 0;
                blueShift = t * 0.2;
                tunnel = 0;
                entryFlash = 0;
                exitFlash = 0;
                bgAlpha = t * 0.1;

            } else if (p < 0.18) {
                // ── FAZ 2: FIRLATMA ──
                warpPhase = 2;
                var t = (p - 0.10) / 0.08;
                sp = 0.15 + Math.pow(t, 2) * 0.85;
                swirl = t * 0.3;
                blueShift = 0.2 + t * 0.8;
                tunnel = t * 0.6;
                // Giriş flash — t=0'da patlama, hızla söner
                entryFlash = Math.exp(-t * 3.5) * 1.2;
                exitFlash = 0;
                bgAlpha = 0.1 + t * 0.7;

                // Kamera sarsıntısı — fırlatma anında
                warpShakeX = (Math.sin(t * 47.0) * 0.5 + Math.sin(t * 113.0) * 0.3) * (1.0 - t) * 120;
                warpShakeY = (Math.cos(t * 59.0) * 0.4 + Math.cos(t * 97.0) * 0.3) * (1.0 - t) * 80;

            } else if (p < 0.78) {
                // ── FAZ 3: HYPERSPACE ──
                warpPhase = 3;
                var t = (p - 0.18) / 0.60;
                sp = 1.0;
                swirl = 0.3 + Math.sin(t * Math.PI) * 0.4;
                blueShift = 1.0;
                tunnel = 0.6 + t * 0.4;
                entryFlash = 0;
                exitFlash = 0;
                bgAlpha = 0.8 + t * 0.18;

                // Hafif salınım — hyperspace titreşimi
                warpShakeX = Math.sin(t * 31.0) * 8;
                warpShakeY = Math.cos(t * 23.0) * 5;

            } else if (p < 0.90) {
                // ── FAZ 4: YAVAŞLAMA ──
                warpPhase = 4;
                var t = (p - 0.78) / 0.12;
                sp = 1.0 - Math.pow(t, 2) * 0.7;
                swirl = 0.7 * (1.0 - t);
                blueShift = 1.0 - t * 0.6;
                tunnel = 1.0 - t * 0.5;
                entryFlash = 0;
                exitFlash = 0;
                bgAlpha = 0.98 - t * 0.2;

                warpShakeX = Math.sin(t * 19.0) * 4 * (1.0 - t);
                warpShakeY = Math.cos(t * 17.0) * 3 * (1.0 - t);

            } else {
                // ── FAZ 5: ÇIKIŞ ──
                warpPhase = 5;
                var t = (p - 0.90) / 0.10;
                sp = 0.3 * Math.pow(1.0 - t, 3);
                swirl = 0;
                blueShift = 0.4 * (1.0 - t);
                tunnel = 0.5 * (1.0 - t);
                entryFlash = 0;
                // Çıkış flash — beyaz patlama
                exitFlash = Math.sin(t * Math.PI) * 1.5;
                bgAlpha = Math.max(0.78 - t * 0.78, exitFlash * 0.6);

                warpShakeX = 0;
                warpShakeY = 0;
            }

            warpSpeed = 1 + sp * 220;

            if (warpMesh) {
                warpMesh.visible = true;
                warpMesh.material.uniforms.uSpeed.value = warpSpeed;
                warpMesh.material.uniforms.uTime.value += dt * warpSpeed * 0.1;
                warpMesh.material.uniforms.uSwirl.value = swirl;
            }
            if (warpBg) {
                warpBg.visible = true;
                warpBg.material.uniforms.uAlpha.value = bgAlpha;
                warpBg.material.uniforms.uFlash.value = exitFlash;
                warpBg.material.uniforms.uBlueShift.value = blueShift;
                warpBg.material.uniforms.uTunnel.value = tunnel;
                warpBg.material.uniforms.uEntryFlash.value = entryFlash;
            }
        }

        // FOV — Sinematik 5 fazlı eğri
        if (p < 0.10) {
            // Gerilim: hafif daralma (zoom-in hissi)
            camera.fov = 65 - (p / 0.10) * 7;
        } else if (p < 0.18) {
            // Fırlatma: dramatik genişleme
            var t = (p - 0.10) / 0.08;
            camera.fov = 58 + Math.pow(t, 0.6) * 87;
        } else if (p < 0.78) {
            // Hyperspace: geniş tünel, hafif nefes
            var t = (p - 0.18) / 0.60;
            camera.fov = 145 - Math.sin(t * Math.PI) * 12;
        } else if (p < 0.90) {
            // Yavaşlama: FOV normalleşmeye başlar
            var t = (p - 0.78) / 0.12;
            camera.fov = 133 - t * 43;
        } else {
            // Çıkış: hızlı snap back
            var t = (p - 0.90) / 0.10;
            camera.fov = 90 - Math.pow(t, 0.5) * 25;
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
            camera.fov = 65; camera.updateProjectionMatrix();
            if (warpMesh) {
                warpMesh.visible = false;
                warpMesh.material.uniforms.uSpeed.value = 0;
                warpMesh.material.uniforms.uTime.value = 0;
                warpMesh.material.uniforms.uSwirl.value = 0;
            }
            if (warpBg) {
                warpBg.visible = false;
                warpBg.material.uniforms.uFlash.value = 0;
                warpBg.material.uniforms.uAlpha.value = 0;
                warpBg.material.uniforms.uBlueShift.value = 0;
                warpBg.material.uniforms.uTunnel.value = 0;
                warpBg.material.uniforms.uEntryFlash.value = 0;
            }
        }
    }
    // Warp sonrası sürüklenme — Millennium Falcon çıkış momentum sönümleme
    if (warpDrift) {
        warpDriftTime += dt;
        var driftDur = 2.0;
        var dp = Math.min(warpDriftTime / driftDur, 1);
        var overshoot = 3500;

        // Çift sıçrama: ana momentum + sekme
        var mainDrift = overshoot * Math.sin(dp * Math.PI) * Math.pow(1 - dp, 1.5);
        var bounce = 800 * Math.sin(dp * Math.PI * 3) * Math.pow(1 - dp, 3);
        var drift = mainDrift + bounce;

        camera.position.copy(warpEnd).addScaledVector(warpDriftDir, drift);

        // Çıkış sarsıntısı — hızla sönen titreşim
        var shakeDamp = Math.pow(1 - dp, 4);
        camera.position.x += Math.sin(dp * 67) * 40 * shakeDamp;
        camera.position.y += Math.cos(dp * 53) * 25 * shakeDamp;

        controls.target.copy(warpTarget);

        // FOV salınımı — çıkışta "nefes" efekti
        var fovBounce = Math.sin(dp * Math.PI * 2.5) * 8 * Math.pow(1 - dp, 2);
        camera.fov = 65 + fovBounce;
        camera.updateProjectionMatrix();

        if (dp >= 1) {
            warpDrift = false; controls.enabled = true;
            camera.position.copy(warpEnd);
            camera.fov = 65; camera.updateProjectionMatrix();
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

        // Yıldız alanı: sensör zamanı güncelle (dönüş yok — uzayda sabit referans)
        if (starField && starField.material.uniforms) {
            starField.material.uniforms.uTime.value = elapsed;
        }

        // Skybox kamerayı takip etsin (sonsuz uzak görünsün)
        if (skyMesh) skyMesh.position.copy(camera.position);

        // --- Cosmos Atmosfer Güncellemeleri ---
        // Nebula bulutsuları: time uniform güncelle + kameraya dön (billboard)
        nebulaMeshes.forEach(function(m) {
            m.material.uniforms.uTime.value = elapsed;
            m.lookAt(camera.position);
        });

        // Kozmik toz şeritleri: time uniform güncelle + kameraya dön
        cosmicDustLanes.forEach(function(m) {
            m.material.uniforms.uTime.value = elapsed;
            m.lookAt(camera.position);
        });

        // Uzay tozu: kamerayı takip et (derinlik hissi) + time güncelle
        if (spaceDust && spaceDust.material.uniforms) {
            spaceDust.material.uniforms.uTime.value = elapsed;
            spaceDust.position.copy(camera.position);
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
