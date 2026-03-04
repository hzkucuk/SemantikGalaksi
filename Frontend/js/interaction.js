var onMouseMove = (event) => {
    if (event.target.closest('#tooltip')) return;
    var hTarget = event.target.closest('.ref-hover');
    if (hTarget) {
        var n = nodes.find(x => x.id === hTarget.dataset.id);
        if (n) {
            if (hTarget.closest('#hud-panel')) { showHudItemTooltip(n); }
            else { showTooltip(n, event.clientX, event.clientY); }
            return;
        }
    }
    var rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    var intS = raycaster.intersectObjects(surahGroups, true);
    if (intS.length > 0) {
        var o = intS[0].object; while(o && !o.userData?.nodeData) o = o.parent;
        if(o) { showTooltip(o.userData.nodeData, event.clientX, event.clientY); return; }
    }
    if (ayahMesh) {
        var intA = raycaster.intersectObject(ayahMesh);
        if (intA.length > 0) { var n = ayahNodes[intA[0].instanceId]; if(n) { showTooltip(n, event.clientX, event.clientY); return; } }
    }
    // Önce neon tube'lara bak (görünen kalın çizgiler)
    if (highlightLines && highlightLines.length > 0) {
        var tubes = highlightLines.filter(m => m.userData.pair);
        var intT = raycaster.intersectObjects(tubes);
        if (intT.length > 0) {
            var pair = intT[0].object.userData.pair;
            if (pair) { showLineTooltip(pair, event.clientX, event.clientY); return; }
        }
    }
    // Neon yoksa arka plan çizgilerine bak
    if ((!highlightLines || highlightLines.length === 0) && lineSegments && lineNodePairs.length > 0) {
        raycaster.params.Line.threshold = 800;
        var intL = raycaster.intersectObject(lineSegments);
        if (intL.length > 0) {
            var segIdx = Math.floor(intL[0].index / 2);
            var pair = lineNodePairs[segIdx];
            if (pair) { showLineTooltip(pair, event.clientX, event.clientY); return; }
        }
    }
    hideTooltip();
};

var onMouseClick = (event) => {
    if (warpActive || event.target.closest('.hud-panel') || event.target.closest('.search-results') || event.target.closest('#tooltip')) return;
    var rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    var intS = raycaster.intersectObjects(surahGroups, true);
    if (intS.length > 0) {
        var o = intS[0].object; while(o && !o.userData?.nodeData) o = o.parent;
        if(o && o.userData.nodeData) { warpTo(o.userData.nodeData); return; }
    }
    // Önce neon tube'lara bak
    if (highlightLines && highlightLines.length > 0) {
        var tubes = highlightLines.filter(m => m.userData.pair);
        var intT = raycaster.intersectObjects(tubes);
        if (intT.length > 0) {
            var pair = intT[0].object.userData.pair;
            if (pair) {
                var nd1 = nodes.find(nd => nd.id === pair.n1);
                var nd2 = nodes.find(nd => nd.id === pair.n2);
                if (nd1 && nd2) {
                    var d1 = camera.position.distanceToSquared(new THREE.Vector3(nd1.x, nd1.y, nd1.z));
                    var d2 = camera.position.distanceToSquared(new THREE.Vector3(nd2.x, nd2.y, nd2.z));
                    hideTooltip();
                    warpTo(d1 <= d2 ? nd2 : nd1);
                    return;
                }
            }
        }
    }
    // Neon yoksa arka plan çizgilerine bak
    if ((!highlightLines || highlightLines.length === 0) && lineSegments && lineNodePairs.length > 0) {
        raycaster.params.Line.threshold = 800;
        var intL = raycaster.intersectObject(lineSegments);
        if (intL.length > 0) {
            var segIdx = Math.floor(intL[0].index / 2);
            var pair = lineNodePairs[segIdx];
            if (pair) {
                var nd1 = nodes.find(nd => nd.id === pair.n1);
                var nd2 = nodes.find(nd => nd.id === pair.n2);
                if (nd1 && nd2) {
                    var d1 = camera.position.distanceToSquared(new THREE.Vector3(nd1.x, nd1.y, nd1.z));
                    var d2 = camera.position.distanceToSquared(new THREE.Vector3(nd2.x, nd2.y, nd2.z));
                    hideTooltip();
                    warpTo(d1 <= d2 ? nd2 : nd1);
                    return;
                }
            }
        }
    }
    var closestNode = null; var minDistance = 2500;
    nodes.forEach(n => {
        var nodePos = new THREE.Vector3(n.x, n.y, n.z);
        var distance = raycaster.ray.distanceToPoint(nodePos);
        if (distance < minDistance) { minDistance = distance; closestNode = n; }
    });
    if (closestNode) warpTo(closestNode);
};
