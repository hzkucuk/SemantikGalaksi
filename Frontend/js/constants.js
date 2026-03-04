/** SemantikGalaksi — Sabitler ve Yardımcı Fonksiyonlar */

var arabicToLatinMap = {
    'ا': 'E', 'أ': 'E', 'إ': 'E', 'آ': 'E', 'ب': 'B', 'ت': 'T', 'ث': 'TH', 'ج': 'C', 'ح': 'H', 'خ': 'KH',
    'د': 'D', 'ذ': 'DH', 'ر': 'R', 'ز': 'Z', 'س': 'S', 'ش': 'Ş', 'ص': 'S',
    'ض': 'D', 'ط': 'T', 'ظ': 'Z', 'ع': 'A', 'غ': 'GH', 'ف': 'F', 'ق': 'K',
    'ك': 'K', 'ل': 'L', 'م': 'M', 'ن': 'N', 'ه': 'H', 'و': 'V', 'ي': 'Y',
    'ء': 'E', 'ؤ': 'W', 'ئ': 'Y', 'ة': 'T', ' ' : '-'
};

var surahNamesTR = {
    "1":"Fâtiha","2":"Bakara","3":"Âl-i İmrân","4":"Nisâ","5":"Mâide","6":"En'âm","7":"A'râf","8":"Enfâl","9":"Tevbe","10":"Yûnus",
    "11":"Hûd","12":"Yûsuf","13":"Ra'd","14":"İbrâhîm","15":"Hicr","16":"Nahl","17":"İsrâ","18":"Kehf","19":"Meryem","20":"Tâ-Hâ",
    "21":"Enbiyâ","22":"Hac","23":"Mü'minûn","24":"Nûr","25":"Furkân","26":"Şuarâ","27":"Neml","28":"Kasas","29":"Ankebût","30":"Rûm",
    "31":"Lokmân","32":"Secde","33":"Ahzâb","34":"Sebe'","35":"Fâtır","36":"Yâ-Sîn","37":"Sâffât","38":"Sâd","39":"Zümer","40":"Mü'min",
    "41":"Fussilet","42":"Şûrâ","43":"Zuhruf","44":"Duhân","45":"Câsiye","46":"Ahkâf","47":"Muhammed","48":"Fetih","49":"Hucurât","50":"Kâf",
    "51":"Zâriyât","52":"Tûr","53":"Necm","54":"Kamer","55":"Rahmân","56":"Vâkıa","57":"Hadîd","58":"Mücâdele","59":"Haşr","60":"Mümtehine",
    "61":"Saff","62":"Cuma","63":"Münâfikûn","64":"Tegâbun","65":"Talâk","66":"Tahrîm","67":"Mülk","68":"Kalem","69":"Hâkka","70":"Meâric",
    "71":"Nûh","72":"Cin","73":"Müzzemmil","74":"Müddessir","75":"Kıyâmet","76":"İnsân","77":"Mürselât","78":"Nebe","79":"Nâziât","80":"Abese",
    "81":"Tekvîr","82":"İnfitâr","83":"Mutaffifîn","84":"İnşikâk","85":"Burûc","86":"Târık","87":"A'lâ","88":"Gâşiye","89":"Fecr","90":"Beled",
    "91":"Şems","92":"Leyl","93":"Duhâ","94":"İnşirâh","95":"Tîn","96":"Alak","97":"Kadir","98":"Beyyine","99":"Zilzâl","100":"Âdiyât",
    "101":"Kâria","102":"Tekâsür","103":"Asr","104":"Hümeze","105":"Fîl","106":"Kureyş","107":"Mâûn","108":"Kevser","109":"Kâfirûn","110":"Nasr",
    "111":"Mesed","112":"İhlâs","113":"Felak","114":"Nâs"
};

var getSurahTR = (id) => surahNamesTR[id.split(':')[0]] || "Sure " + id.split(':')[0];

var getRootCSSColor = (root) => {
    let h = 0; for (let i = 0; i < root.length; i++) h = (h << 5) - h + root.charCodeAt(i);
    return `hsl(${Math.abs(h * 137.5) % 360}, 100%, 60%)`;
};

var getRootPron = (root) => {
    if(!root) return "";
    return root.split('').filter(c => c !== ' ').map(char => arabicToLatinMap[char] || char).join('-');
};

var getRootInfo = (root) => {
    if (!root) return null;
    return rootDictionary[root] || rootDictionary[root.replace(/\s/g, '')] || null;
};

// Arapça metin normalizasyonu (harekeler kaldır, elif varyantları birleştir)
var normalizeArabic = (s) => s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627').replace(/\u0629/g, '\u0647').replace(/\u0649/g, '\u064A');
var isArabic = (s) => /[\u0600-\u06FF]/.test(s);
