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
        }
        if (warpBg) {
            warpBg.visible = true;
            warpBg.material.uniforms.uAlpha.value = sp * 0.6;
            var exitFlash = 0;
            if (p > 0.8 && p < 0.95) {
                exitFlash = Math.sin(((p - 0.8) / 0.15) * Math.PI) * 0.4;
            }
            warpBg.material.uniforms.uFlash.value = exitFlash;
        }
        if (p >= 1) {
            introWarp = false;
            if (warpMesh) { warpMesh.visible = false; warpMesh.material.uniforms.uSpeed.value = 0; warpMesh.material.uniforms.uTime.value = 0; }
            if (warpBg) { warpBg.visible = false; warpBg.material.uniforms.uAlpha.value = 0; warpBg.material.uniforms.uFlash.value = 0; }
        }
    }
    if (warpActive) {
        warpProgress += dt * 0.8; var p = Math.min(warpProgress, 1);
        var ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

        // Star Wars Lightspeed Jump — yavaş giriş, warp çıkış efekti
        if (p < 1) {
            // Hız eğrisi: yavaş ivmelenme 0-25% (noktadan çizgiye), hyperspace 25-85%, warp çıkış 85-100%
            var sp;
            if (p < 0.25) {
                sp = Math.pow(p / 0.25, 3);
            } else if (p < 0.85) {
                sp = 1.0;
            } else {
                sp = Math.pow((1 - p) / 0.15, 2);
            }
            warpSpeed = 1 + sp * 160;
            if (warpMesh) {
                warpMesh.visible = true;
                warpMesh.material.uniforms.uSpeed.value = warpSpeed;
                warpMesh.material.uniforms.uTime.value += dt * warpSpeed * 0.1;
            }
            if (warpBg) {
                warpBg.visible = true;
                warpBg.material.uniforms.uAlpha.value = Math.min(p * 5, 0.98);
                // Warp çıkış flash: %83-95 aralığında beyaz flash
                var exitFlash = 0;
                if (p > 0.83 && p < 0.95) {
                    exitFlash = Math.sin(((p - 0.83) / 0.12) * Math.PI) * 0.5;
                }
                warpBg.material.uniforms.uFlash.value = exitFlash;
            }
        }

        // FOV
        if (p < 0.25) {
            camera.fov = 65 + (p / 0.25) * 60;
        } else if (p < 0.75) {
            camera.fov = 125;
        } else {
            camera.fov = 125 - ((p - 0.75) / 0.25) * 60;
        }
        camera.updateProjectionMatrix();

        // Kamera hareketi
        camera.position.lerpVectors(warpStart, warpEnd, ease);
        controls.target.copy(warpTarget);

        if (p >= 1) {
            warpActive = false;
            warpDrift = true; warpDriftTime = 0;
            warpDriftDir.copy(warpEnd).sub(warpStart).normalize();
            camera.fov = 65; camera.updateProjectionMatrix();
            if (warpMesh) {
                warpMesh.visible = false;
                warpMesh.material.uniforms.uSpeed.value = 0;
                warpMesh.material.uniforms.uTime.value = 0;
            }
            if (warpBg) {
                warpBg.visible = false;
                warpBg.material.uniforms.uFlash.value = 0;
            }
        }
    }
    // Warp sonrası sürüklenme — uzay gemisi momentum sönümleme
    if (warpDrift) {
        warpDriftTime += dt;
        var driftDur = 1.4;
        var dp = Math.min(warpDriftTime / driftDur, 1);
        var overshoot = 2500;
        var drift = overshoot * Math.sin(dp * Math.PI) * (1 - dp);
        camera.position.copy(warpEnd).addScaledVector(warpDriftDir, drift);
        controls.target.copy(warpTarget);
        camera.fov = 65 - 3 * Math.sin(dp * Math.PI) * (1 - dp);
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
