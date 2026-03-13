/** SemantikGalaksi — Kök Analiz Motoru
 *  Kur'an kelime köklerinin frekans, co-occurrence, ağ ve kümeleme analizleri.
 *  Bağımlılıklar: state.js (nodes, rootMap, rootDictionary), constants.js (surahNamesTR)
 */

// ════════════════════════════════════════════════════════════
// 1. FREKANS ANALİZİ — Zipf Yasası
// ════════════════════════════════════════════════════════════

var RootAnalyzer = (function () {

    /** Tüm kökleri frekanslarına göre sıralar, Zipf uyumu hesaplar */
    var calcFrequency = () => {
        var freq = {};
        nodes.forEach(n => {
            (n.roots || []).forEach(r => { freq[r] = (freq[r] || 0) + 1; });
        });
        var sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
        // Zipf: f(r) ≈ C / r^α  →  log(f) = log(C) - α·log(r)
        var logRanks = [], logFreqs = [];
        sorted.forEach(([_, f], i) => {
            logRanks.push(Math.log(i + 1));
            logFreqs.push(Math.log(f));
        });
        // Basit lineer regresyon (en küçük kareler)
        var n2 = logRanks.length;
        var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (var i = 0; i < n2; i++) {
            sumX += logRanks[i]; sumY += logFreqs[i];
            sumXY += logRanks[i] * logFreqs[i];
            sumX2 += logRanks[i] * logRanks[i];
        }
        var alpha = -(n2 * sumXY - sumX * sumY) / (n2 * sumX2 - sumX * sumX);
        var logC = (sumY + alpha * sumX) / n2;
        // R² hesapla
        var meanY = sumY / n2;
        var ssTot = 0, ssRes = 0;
        for (var i = 0; i < n2; i++) {
            var predicted = logC - alpha * logRanks[i];
            ssTot += (logFreqs[i] - meanY) ** 2;
            ssRes += (logFreqs[i] - predicted) ** 2;
        }
        var rSquared = 1 - ssRes / ssTot;
        return { sorted, alpha: alpha.toFixed(3), rSquared: rSquared.toFixed(4), logC };
    };

    // ════════════════════════════════════════════════════════════
    // 2. CO-OCCURRENCE MATRİSİ — Hangi kökler birlikte geçiyor
    // ════════════════════════════════════════════════════════════

    var calcCoOccurrence = (topN) => {
        topN = topN || 25;
        // Önce en sık kökleri bul
        var freq = {};
        nodes.forEach(n => { (n.roots || []).forEach(r => { freq[r] = (freq[r] || 0) + 1; }); });
        var topRoots = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, topN).map(e => e[0]);
        var topSet = new Set(topRoots);
        // Co-occurrence matrisi
        var matrix = {};
        topRoots.forEach(r1 => { matrix[r1] = {}; topRoots.forEach(r2 => { matrix[r1][r2] = 0; }); });
        nodes.forEach(n => {
            var rts = (n.roots || []).filter(r => topSet.has(r));
            for (var i = 0; i < rts.length; i++) {
                for (var j = i + 1; j < rts.length; j++) {
                    matrix[rts[i]][rts[j]]++;
                    matrix[rts[j]][rts[i]]++;
                }
                matrix[rts[i]][rts[i]]++; // diagonal = toplam geçiş
            }
        });
        return { roots: topRoots, matrix };
    };

    // ════════════════════════════════════════════════════════════
    // 3. SURE-KÖK YOĞUNLUK HARİTASI
    // ════════════════════════════════════════════════════════════

    var calcSurahDensity = (topN) => {
        topN = topN || 20;
        var freq = {};
        nodes.forEach(n => { (n.roots || []).forEach(r => { freq[r] = (freq[r] || 0) + 1; }); });
        var topRoots = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, topN).map(e => e[0]);
        var topSet = new Set(topRoots);
        // Sure bazlı sayım
        var surahIds = [...new Set(nodes.map(n => n.id.split(':')[0]))].sort((a, b) => +a - +b);
        var density = {};
        surahIds.forEach(sid => {
            density[sid] = {};
            topRoots.forEach(r => { density[sid][r] = 0; });
        });
        nodes.forEach(n => {
            var sid = n.id.split(':')[0];
            (n.roots || []).filter(r => topSet.has(r)).forEach(r => { density[sid][r]++; });
        });
        // Her sure için toplam ayet sayısı
        var surahTotals = {};
        surahIds.forEach(sid => { surahTotals[sid] = nodes.filter(n => n.id.split(':')[0] === sid).length; });
        return { roots: topRoots, surahIds, density, surahTotals };
    };

    // ════════════════════════════════════════════════════════════
    // 4. AĞ METRİKLERİ — Derece, kümeleme, merkezilik
    // ════════════════════════════════════════════════════════════

    var calcNetworkMetrics = () => {
        // Her ayet bir düğüm, kök paylaşımı = kenar
        var adjacency = {}; // ayetId → Set(komşuIds)
        nodes.forEach(n => { adjacency[n.id] = new Set(); });
        rootMap.forEach((idxArr, root) => {
            for (var i = 0; i < idxArr.length; i++) {
                for (var j = i + 1; j < idxArr.length; j++) {
                    var a = nodes[idxArr[i]].id;
                    var b = nodes[idxArr[j]].id;
                    adjacency[a].add(b);
                    adjacency[b].add(a);
                }
            }
        });
        // Derece dağılımı
        var degrees = {};
        Object.entries(adjacency).forEach(([id, neighbors]) => {
            degrees[id] = neighbors.size;
        });
        var degreeValues = Object.values(degrees);
        var maxDegree = Math.max(...degreeValues);
        var avgDegree = degreeValues.reduce((s, d) => s + d, 0) / degreeValues.length;
        // En merkezi düğümler (degree centrality)
        var topHubs = Object.entries(degrees).sort((a, b) => b[1] - a[1]).slice(0, 15);
        // Derece histogram
        var degreeHist = {};
        degreeValues.forEach(d => {
            var bucket = Math.floor(d / 10) * 10;
            degreeHist[bucket] = (degreeHist[bucket] || 0) + 1;
        });
        // Kök bazlı köprü metrikleri (hangi kök en çok ayet bağlıyor)
        var rootBridge = {};
        rootMap.forEach((idxArr, root) => {
            var uniquePairs = (idxArr.length * (idxArr.length - 1)) / 2;
            var surahSet = new Set(idxArr.map(i => nodes[i].id.split(':')[0]));
            rootBridge[root] = { ayahCount: idxArr.length, pairCount: uniquePairs, surahSpan: surahSet.size };
        });
        var topBridges = Object.entries(rootBridge)
            .sort((a, b) => b[1].surahSpan - a[1].surahSpan)
            .slice(0, 15);
        return { degrees, maxDegree, avgDegree: avgDegree.toFixed(1), topHubs, degreeHist, topBridges };
    };

    // ════════════════════════════════════════════════════════════
    // 5. KÖK AİLESİ KÜMELEME — Semantik gruplar
    // ════════════════════════════════════════════════════════════

    var calcRootClusters = () => {
        // Co-occurrence tabanlı basit kümeleme
        // Aynı ayetlerde en sık birlikte geçen kökleri grupla
        var coOcc = {};
        nodes.forEach(n => {
            var rts = n.roots || [];
            for (var i = 0; i < rts.length; i++) {
                if (!coOcc[rts[i]]) coOcc[rts[i]] = {};
                for (var j = 0; j < rts.length; j++) {
                    if (i !== j) coOcc[rts[i]][rts[j]] = (coOcc[rts[i]][rts[j]] || 0) + 1;
                }
            }
        });
        // Her kök için en güçlü 3 bağlantı → küme çekirdeği
        var clusters = [];
        var assigned = new Set();
        var freq = {};
        nodes.forEach(n => { (n.roots || []).forEach(r => { freq[r] = (freq[r] || 0) + 1; }); });
        var sortedRoots = Object.entries(freq).sort((a, b) => b[1] - a[1]);
        sortedRoots.forEach(([root, _]) => {
            if (assigned.has(root)) return;
            var partners = coOcc[root] || {};
            var topPartners = Object.entries(partners)
                .filter(([r, _]) => !assigned.has(r))
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([r, cnt]) => ({ root: r, strength: cnt }));
            if (topPartners.length < 1) return;
            var cluster = { core: root, members: topPartners, freq: freq[root] || 0 };
            assigned.add(root);
            topPartners.forEach(p => assigned.add(p.root));
            clusters.push(cluster);
        });
        return clusters.slice(0, 20);
    };

    // ════════════════════════════════════════════════════════════
    // 6. GENEL İSTATİSTİKLER
    // ════════════════════════════════════════════════════════════

    var calcOverview = () => {
        var totalRoots = rootMap.size;
        var totalAyahs = nodes.length;
        var rootsPerAyah = [];
        var connectionsPerAyah = [];
        nodes.forEach(n => {
            rootsPerAyah.push((n.roots || []).length);
            var conns = 0;
            (n.roots || []).forEach(r => {
                var ids = rootMap.get(r);
                if (ids) conns += ids.length - 1;
            });
            connectionsPerAyah.push(conns);
        });
        var avgRoots = rootsPerAyah.reduce((s, v) => s + v, 0) / totalAyahs;
        var maxRoots = Math.max(...rootsPerAyah);
        var avgConns = connectionsPerAyah.reduce((s, v) => s + v, 0) / totalAyahs;
        var maxConns = Math.max(...connectionsPerAyah);
        // Hapax legomena (sadece 1 ayette geçen kökler)
        var hapax = 0;
        rootMap.forEach(ids => { if (ids.length === 1) hapax++; });
        return {
            totalRoots, totalAyahs,
            avgRoots: avgRoots.toFixed(2), maxRoots,
            avgConns: avgConns.toFixed(1), maxConns,
            hapax,
            hapaxPercent: (hapax / totalRoots * 100).toFixed(1)
        };
    };

    // ════════════════════════════════════════════════════════════
    // CANVAS CHART RENDERERS
    // ════════════════════════════════════════════════════════════

    var renderBarChart = (canvas, data, options) => {
        var ctx = canvas.getContext('2d');
        var W = canvas.width, H = canvas.height;
        var pad = options.pad || { top: 30, right: 20, bottom: 50, left: 50 };
        var chartW = W - pad.left - pad.right;
        var chartH = H - pad.top - pad.bottom;
        ctx.clearRect(0, 0, W, H);
        // Background
        ctx.fillStyle = 'rgba(0,5,12,0.95)';
        ctx.fillRect(0, 0, W, H);
        if (!data.length) return;
        var maxVal = Math.max(...data.map(d => d.value));
        var barW = Math.max(2, (chartW / data.length) - 2);
        // Title
        if (options.title) {
            ctx.fillStyle = '#00f2ff';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(options.title, W / 2, 18);
        }
        // Bars
        data.forEach((d, i) => {
            var x = pad.left + i * (chartW / data.length) + 1;
            var h = (d.value / maxVal) * chartH;
            var y = pad.top + chartH - h;
            var gradient = ctx.createLinearGradient(x, y, x, y + h);
            gradient.addColorStop(0, options.barColor || '#00f2ff');
            gradient.addColorStop(1, options.barColorEnd || 'rgba(0,242,255,0.15)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barW, h);
            // Label (her 5. veya tüm)
            if (data.length <= 40 || i % Math.ceil(data.length / 30) === 0) {
                ctx.save();
                ctx.fillStyle = '#64748b';
                ctx.font = '9px Inter';
                ctx.textAlign = 'center';
                ctx.translate(x + barW / 2, pad.top + chartH + 8);
                ctx.rotate(-Math.PI / 4);
                ctx.fillText(d.label || '', 0, 0);
                ctx.restore();
            }
        });
        // Y axis
        ctx.fillStyle = '#475569';
        ctx.font = '10px Inter';
        ctx.textAlign = 'right';
        for (var i = 0; i <= 4; i++) {
            var val = Math.round(maxVal * i / 4);
            var y = pad.top + chartH - (chartH * i / 4);
            ctx.fillText(val, pad.left - 6, y + 4);
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
        }
    };

    var renderHeatmap = (canvas, roots, surahIds, density, options) => {
        var ctx = canvas.getContext('2d');
        var W = canvas.width, H = canvas.height;
        var pad = { top: 45, right: 10, bottom: 15, left: 50 };
        var cellW = Math.max(2, (W - pad.left - pad.right) / surahIds.length);
        var cellH = Math.max(8, (H - pad.top - pad.bottom) / roots.length);
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(0,5,12,0.95)';
        ctx.fillRect(0, 0, W, H);
        // Title
        ctx.fillStyle = '#a78bfa';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(options.title || t('analyzer.densityTitle'), W / 2, 16);
        // Max value for color scaling
        var maxVal = 0;
        roots.forEach(r => { surahIds.forEach(sid => { maxVal = Math.max(maxVal, density[sid][r] || 0); }); });
        if (maxVal === 0) maxVal = 1;
        // Cells
        surahIds.forEach((sid, col) => {
            roots.forEach((root, row) => {
                var val = density[sid][root] || 0;
                var intensity = val / maxVal;
                var x = pad.left + col * cellW;
                var y = pad.top + row * cellH;
                if (val > 0) {
                    var r2 = Math.floor(intensity * 120);
                    var g = Math.floor(intensity * 80 + (1 - intensity) * 20);
                    var b = Math.floor(intensity * 255);
                    ctx.fillStyle = `rgba(${r2},${g},${b},${0.3 + intensity * 0.7})`;
                } else {
                    ctx.fillStyle = 'rgba(255,255,255,0.01)';
                }
                ctx.fillRect(x, y, cellW - 0.5, cellH - 0.5);
            });
        });
        // Kök labels (Y axis)
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px Amiri, serif';
        ctx.textAlign = 'right';
        roots.forEach((root, row) => {
            var y = pad.top + row * cellH + cellH / 2 + 3;
            ctx.fillText(root, pad.left - 4, y);
        });
        // Sure labels (X axis — her 10. sure)
        ctx.font = '8px Inter';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#475569';
        surahIds.forEach((sid, col) => {
            if (+sid % 10 === 0 || +sid === 1 || +sid === 114) {
                ctx.fillText(sid, pad.left + col * cellW + cellW / 2, pad.top + roots.length * cellH + 12);
            }
        });
        // Legend bar
        var legY = 28;
        var legW = 100;
        var legX = W - legW - 15;
        var grad = ctx.createLinearGradient(legX, 0, legX + legW, 0);
        grad.addColorStop(0, 'rgba(0,20,60,0.3)');
        grad.addColorStop(0.5, 'rgba(60,40,180,0.7)');
        grad.addColorStop(1, 'rgba(120,80,255,1)');
        ctx.fillStyle = grad;
        ctx.fillRect(legX, legY, legW, 8);
        ctx.fillStyle = '#475569';
        ctx.font = '8px Inter';
        ctx.textAlign = 'left';
        ctx.fillText('0', legX, legY - 2);
        ctx.textAlign = 'right';
        ctx.fillText(maxVal, legX + legW, legY - 2);
    };

    var renderNetworkGraph = (canvas, topHubs, topBridges) => {
        var ctx = canvas.getContext('2d');
        var W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(0,5,12,0.95)';
        ctx.fillRect(0, 0, W, H);
        // Kök köprü metrikleri — yatay bar chart
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(t('analyzer.networkTitle'), W / 2, 18);
        var pad = { top: 32, left: 55, right: 20 };
        var barH = Math.min(22, (H - pad.top - 10) / topBridges.length);
        var maxSpan = Math.max(...topBridges.map(([_, m]) => m.surahSpan));
        topBridges.forEach(([root, m], i) => {
            var y = pad.top + i * barH;
            var w = (m.surahSpan / maxSpan) * (W - pad.left - pad.right);
            // Bar
            var grad = ctx.createLinearGradient(pad.left, 0, pad.left + w, 0);
            grad.addColorStop(0, 'rgba(52,211,153,0.8)');
            grad.addColorStop(1, 'rgba(52,211,153,0.15)');
            ctx.fillStyle = grad;
            ctx.fillRect(pad.left, y + 1, w, barH - 3);
            // Root label
            ctx.fillStyle = '#e2e8f0';
            ctx.font = '11px Amiri, serif';
            ctx.textAlign = 'right';
            ctx.fillText(root, pad.left - 4, y + barH / 2 + 4);
            // Value
            ctx.fillStyle = '#34d399';
            ctx.font = 'bold 10px Inter';
            ctx.textAlign = 'left';
            ctx.fillText(m.surahSpan + ' ' + t('analyzer.surahCount', {count: m.surahSpan}).split(' ').pop() + ' / ' + m.ayahCount + ' ' + t('analyzer.verseCountNum', {count: m.ayahCount}).split(' ').pop(), pad.left + w + 4, y + barH / 2 + 4);
        });
    };

    var renderClusterGraph = (canvas, clusters) => {
        var ctx = canvas.getContext('2d');
        var W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(0,5,12,0.95)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(t('analyzer.clusterTitle'), W / 2, 18);
        // Her kümeyi bir düğüm çemberi olarak çiz
        var maxClusters = Math.min(clusters.length, 12);
        var cols = Math.ceil(Math.sqrt(maxClusters));
        var rows = Math.ceil(maxClusters / cols);
        var cellW = W / cols;
        var cellH = (H - 30) / rows;
        clusters.slice(0, maxClusters).forEach((cl, idx) => {
            var col = idx % cols;
            var row = Math.floor(idx / cols);
            var cx = cellW * col + cellW / 2;
            var cy = 30 + cellH * row + cellH / 2;
            var R = Math.min(cellW, cellH) * 0.3;
            // Core circle
            ctx.beginPath();
            ctx.arc(cx, cy, R * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(245,158,11,0.2)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(245,158,11,0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Core label
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 14px Amiri, serif';
            ctx.textAlign = 'center';
            ctx.fillText(cl.core, cx, cy + 5);
            // Frequency
            ctx.fillStyle = '#64748b';
            ctx.font = '9px Inter';
            ctx.fillText('×' + cl.freq, cx, cy + 18);
            // Member circles
            cl.members.forEach((m, mi) => {
                var angle = (mi / cl.members.length) * Math.PI * 2 - Math.PI / 2;
                var mx = cx + Math.cos(angle) * R;
                var my = cy + Math.sin(angle) * R;
                // Connection line
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(mx, my);
                ctx.strokeStyle = 'rgba(245,158,11,0.15)';
                ctx.lineWidth = Math.max(1, m.strength / 20);
                ctx.stroke();
                // Member dot
                ctx.beginPath();
                ctx.arc(mx, my, 3, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(167,139,250,0.8)';
                ctx.fill();
                // Member label
                ctx.fillStyle = '#a78bfa';
                ctx.font = '11px Amiri, serif';
                ctx.textAlign = 'center';
                ctx.fillText(m.root, mx, my - 6);
            });
        });
    };

    // ════════════════════════════════════════════════════════════
    // PANEL RENDER
    // ════════════════════════════════════════════════════════════

    var renderPanel = () => {
        var container = document.getElementById('analyzer-content');
        if (!container) return;
        if (!nodes.length || !rootMap.size) {
            container.innerHTML = '<p style="color:#475569;text-align:center;padding:40px;font-size:12px;">Veri yüklenmedi. Önce bir veri seti yükleyin.</p>';
            return;
        }
        // Overview
        var ov = calcOverview();
        var freq = calcFrequency();

        container.innerHTML = `
            <!-- Genel Bakış -->
            <div class="analyzer-card">
                <h3 class="analyzer-section-title">📊 ${t('analyzer.overview')}</h3>
                <div class="analyzer-grid-4">
                    <div class="analyzer-metric"><div class="metric-value" style="color:#00f2ff;">${ov.totalRoots}</div><div class="metric-label">${t('analyzer.totalRoots')}</div></div>
                    <div class="analyzer-metric"><div class="metric-value" style="color:#a78bfa;">${ov.totalAyahs}</div><div class="metric-label">${t('analyzer.totalVerses')}</div></div>
                    <div class="analyzer-metric"><div class="metric-value" style="color:#34d399;">${ov.avgRoots}</div><div class="metric-label">${t('analyzer.avgRootsPerVerse')}</div></div>
                    <div class="analyzer-metric"><div class="metric-value" style="color:#f59e0b;">${ov.maxRoots}</div><div class="metric-label">${t('analyzer.maxRootsInVerse')}</div></div>
                    <div class="analyzer-metric"><div class="metric-value" style="color:#ef4444;">${ov.hapax}</div><div class="metric-label">${t('analyzer.hapax')}</div></div>
                    <div class="analyzer-metric"><div class="metric-value" style="color:#ef4444;">${ov.hapaxPercent}%</div><div class="metric-label">${t('analyzer.hapaxDesc')}</div></div>
                    <div class="analyzer-metric"><div class="metric-value" style="color:#06b6d4;">${ov.avgConns}</div><div class="metric-label">${t('analyzer.avgConns')}</div></div>
                    <div class="analyzer-metric"><div class="metric-value" style="color:#06b6d4;">${ov.maxConns}</div><div class="metric-label">${t('analyzer.maxConns')}</div></div>
                </div>
            </div>

            <!-- Zipf Analizi -->
            <div class="analyzer-card">
                <h3 class="analyzer-section-title">📈 ${t('analyzer.zipfTitle')}</h3>
                <div class="analyzer-grid-3">
                    <div class="analyzer-metric"><div class="metric-value" style="color:#00f2ff;">α = ${freq.alpha}</div><div class="metric-label">${t('analyzer.zipfAlpha')}</div></div>
                    <div class="analyzer-metric"><div class="metric-value" style="color:#34d399;">R² = ${freq.rSquared}</div><div class="metric-label">${t('analyzer.zipfR2')}</div></div>
                    <div class="analyzer-metric"><div class="metric-value" style="color:#a78bfa;">${freq.sorted.length}</div><div class="metric-label">${t('analyzer.totalRoots')}</div></div>
                </div>
                <p class="analyzer-note">${parseFloat(freq.rSquared) > 0.9 ? '✅ Kök frekansları güçlü Zipf yasası uyumu gösteriyor — doğal dil dağılımıyla örtüşüyor.' :
                    parseFloat(freq.rSquared) > 0.7 ? '⚠️ Orta düzey Zipf uyumu — kısmen doğal dil dağılımı, kısmen yapısal düzenlilik.' :
                    '🔬 Düşük Zipf uyumu — kök dağılımı doğal dilden sapma gösteriyor, yapısal bir düzen mevcut olabilir.'}</p>
                <canvas id="chart-zipf" width="760" height="280" style="width:100%;border-radius:8px;"></canvas>
                <div class="analyzer-top-list">
                    <span class="analyzer-top-title">${t('analyzer.top5').replace('5', '10')}</span>
                    <div class="analyzer-flex-wrap">
                        ${freq.sorted.slice(0, 10).map(([r, f], i) => {
                            var info = rootDictionary[r];
                            var meaning = info ? info.meaning : '';
                            return `<div class="analyzer-root-chip">
                                <span class="chip-rank">${i + 1}</span>
                                <span class="chip-root" dir="rtl">${r}</span>
                                <span class="chip-count">${f} ${t('hud.verse').toLowerCase()}</span>
                                ${meaning ? `<span class="chip-meaning">${meaning.split(',')[0]}</span>` : ''}
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>

            <!-- Co-occurrence -->
            <div class="analyzer-card">
                <h3 class="analyzer-section-title">🔗 ${t('analyzer.coOccTitle')}</h3>
                <p class="analyzer-note">En sık 20 kökün birlikte geçme sıklığı. Yoğun hücre = sık birlikte geçen kök çifti.</p>
                <canvas id="chart-cooccurrence" width="760" height="450" style="width:100%;border-radius:8px;"></canvas>
            </div>

            <!-- Sure-Kök Yoğunluk -->
            <div class="analyzer-card">
                <h3 class="analyzer-section-title">🗺️ ${t('analyzer.densityTitle')}</h3>
                <p class="analyzer-note">114 sure × en sık 20 kök. Koyu hücre = o surede o kök yoğun.</p>
                <canvas id="chart-density" width="760" height="400" style="width:100%;border-radius:8px;"></canvas>
            </div>

            <!-- Ağ Metrikleri -->
            <div class="analyzer-card">
                <h3 class="analyzer-section-title">🕸️ ${t('analyzer.networkTitle')}</h3>
                <div id="network-metrics-summary"></div>
                <canvas id="chart-network" width="760" height="370" style="width:100%;border-radius:8px;"></canvas>
            </div>

            <!-- Kök Kümeleri -->
            <div class="analyzer-card">
                <h3 class="analyzer-section-title">🧬 ${t('analyzer.clusterTitle')}</h3>
                <p class="analyzer-note">Aynı ayetlerde birlikte geçen kökler gruplandı. Merkez = çekirdek kök, çevre = en sık eşlik eden kökler.</p>
                <canvas id="chart-clusters" width="760" height="500" style="width:100%;border-radius:8px;"></canvas>
            </div>

            <!-- Export -->
            <div class="analyzer-card" style="text-align:center;">
                <button onclick="RootAnalyzer.exportJSON()" class="analyzer-export-btn">${t('analyzer.exportJSON')}</button>
                <button onclick="RootAnalyzer.exportCSV()" class="analyzer-export-btn" style="margin-left:8px;">${t('analyzer.exportCSV')}</button>
            </div>
        `;

        // Render charts
        setTimeout(() => {
            // Zipf bar chart
            var zipfCanvas = document.getElementById('chart-zipf');
            if (zipfCanvas) {
                var barData = freq.sorted.slice(0, 80).map(([r, f]) => ({ label: r, value: f }));
                renderBarChart(zipfCanvas, barData, { title: t('analyzer.zipfChartTitle'), barColor: '#00f2ff', barColorEnd: 'rgba(0,242,255,0.1)', pad: { top: 30, right: 20, bottom: 60, left: 50 } });
            }
            // Co-occurrence heatmap
            var coOccCanvas = document.getElementById('chart-cooccurrence');
            if (coOccCanvas) {
                var coOcc = calcCoOccurrence(20);
                renderHeatmap(coOccCanvas, coOcc.roots, coOcc.roots, 
                    coOcc.roots.reduce((acc, r) => { acc[r] = coOcc.matrix[r]; return acc; }, {}),
                    { title: t('analyzer.coOccChartTitle') });
            }
            // Density heatmap
            var densCanvas = document.getElementById('chart-density');
            if (densCanvas) {
                var dens = calcSurahDensity(20);
                renderHeatmap(densCanvas, dens.roots, dens.surahIds, dens.density,
                    { title: t('analyzer.densityChartTitle') });
            }
            // Network
            var netCanvas = document.getElementById('chart-network');
            if (netCanvas) {
                var net = calcNetworkMetrics();
                // Summary
                var sumDiv = document.getElementById('network-metrics-summary');
                if (sumDiv) {
                    sumDiv.innerHTML = `
                        <div class="analyzer-grid-3">
                            <div class="analyzer-metric"><div class="metric-value" style="color:#34d399;">${net.avgDegree}</div><div class="metric-label">${t('analyzer.avgDegree')}</div></div>
                            <div class="analyzer-metric"><div class="metric-value" style="color:#ef4444;">${net.maxDegree}</div><div class="metric-label">${t('analyzer.maxDegree')}</div></div>
                            <div class="analyzer-metric"><div class="metric-value" style="color:#f59e0b;">${net.topHubs.length}</div><div class="metric-label">${t('analyzer.hubCount')}</div></div>
                        </div>
                        <div class="analyzer-top-list" style="margin-top:8px;">
                            <span class="analyzer-top-title">${t('analyzer.centralVerses')}</span>
                            <div class="analyzer-flex-wrap">
                                ${net.topHubs.slice(0, 10).map(([id, deg]) => `<div class="analyzer-hub-chip" onclick="warpToId('${id}')"><span>${getSurahTR(id)} ${id.split(':')[1]}</span><span style="color:#34d399;font-weight:700;">${deg}</span></div>`).join('')}
                            </div>
                        </div>`;
                }
                renderNetworkGraph(netCanvas, net.topHubs, net.topBridges);
            }
            // Clusters
            var clusterCanvas = document.getElementById('chart-clusters');
            if (clusterCanvas) {
                var clusters = calcRootClusters();
                renderClusterGraph(clusterCanvas, clusters);
            }
        }, 50);
    };

    // ════════════════════════════════════════════════════════════
    // HUD SEKMESİ İÇİN MİNİ ANALİZ
    // ════════════════════════════════════════════════════════════

    // ── Tüm Kitap Özeti (cache — her HUD açılışında yeniden hesaplamayı önler)
    var _bookCache = null;
    var _bookCacheKey = 0;

    var getBookOverview = () => {
        if (_bookCache && _bookCacheKey === nodes.length) return _bookCache;
        var ov = calcOverview();
        var freq = calcFrequency();
        var net = calcNetworkMetrics();
        _bookCache = { ov, freq, net };
        _bookCacheKey = nodes.length;
        return _bookCache;
    };

    var renderHudAnalysis = (node) => {
        if (!node || !node.roots) return '';

        // ── 1) Tüm Kitap Özeti (Big Picture)
        var bk = getBookOverview();
        var ov = bk.ov;
        var freq = bk.freq;
        var net = bk.net;

        var html = `
            <div class="book-overview-card">
                <div class="book-overview-header">
                    <span class="book-overview-icon">📖</span>
                    <span class="book-overview-title">${t('analyzer.bookTitle')}</span>
                </div>
                <div class="book-overview-grid">
                    <div class="book-ov-metric"><span class="book-ov-val" style="color:#00f2ff;">${ov.totalRoots}</span><span class="book-ov-lbl">${t('analyzer.root')}</span></div>
                    <div class="book-ov-metric"><span class="book-ov-val" style="color:#a78bfa;">${ov.totalAyahs}</span><span class="book-ov-lbl">${t('analyzer.verse')}</span></div>
                    <div class="book-ov-metric"><span class="book-ov-val" style="color:#34d399;">${ov.avgRoots}</span><span class="book-ov-lbl">${t('analyzer.avgPerVerse')}</span></div>
                    <div class="book-ov-metric"><span class="book-ov-val" style="color:#ef4444;">${ov.hapax}</span><span class="book-ov-lbl">${t('analyzer.unique')}</span></div>
                </div>
                <div class="book-overview-row">
                    <span class="book-ov-tag">Zipf α=${freq.alpha}</span>
                    <span class="book-ov-tag">R²=${freq.rSquared}</span>
                    <span class="book-ov-tag">Tekil %${ov.hapaxPercent}</span>
                    <span class="book-ov-tag">Maks ${ov.maxConns} bağ</span>
                </div>
                <div class="book-overview-section">
                    <span class="book-ov-section-title">${t('analyzer.top5')}</span>
                    <div class="book-ov-root-list">
                        ${freq.sorted.slice(0, 5).map(([r, f], i) => {
                            var info = rootDictionary[r];
                            var meaning = info ? info.meaning.split(',')[0] : '';
                            return `<div class="book-ov-root-item">
                                <span class="book-ov-rank">${i + 1}</span>
                                <span class="book-ov-root" dir="rtl">${r}</span>
                                <span class="book-ov-freq">${f}</span>
                                ${meaning ? `<span class="book-ov-meaning">${meaning}</span>` : ''}
                            </div>`;
                        }).join('')}
                    </div>
                </div>
                <div class="book-overview-section">
                    <span class="book-ov-section-title">${t('analyzer.top3Bridges')}</span>
                    <div class="book-ov-root-list">
                        ${net.topBridges.slice(0, 3).map(([r, m]) => {
                            var info = rootDictionary[r];
                            var meaning = info ? info.meaning.split(',')[0] : '';
                            return `<div class="book-ov-root-item">
                                <span class="book-ov-root" dir="rtl" style="color:#34d399;">${r}</span>
                                <span class="book-ov-freq">${t('analyzer.surahCount', {count: m.surahSpan})}</span>
                                <span class="book-ov-freq">${t('analyzer.verseCountNum', {count: m.ayahCount})}</span>
                                ${meaning ? `<span class="book-ov-meaning">${meaning}</span>` : ''}
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>

            <div class="book-overview-divider">
                <span>${t('analyzer.thisVerse')}</span>
            </div>`;

        // ── 2) Bu Ayetin Analizi (mevcut per-verse kısım)
        var totalRoots = node.roots.length;
        var totalConns = 0;
        var crossSurah = new Set();
        var rootDetails = [];
        node.roots.forEach(r => {
            var ids = rootMap.get(r) || [];
            totalConns += ids.length - 1;
            ids.forEach(i => { crossSurah.add(nodes[i].id.split(':')[0]); });
            var info = rootDictionary[r];
            var freq2 = ids.length;
            var surahSet = new Set(ids.map(i => nodes[i].id.split(':')[0]));
            rootDetails.push({ root: r, freq: freq2, surahSpan: surahSet.size, meaning: info ? info.meaning : '' });
        });
        crossSurah.delete(node.id.split(':')[0]);
        var allFreq = {};
        rootMap.forEach((ids, r) => { allFreq[r] = ids.length; });
        var sortedAll = Object.entries(allFreq).sort((a, b) => b[1] - a[1]);
        var rankMap = {};
        sortedAll.forEach(([r, _], i) => { rankMap[r] = i + 1; });

        html += `
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
                <div class="analyzer-metric" style="flex:1;min-width:60px;"><div class="metric-value" style="color:#00f2ff;font-size:18px;">${totalRoots}</div><div class="metric-label">${t('analyzer.rootCount')}</div></div>
                <div class="analyzer-metric" style="flex:1;min-width:60px;"><div class="metric-value" style="color:#a78bfa;font-size:18px;">${totalConns}</div><div class="metric-label">${t('analyzer.connection')}</div></div>
                <div class="analyzer-metric" style="flex:1;min-width:60px;"><div class="metric-value" style="color:#34d399;font-size:18px;">${crossSurah.size}</div><div class="metric-label">${t('analyzer.crossSurah')}</div></div>
            </div>`;
        rootDetails.sort((a, b) => b.freq - a.freq);
        rootDetails.forEach(rd => {
            var rank = rankMap[rd.root] || '?';
            var percentile = ((1 - rank / sortedAll.length) * 100).toFixed(0);
            var c = getRootCSSColor(rd.root);
            html += `
            <div style="padding:8px 10px;margin-bottom:6px;background:rgba(255,255,255,0.02);border:1px solid ${c.replace('hsl', 'hsla').replace(')', ',0.15)')};border-radius:10px;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                    <span dir="rtl" style="color:${c};font-size:16px;font-weight:bold;">${rd.root}</span>
                    <span style="font-size:10px;color:#64748b;">${t('common.rank')} #${rank} / ${sortedAll.length}</span>
                    <span style="font-size:9px;color:#34d399;margin-left:auto;">${t('common.top')} %${percentile}</span>
                </div>
                <div style="display:flex;gap:12px;font-size:11px;">
                    <span style="color:#94a3b8;">${t('analyzer.inVerses', {count: rd.freq})}</span>
                    <span style="color:#94a3b8;">${t('analyzer.inSurahs', {count: rd.surahSpan})}</span>
                    ${rd.meaning ? `<span style="color:#64748b;font-style:italic;">${rd.meaning.split(',').slice(0, 2).join(',')}</span>` : ''}
                </div>
            </div>`;
        });
        return html;
    };

    // ════════════════════════════════════════════════════════════
    // EXPORT
    // ════════════════════════════════════════════════════════════

    var exportJSON = () => {
        var data = {
            overview: calcOverview(),
            frequency: calcFrequency().sorted.map(([r, f]) => ({ root: r, count: f })),
            zipf: { alpha: calcFrequency().alpha, rSquared: calcFrequency().rSquared },
            coOccurrence: calcCoOccurrence(30),
            clusters: calcRootClusters(),
            networkTopHubs: calcNetworkMetrics().topHubs,
            networkTopBridges: calcNetworkMetrics().topBridges
        };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'kuran_kok_analiz_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
    };

    var exportCSV = () => {
        var freq = calcFrequency();
        var lines = ['Rank,Kök,Frekans,Sure_Yayılımı,Anlam'];
        freq.sorted.forEach(([r, f], i) => {
            var ids = rootMap.get(r) || [];
            var surahSpan = new Set(ids.map(idx => nodes[idx].id.split(':')[0])).size;
            var info = rootDictionary[r];
            var meaning = info ? '"' + (info.meaning || '').replace(/"/g, '""') + '"' : '';
            lines.push(`${i + 1},${r},${f},${surahSpan},${meaning}`);
        });
        var blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'kuran_kok_frekans_' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
    };

    // ════════════════════════════════════════════════════════════
    // PANEL TOGGLE
    // ════════════════════════════════════════════════════════════

    var panelVisible = false;

    var togglePanel = () => {
        var panel = document.getElementById('analyzer-panel');
        if (!panel) return;
        panelVisible = !panelVisible;
        if (panelVisible) {
            panel.classList.remove('hidden');
            void panel.offsetWidth;
            panel.classList.add('analyzer-open');
            renderPanel();
        } else {
            panel.classList.remove('analyzer-open');
            setTimeout(() => { panel.classList.add('hidden'); }, 400);
        }
    };

    var closePanel = () => {
        var panel = document.getElementById('analyzer-panel');
        if (!panel) return;
        panelVisible = false;
        panel.classList.remove('analyzer-open');
        setTimeout(() => { panel.classList.add('hidden'); }, 400);
    };

    return {
        renderPanel, renderHudAnalysis, togglePanel, closePanel,
        exportJSON, exportCSV,
        calcFrequency, calcCoOccurrence, calcSurahDensity,
        calcNetworkMetrics, calcRootClusters, calcOverview
    };
})();

window.RootAnalyzer = RootAnalyzer;
