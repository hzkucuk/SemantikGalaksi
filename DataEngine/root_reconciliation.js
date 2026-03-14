/**
 * root_reconciliation.js
 * 
 * quran-morphology.txt dosyasini otorite kabul ederek:
 * 1) quran_data.json icerisindeki her ayetin roots[] dizisini morphology'den yeniden olusturur
 * 2) quran_roots.json sozlugune eksik kokleri ekler
 * 3) quran_roots.json'dan hicbir ayette kullanilmayan gereksiz giris kalmazsa isaretler
 * 
 * Kullanim: node DataEngine/root_reconciliation.js
 */

const fs = require('fs');
const path = require('path');

// --- Dosya yollari ---
const MORPH_FILE = path.join(__dirname, 'quran-morphology.txt');
const DATA_FILE = path.join(__dirname, '..', 'Frontend', 'quran_data.json');
const ROOTS_FILE = path.join(__dirname, '..', 'Frontend', 'quran_roots.json');

// --- 1) Morphology parse: verse -> Set<root> ---
console.log('=== ADIM 1: quran-morphology.txt parse ediliyor ===');
const morphByVerse = {};
const allMorphRoots = new Set();
const lines = fs.readFileSync(MORPH_FILE, 'utf8').split('\n');

for (const line of lines) {
    const parts = line.split('\t');
    if (!parts[0]) continue;
    const coords = parts[0].split(':');
    const verseId = coords[0] + ':' + coords[1];
    const rootMatch = line.match(/ROOT:([^|]+)/);
    if (rootMatch) {
        const root = rootMatch[1];
        if (!morphByVerse[verseId]) morphByVerse[verseId] = new Set();
        morphByVerse[verseId].add(root);
        allMorphRoots.add(root);
    }
}

console.log('  Morphology ayetleri:', Object.keys(morphByVerse).length);
console.log('  Benzersiz kokler:', allMorphRoots.size);

// --- 2) quran_data.json guncelle ---
console.log('\n=== ADIM 2: quran_data.json kokleri guncelleniyor ===');
const dataRaw = fs.readFileSync(DATA_FILE, 'utf8');
const data = JSON.parse(dataRaw);

let updatedVerses = 0;
let rootsAdded = 0;
let rootsRemoved = 0;
let spacedFixed = 0;
const changeLog = [];

for (const node of data.nodes) {
    if (!node.id) continue;
    
    const morphRoots = morphByVerse[node.id];
    if (!morphRoots) {
        // Morphology'de yok (besmele, huruf-u mukattaat) - mevcut kokleri koru
        continue;
    }
    
    const oldRoots = node.roots || [];
    const newRoots = [...morphRoots]; // Morphology'den gelen kokler
    
    // Degisiklik var mi kontrol et
    const oldCompact = new Set(oldRoots.map(r => r.replace(/ /g, '')));
    const newSet = new Set(newRoots);
    
    const added = newRoots.filter(r => !oldCompact.has(r));
    const removed = [...oldCompact].filter(r => !newSet.has(r));
    const spaced = oldRoots.filter(r => r.includes(' '));
    
    if (added.length > 0 || removed.length > 0 || spaced.length > 0) {
        node.roots = newRoots;
        updatedVerses++;
        rootsAdded += added.length;
        rootsRemoved += removed.length;
        spacedFixed += spaced.length;
        
        changeLog.push({
            verse: node.id,
            old: oldRoots.length,
            new: newRoots.length,
            added: added,
            removed: removed,
            spacedFixed: spaced.length
        });
    }
}

console.log('  Guncellenen ayetler:', updatedVerses);
console.log('  Eklenen kokler:', rootsAdded);
console.log('  Kaldirilan kokler:', rootsRemoved);
console.log('  Duzeltilen bosluklu kokler:', spacedFixed);

// Kaydet
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
console.log('  quran_data.json kaydedildi.');

// --- 3) quran_roots.json guncelle ---
console.log('\n=== ADIM 3: quran_roots.json sozlugu guncelleniyor ===');
const rootsDict = JSON.parse(fs.readFileSync(ROOTS_FILE, 'utf8'));

// 3a) Eksik kokleri ekle (morphology'de var, sozlukte yok)
const missingRoots = [...allMorphRoots].filter(r => !rootsDict[r]);
console.log('  Sozlukte eksik kok sayisi:', missingRoots.length);

