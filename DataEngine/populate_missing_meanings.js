/**
 * populate_missing_meanings.js
 * 
 * quran_roots.json'daki bos meaning alanlarini doldurur.
 * Bilinen Kur'an kokleri icin Turkce ve Arapca anlamlari ekler.
 * 
 * Kullanim: node DataEngine/populate_missing_meanings.js
 */

const fs = require('fs');
const path = require('path');

const ROOTS_FILE = path.join(__dirname, '..', 'Frontend', 'quran_roots.json');
const MORPH_FILE = path.join(__dirname, 'quran-morphology.txt');

// Bilinen kok anlamlari sozlugu
const KNOWN_MEANINGS = {
    "أدد": { meaning: "siddet, kuvvet, sayi", meaning_ar: "الشدة والقوة والعدد" },
    "أزر": { meaning: "destekleme, guclendirme", meaning_ar: "التقوية والمؤازرة" },
    "أفف": { meaning: "bezginlik, bikkinklik ifadesi", meaning_ar: "التضجر والتأفف" },
    "ألل": { meaning: "keskinlik, pariltiltili ses", meaning_ar: "الحدة والبريق" },
    "أمو": { meaning: "cariye, kadin kole", meaning_ar: "الأمة والخادمة" },
    "أون": { meaning: "zaman, vakit, olgunluk", meaning_ar: "الحين والنضج" },
    "بأر": { meaning: "kuyu", meaning_ar: "البئر" },
    "برزخ": { meaning: "engel, perde, aradaki sinir", meaning_ar: "الحاجز بين شيئين" },
    "برهن": { meaning: "delil, kanit, burhan", meaning_ar: "البرهان والدليل القاطع" },
    "بعثر": { meaning: "dagitma, altini ustune getirme", meaning_ar: "التبديد والنبش" },
    "تعس": { meaning: "surcme, helak olma", meaning_ar: "التعاسة والهلاك" },
    "تفث": { meaning: "hac kirlerini giderme", meaning_ar: "إزالة الشعث والوسخ في الحج" },
    "ثبي": { meaning: "toplama, bir araya getirme", meaning_ar: "الجمع والحشد" },
    "ثيب": { meaning: "donme, tekrar evlenen kadin", meaning_ar: "الرجوع، المرأة الثيب" },
    "جفأ": { meaning: "kopuk, supruntuyu atmak", meaning_ar: "الزبد والغثاء" },
    "حصحص": { meaning: "ortaya cikma, hakikatin belirmesi", meaning_ar: "ظهور الحق وتبينه" },
    "حفو": { meaning: "israr etme, ustune dusme", meaning_ar: "الإلحاح والمبالغة في السؤال" },
    "حنجر": { meaning: "bogaz, girtlak", meaning_ar: "الحنجرة والحلق" },
    "خردل": { meaning: "hardal (kucukluk olcusu)", meaning_ar: "الخردل (مقياس الصغر)" },
    "خرطم": { meaning: "burun, hortum", meaning_ar: "الأنف، الخرطوم" },
    "خنزر": { meaning: "domuz", meaning_ar: "الخنزير" },
    "درهم": { meaning: "dirhem, gumus para birimi", meaning_ar: "الدرهم، العملة الفضية" },
    "دسو": { meaning: "gizleme, ortme, kirletme", meaning_ar: "الإخفاء والتدنيس" },
    "دمدم": { meaning: "helak etme, yerle bir etme", meaning_ar: "الإهلاك والتدمير الشامل" },
    "دنر": { meaning: "dinar, altin para birimi", meaning_ar: "الدينار، العملة الذهبية" },
    "دهي": { meaning: "bela, musibet, kurnazlik", meaning_ar: "الداهية والبلاء" },
    "ذبذب": { meaning: "tereddut, kararsizlik", meaning_ar: "التذبذب والتردد" },
    "رفرف": { meaning: "yastik, dosek, yesil ortu", meaning_ar: "الرفرف، الوسائد الخضراء" },
    "زحزح": { meaning: "uzaklastirma, ote itme", meaning_ar: "الإبعاد والإزاحة" },
    "زخرف": { meaning: "sus, bezek, altin yaldiz", meaning_ar: "الزينة والزخرفة" },
    "زري": { meaning: "kucumseme, asagilama", meaning_ar: "الاحتقار والازدراء" },
    "زلزل": { meaning: "sarsinti, deprem", meaning_ar: "الزلزلة والاهتزاز الشديد" },
    "زمهر": { meaning: "dondurucu soguk", meaning_ar: "البرد الشديد، الزمهرير" },
    "سجو": { meaning: "ortme, karanlik basma, sukun", meaning_ar: "التغطية والسكون" },
    "سربل": { meaning: "giysi giydirme, elbise", meaning_ar: "الإلباس، السربال" },
    "سردق": { meaning: "cadir, tente, ceper", meaning_ar: "السرادق، الفسطاط" },
    "سرمد": { meaning: "surekli, daimi, ebedi", meaning_ar: "الدوام والاستمرار" },
    "سلسل": { meaning: "zincir, silsile", meaning_ar: "السلسلة والتتابع" },
    "سنبل": { meaning: "basak", meaning_ar: "السنبلة" },
    "شرذم": { meaning: "kucuk ve dagnik topluluk", meaning_ar: "الفرقة القليلة المتفرقة" },
    "شمز": { meaning: "tiksinme, yuz cevirme", meaning_ar: "الاشمئزاز والنفور" },
    "صدي": { meaning: "ses, yanki, engelleme", meaning_ar: "الصدى والصد" },
    "صرصر": { meaning: "siddetli soguk ruzgar", meaning_ar: "الريح الشديدة الباردة" },
    "صفصف": { meaning: "dumduz yer, ova", meaning_ar: "الأرض المستوية الملساء" },
    "صلصل": { meaning: "kuru camur, cinlayan ses", meaning_ar: "الطين اليابس، الصلصال" },
    "صمع": { meaning: "sapik din adamlari, manastir", meaning_ar: "الصوامع، معابد الرهبان" },
    "ضفدع": { meaning: "kurbaga", meaning_ar: "الضفدع" },
    "طحو": { meaning: "yayma, duzleme", meaning_ar: "البسط والتمهيد" },
    "طرو": { meaning: "taze, yeni, yumusak", meaning_ar: "الطراوة والليونة" },
    "طمأن": { meaning: "huzur, guvence, icsel sukun", meaning_ar: "الطمأنينة والسكينة" },
    "عبقر": { meaning: "ince islemeli, zarif (Abkari)", meaning_ar: "العبقري، الفاخر المتقن" },
    "عرجن": { meaning: "hurma salkimi copu (urcun)", meaning_ar: "العرجون، عذق النخل القديم" },
    "عسعس": { meaning: "karanligin basmasi veya cekilmesi", meaning_ar: "إقبال الليل أو إدباره" },
    "عضو": { meaning: "parcalara ayirma, uzuv", meaning_ar: "التجزئة والأعضاء" },
    "عنكب": { meaning: "orumcek", meaning_ar: "العنكبوت" },
    "عنو": { meaning: "alcalma, boyun egme, teslim olma", meaning_ar: "الخضوع والذل" },
    "فضو": { meaning: "ortaya cikma, ifsa", meaning_ar: "الإفضاء والكشف" },
    "فلن": { meaning: "gemi (fulk)", meaning_ar: "السفينة، الفلك" },
    "قرطس": { meaning: "kagit, hedefi vurma", meaning_ar: "القرطاس، إصابة الهدف" },
    "قسطس": { meaning: "adil terazi, olcu", meaning_ar: "الميزان العادل، القسطاس" },
    "قشعر": { meaning: "urperme, tuyler diken diken olma", meaning_ar: "القشعريرة" },
    "قضض": { meaning: "daginik, parcalanmis", meaning_ar: "التفرق والانتشار" },
    "قطمر": { meaning: "hurma cekirdegi zari, en kucuk sey", meaning_ar: "القطمير، لفافة نواة التمر" },
    "قمطر": { meaning: "siddetli, kasvetli gun", meaning_ar: "العبوس والشدة" },
    "قنطر": { meaning: "buyuk miktarda mal, kantar", meaning_ar: "القنطار، المال الكثير" },
    "كبكب": { meaning: "yuz ustu atma, yuvarlanma", meaning_ar: "الإلقاء على الوجه والسقوط" },
    "كفأ": { meaning: "denk, esit, benzer", meaning_ar: "المماثلة والمساواة" },
    "كوكب": { meaning: "yildiz, gezegen", meaning_ar: "الكوكب، النجم" },
    "كين": { meaning: "olusum, varlik, olma", meaning_ar: "الكيان والوجود" },
    "لؤلؤ": { meaning: "inci", meaning_ar: "اللؤلؤ" },
    "لوت": { meaning: "Lut (peygamber ismi)", meaning_ar: "لوط (اسم نبي)" },
    "مجس": { meaning: "Mecusi, ates tapicisi", meaning_ar: "المجوس، عبدة النار" },
    "مسو": { meaning: "mesh etme, silme", meaning_ar: "المسح واللمس" },
    "مكو": { meaning: "islak calma, alkilama (kuslari urkutme)", meaning_ar: "المكاء، التصفير" },
    "نفي": { meaning: "savurma, uzaklastirma", meaning_ar: "الطرد والإبعاد" },
    "نمرق": { meaning: "yastik, minder", meaning_ar: "النمارق، الوسائد" },
    "هاء": { meaning: "al!, buyur! (verme fiili)", meaning_ar: "هاء، فعل العطاء" },
    "هات": { meaning: "getir! (isteme fiili)", meaning_ar: "هاتِ، فعل الطلب" },
    "هدهد": { meaning: "Hudhud kusu", meaning_ar: "الهدهد (طائر)" },
    "هشش": { meaning: "yumusak davranma, cirpi kirma", meaning_ar: "الهش واللين" },
    "همن": { meaning: "koruma, gozetme, muheymin", meaning_ar: "الهيمنة والحفظ والرقابة" },
    "وأد": { meaning: "diri diri gomme", meaning_ar: "الوأد، دفن الحي" },
    "وسوس": { meaning: "vesvese verme, fisildama", meaning_ar: "الوسوسة والإغواء الخفي" },
    "وهي": { meaning: "zayiflama, cokme", meaning_ar: "الضعف والانهيار" },
    "يقظ": { meaning: "uyanik olma, tetikte olma", meaning_ar: "اليقظة والانتباه" }
};