for (const root of missingRoots) {
    // Temel sablonla ekle - sonra Gemini API ile zenginlestirilebilir
    rootsDict[root] = {
        meaning: "",
        meaning_ar: "",
        pronunciation: root.split('').join('-'),
        derived: []
    };
}

if (missingRoots.length > 0) {
    console.log('  Eklenen kokler:', missingRoots.join(', '));
}

// 3b) Kullanilmayan kokleri tespit et (sozlukte var, hicbir ayette yok)
const usedRoots = new Set();
for (const node of data.nodes) {
    if (node.roots) {
        for (const r of node.roots) {
            usedRoots.add(r);
        }
    }
}

const unusedInDict = Object.keys(rootsDict).filter(r => !usedRoots.has(r));
console.log('  Sozlukte olup hicbir ayette kullanilmayan:', unusedInDict.length);

// Kullanilmayanlari kaldir (temizlik)
for (const r of unusedInDict) {
    delete rootsDict[r];
}
console.log('  Kaldirilan gereksiz sozluk girisleri:', unusedInDict.length);

// Sozlugu sirala (Arapca alfabetik)
const sortedDict = {};
for (const key of Object.keys(rootsDict).sort()) {
    sortedDict[key] = rootsDict[key];
}

fs.writeFileSync(ROOTS_FILE, JSON.stringify(sortedDict, null, 2), 'utf8');
console.log('  quran_roots.json kaydedildi.');

// --- 4) Dogrulama ---
console.log('\n=== ADIM 4: Dogrulama ===');
const finalData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const finalRoots = JSON.parse(fs.readFileSync(ROOTS_FILE, 'utf8'));

const finalDataRoots = new Set();
for (const node of finalData.nodes) {
    if (node.roots) {
        for (const r of node.roots) {
            finalDataRoots.add(r);
        }
    }
}

const finalDictRoots = new Set(Object.keys(finalRoots));

const inDataNotDict = [...finalDataRoots].filter(r => !finalDictRoots.has(r));
const inDictNotData = [...finalDictRoots].filter(r => !finalDataRoots.has(r));
const inMorphNotData = [...allMorphRoots].filter(r => !finalDataRoots.has(r));
const inDataNotMorph = [...finalDataRoots].filter(r => !allMorphRoots.has(r));
const spacedRemaining = [...finalDataRoots].filter(r => r.includes(' '));

console.log('  quran_data benzersiz kokler:', finalDataRoots.size);
console.log('  quran_roots sozluk girisleri:', finalDictRoots.size);
console.log('  Morphology benzersiz kokler:', allMorphRoots.size);
console.log('  ---');
console.log('  Data\'da olup sozlukte olmayan:', inDataNotDict.length);
console.log('  Sozlukte olup data\'da olmayan:', inDictNotData.length);
console.log('  Morphology\'de olup data\'da olmayan:', inMorphNotData.length);
console.log('  Data\'da olup morphology\'de olmayan:', inDataNotMorph.length);
console.log('  Kalan bosluklu kokler:', spacedRemaining.length);

if (inDataNotDict.length === 0 && inDictNotData.length === 0 && 
    inMorphNotData.length === 0 && inDataNotMorph.length === 0 && 
    spacedRemaining.length === 0) {
    console.log('\n  *** BASARILI: Tam senkronizasyon saglandi! ***');
    console.log('  quran_data.json <-> quran_roots.json <-> quran-morphology.txt');
    console.log('  Toplam kok sayisi:', finalDataRoots.size);
} else {
    console.log('\n  !!! UYARI: Senkronizasyon tam degil !!!');
    if (inDataNotDict.length > 0) console.log('  Eksik sozluk:', inDataNotDict);
    if (inDictNotData.length > 0) console.log('  Fazla sozluk:', inDictNotData.slice(0, 10), '...');
    if (inMorphNotData.length > 0) console.log('  Eksik morph:', inMorphNotData);
    if (inDataNotMorph.length > 0) console.log('  Fazla data:', inDataNotMorph);
}

// Degisiklik loglari
console.log('\n=== DEGISIKLIK DETAYLARI ===');
for (const c of changeLog) {
    const parts = [];
    if (c.added.length > 0) parts.push('+' + c.added.join(','));
    if (c.removed.length > 0) parts.push('-' + c.removed.join(','));
    if (c.spacedFixed > 0) parts.push('spaced:' + c.spacedFixed);
    console.log('  ' + c.verse + ' [' + c.old + '->' + c.new + '] ' + parts.join(' | '));
}