// Parse morphology for LEM data
const morphLems = {};
const morphLines = fs.readFileSync(MORPH_FILE, 'utf8').split('\n');
for (const line of morphLines) {
    const rootMatch = line.match(/ROOT:([^|]+)/);
    const lemMatch = line.match(/LEM:([^|]+)/);
    if (rootMatch && lemMatch) {
        const root = rootMatch[1];
        const lem = lemMatch[1];
        if (!morphLems[root]) morphLems[root] = new Set();
        morphLems[root].add(lem);
    }
}

// Load and update roots
const roots = JSON.parse(fs.readFileSync(ROOTS_FILE, 'utf8'));
let updated = 0;

for (const [root, entry] of Object.entries(roots)) {
    if (entry.meaning && entry.meaning !== '') continue;
    
    const known = KNOWN_MEANINGS[root];
    if (known) {
        entry.meaning = known.meaning;
        entry.meaning_ar = known.meaning_ar;
        updated++;
        
        // Add derived words from morphology
        if (morphLems[root] && entry.derived.length === 0) {
            entry.derived = [...morphLems[root]].slice(0, 5).map(lem => ({
                word: lem,
                meaning: ""
            }));
        }
        
        console.log('  [OK]', root, '->', known.meaning);
    } else {
        console.log('  [!!]', root, '- ANLAM BULUNAMADI');
    }
}

fs.writeFileSync(ROOTS_FILE, JSON.stringify(roots, null, 2), 'utf8');
console.log('\nToplam guncellenen:', updated, '/', Object.keys(KNOWN_MEANINGS).length);
