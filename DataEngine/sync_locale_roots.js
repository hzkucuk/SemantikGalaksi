/**
 * sync_locale_roots.js
 * 
 * Tum locale root dosyalarini quran_roots.json ile senkronize eder:
 * 1) Denormalize varyantlardan ceviri verisini kurtarir (ör: اله -> أله)
 * 2) 573 kullanilmayan girisi temizler
 * 3) 85 eksik kok icin ceviri girislerini olusturur
 * 
 * Kullanim: node DataEngine/sync_locale_roots.js
 */

const fs = require('fs');
const path = require('path');

const ROOTS_FILE = path.join(__dirname, '..', 'Frontend', 'quran_roots.json');
const LOCALES_DIR = path.join(__dirname, '..', 'Frontend', 'locales');

// Ana kok sozlugu (otorite)
const mainRoots = JSON.parse(fs.readFileSync(ROOTS_FILE, 'utf8'));
const mainKeys = new Set(Object.keys(mainRoots));

// 85 eksik kok icin bilinen Ingilizce ceviriler
const EN_TRANSLATIONS = {
    "أدد": "strength, severity, number",
    "أزر": "support, strengthen, wrap",
    "أفف": "expression of disgust, annoyance",
    "ألل": "sharpness, brightness",
    "أمو": "maidservant, bondwoman",
    "أون": "time, moment, maturity",
    "بأر": "well, water source",
    "برزخ": "barrier, partition, isthmus",
    "برهن": "proof, evidence, clear argument",
    "بعثر": "to scatter, to overturn",
    "تعس": "to stumble, to perish",
    "تفث": "removal of ritual impurity (Hajj)",
    "ثبي": "to gather, to collect in groups",
    "ثيب": "previously married woman",
    "جفأ": "foam, scum, to cast away",
    "حصحص": "truth becoming manifest",
    "حفو": "to urge persistently, to press",
    "حنجر": "throat, larynx",
    "خردل": "mustard (measure of smallness)",
    "خرطم": "snout, trunk, nose",
    "خنزر": "swine, pig",
    "درهم": "dirham, silver coin",
    "دسو": "to hide, to conceal, to corrupt",
    "دمدم": "to utterly destroy, to annihilate",
    "دنر": "dinar, gold coin",
    "دهي": "calamity, affliction, cunning",
    "ذبذب": "to waver, to hesitate",
    "رفرف": "cushion, green spread, canopy",
    "زحزح": "to push away, to avert",
    "زخرف": "adornment, gold decoration, ornament",
    "زري": "contempt, to despise",
    "زلزل": "earthquake, violent shaking",
    "زمهر": "extreme cold, bitter frost",
    "سجو": "to cover, stillness of night",
    "سربل": "to clothe, garment, shirt",
    "سردق": "pavilion, tent, canopy",
    "سرمد": "perpetual, continuous, everlasting",
    "سلسل": "chain, series, sequence",
    "سنبل": "ear of grain, spike",
    "شرذم": "small scattered group, faction",
    "شمز": "to feel disgust, to cringe",
    "صدي": "echo, to turn away, to hinder",
    "صرصر": "fierce cold wind, howling gale",
    "صفصف": "flat barren plain, level ground",
    "صلصل": "dry clay, ringing sound",
    "صمع": "hermit cells, monasteries",
    "ضفدع": "frog",
    "طحو": "to spread out, to level",
    "طرو": "fresh, tender, new",
    "طمأن": "tranquility, reassurance, peace of heart",
    "عبقر": "fine carpets, brocade (Abqari)",
    "عرجن": "old dried date stalk (Urjun)",
    "عسعس": "night approaching or departing",
    "عضو": "to divide into parts, limb",
    "عنكب": "spider",
    "عنو": "to submit, to humble oneself",
    "فضو": "to expose, to reveal",
    "فلن": "ship, vessel (Fulk)",
    "قرطس": "parchment, to hit the target",
    "قسطس": "just balance, accurate scale",
    "قشعر": "to shiver, goosebumps, to shudder",
    "قضض": "scattered, dispersed",
    "قطمر": "date-seed membrane, smallest thing",
    "قمطر": "severe, gloomy day",
    "قنطر": "great amount of wealth, Qintar",
    "كبكب": "to throw headlong, to tumble",
    "كفأ": "equal, equivalent, match",
    "كوكب": "star, planet, celestial body",
    "كين": "being, existence, entity",
    "لؤلؤ": "pearl",
    "لوت": "Lot (Prophet's name)",
    "مجس": "Magian, fire worshiper",
    "مسو": "to wipe, to touch, to anoint",
    "مكو": "to whistle, to clap (scaring birds)",
    "نفي": "to cast out, to banish",
    "نمرق": "cushion, pillow",
    "هاء": "here! take it! (giving verb)",
    "هات": "bring! give! (requesting verb)",
    "هدهد": "hoopoe bird",
    "هشش": "to be gentle, to break twigs",
    "همن": "to watch over, to protect, guardian",
    "وأد": "to bury alive (female infanticide)",
    "وسوس": "to whisper, to tempt, insinuation",
    "وهي": "to weaken, to collapse, to crumble",
    "يقظ": "to be awake, to be alert, vigilant"
};

const ES_TRANSLATIONS = {
    "أدد": "fuerza, severidad, numero",
    "أزر": "apoyo, fortalecimiento",
    "أفف": "expresion de disgusto, fastidio",
    "ألل": "agudeza, brillo",
    "أمو": "sierva, esclava",
    "أون": "tiempo, momento, madurez",
    "بأر": "pozo, fuente de agua",
    "برزخ": "barrera, particion, istmo",
    "برهن": "prueba, evidencia, argumento claro",
    "بعثر": "esparcir, revolver",
    "تعس": "tropezar, perecer",
    "تفث": "limpieza ritual del Hajj",
    "ثبي": "reunir, juntar en grupos",
    "ثيب": "mujer previamente casada",
    "جفأ": "espuma, desecho, desechar",
    "حصحص": "manifestacion de la verdad",
    "حفو": "insistir, presionar",
    "حنجر": "garganta, laringe",
    "خردل": "mostaza (medida de pequenez)",
    "خرطم": "trompa, hocico, nariz",
    "خنزر": "cerdo, puerco",
    "درهم": "dirham, moneda de plata",
    "دسو": "ocultar, esconder, corromper",
    "دمدم": "destruir completamente, aniquilar",
    "دنر": "dinar, moneda de oro",
    "دهي": "calamidad, afliccion, astucia",
    "ذبذب": "vacilar, dudar",
    "رفرف": "cojin, cubierta verde, dosel",
    "زحزح": "alejar, apartar",
    "زخرف": "adorno, decoracion dorada, ornamento",
    "زري": "desprecio, desdenar",
    "زلزل": "terremoto, sacudida violenta",
    "زمهر": "frio extremo, helada amarga",
    "سجو": "cubrir, quietud nocturna",
    "سربل": "vestir, prenda, camisa",
    "سردق": "pabellon, tienda, toldo",
    "سرمد": "perpetuo, continuo, eterno",
    "سلسل": "cadena, serie, secuencia",
    "سنبل": "espiga de grano",
    "شرذم": "pequeno grupo disperso, faccion",
    "شمز": "sentir repugnancia, estremecerse",
    "صدي": "eco, desviar, impedir",
    "صرصر": "viento frio feroz, vendaval",
    "صفصف": "llanura arida y plana",
    "صلصل": "arcilla seca, sonido resonante",
    "صمع": "celdas de ermitanos, monasterios",
    "ضفدع": "rana",
    "طحو": "extender, aplanar",
    "طرو": "fresco, tierno, nuevo",
    "طمأن": "tranquilidad, serenidad, paz interior",
    "عبقر": "alfombras finas, brocado",
    "عرجن": "tallo seco de datil viejo",
    "عسعس": "noche acercandose o retirandose",
    "عضو": "dividir en partes, miembro",
    "عنكب": "arana",
    "عنو": "someterse, humillarse",
    "فضو": "exponer, revelar",
    "فلن": "barco, navio",
    "قرطس": "pergamino, dar en el blanco",
    "قسطس": "balanza justa, escala precisa",
    "قشعر": "temblar, escalofrio, estremecerse",
    "قضض": "disperso, esparcido",
    "قطمر": "membrana de semilla de datil",
    "قمطر": "dia severo y sombrio",
    "قنطر": "gran cantidad de riqueza, Quintar",
    "كبكب": "lanzar de cabeza, caer rodando",
    "كفأ": "igual, equivalente, par",
    "كوكب": "estrella, planeta, cuerpo celeste",
    "كين": "ser, existencia, entidad",
    "لؤلؤ": "perla",
    "لوت": "Lot (nombre de profeta)",
    "مجس": "mago, adorador del fuego",
    "مسو": "frotar, tocar, ungir",
    "مكو": "silbar, palmear (ahuyentar pajaros)",
    "نفي": "expulsar, desterrar",
    "نمرق": "cojin, almohada",
    "هاء": "toma!, aqui tienes! (verbo de dar)",
    "هات": "trae!, da! (verbo de pedir)",
    "هدهد": "abubilla (pajaro)",
    "هشش": "ser suave, romper ramitas",
    "همن": "vigilar, proteger, guardian",
    "وأد": "enterrar vivo (infanticidio femenino)",
    "وسوس": "susurrar, tentar, insinuacion",
    "وهي": "debilitarse, derrumbarse, desmoronarse",
    "يقظ": "estar despierto, estar alerta, vigilante"
};

const IT_TRANSLATIONS = {
    "أدد": "forza, severita, numero",
    "أزر": "sostenere, rafforzare",
    "أفف": "espressione di disgusto, fastidio",
    "ألل": "acutezza, brillantezza",
    "أمو": "serva, schiava",
    "أون": "tempo, momento, maturita",
    "بأر": "pozzo, sorgente d'acqua",
    "برزخ": "barriera, partizione, istmo",
    "برهن": "prova, evidenza, argomento chiaro",
    "بعثر": "spargere, rivoltare",
    "تعس": "inciampare, perire",
    "تفث": "purificazione rituale del Hajj",
    "ثبي": "radunare, raccogliere in gruppi",
    "ثيب": "donna precedentemente sposata",
    "جفأ": "schiuma, scarto, gettare via",
    "حصحص": "manifestazione della verita",
    "حفو": "insistere, premere",
    "حنجر": "gola, laringe",
    "خردل": "senape (misura di piccolezza)",
    "خرطم": "proboscide, muso, naso",
    "خنزر": "maiale, suino",
    "درهم": "dirham, moneta d'argento",
    "دسو": "nascondere, celare, corrompere",
    "دمدم": "distruggere completamente, annientare",
    "دنر": "dinaro, moneta d'oro",
    "دهي": "calamita, afflizione, astuzia",
    "ذبذب": "vacillare, esitare",
    "رفرف": "cuscino, tenda verde, baldacchino",
    "زحزح": "allontanare, spostare",
    "زخرف": "ornamento, decorazione dorata",
    "زري": "disprezzo, disprezzare",
    "زلزل": "terremoto, scuotimento violento",
    "زمهر": "freddo estremo, gelo amaro",
    "سجو": "coprire, quiete notturna",
    "سربل": "vestire, indumento, camicia",
    "سردق": "padiglione, tenda, baldacchino",
    "سرمد": "perpetuo, continuo, eterno",
    "سلسل": "catena, serie, sequenza",
    "سنبل": "spiga di grano",
    "شرذم": "piccolo gruppo disperso, fazione",
    "شمز": "provare disgusto, rabbrividire",
    "صدي": "eco, deviare, impedire",
    "صرصر": "vento freddo feroce, tempesta",
    "صفصف": "pianura arida e piatta",
    "صلصل": "argilla secca, suono risonante",
    "صمع": "celle di eremiti, monasteri",
    "ضفدع": "rana",
    "طحو": "stendere, livellare",
    "طرو": "fresco, tenero, nuovo",
    "طمأن": "tranquillita, rassicurazione, pace interiore",
    "عبقر": "tappeti fini, broccato",
    "عرجن": "stelo secco di dattero vecchio",
    "عسعس": "notte che si avvicina o si ritira",
    "عضو": "dividere in parti, membro",
    "عنكب": "ragno",
    "عنو": "sottomettersi, umiliarsi",
    "فضو": "esporre, rivelare",
    "فلن": "nave, imbarcazione",
    "قرطس": "pergamena, colpire il bersaglio",
    "قسطس": "bilancia giusta, scala precisa",
    "قشعر": "tremare, brivido, rabbrividire",
    "قضض": "disperso, sparso",
    "قطمر": "membrana del seme di dattero",
    "قمطر": "giorno severo e cupo",
    "قنطر": "grande quantita di ricchezza, Qintar",
    "كبكب": "lanciare a capofitto, cadere rotolando",
    "كفأ": "uguale, equivalente, pari",
    "كوكب": "stella, pianeta, corpo celeste",
    "كين": "essere, esistenza, entita",
    "لؤلؤ": "perla",
    "لوت": "Lot (nome del profeta)",
    "مجس": "mago, adoratore del fuoco",
    "مسو": "strofinare, toccare, ungere",
    "مكو": "fischiare, battere le mani (spaventare uccelli)",
    "نفي": "espellere, bandire",
    "نمرق": "cuscino, guanciale",
    "هاء": "prendi! ecco! (verbo di dare)",
    "هات": "porta! dai! (verbo di richiedere)",
    "هدهد": "upupa (uccello)",
    "هشش": "essere gentile, rompere rametti",
    "همن": "sorvegliare, proteggere, guardiano",
    "وأد": "seppellire vivo (infanticidio femminile)",
    "وسوس": "sussurrare, tentare, insinuazione",
    "وهي": "indebolirsi, crollare, sgretolarsi",
    "يقظ": "essere sveglio, essere vigile, vigilante"
};

const RU_TRANSLATIONS = {
    "أدد": "сила, суровость, число",
    "أزر": "поддержка, укрепление",
    "أفف": "выражение раздражения, досады",
    "ألل": "острота, блеск",
    "أمو": "рабыня, служанка",
    "أون": "время, момент, зрелость",
    "بأر": "колодец, источник воды",
    "برزخ": "преграда, перегородка, перешеек",
    "برهن": "доказательство, довод, ясный аргумент",
    "بعثر": "разбрасывать, переворачивать",
    "تعس": "спотыкаться, погибать",
    "تفث": "очищение от ритуальной скверны (Хадж)",
    "ثبي": "собирать, группировать",
    "ثيب": "ранее замужняя женщина",
    "جفأ": "пена, отброс, выбрасывать",
    "حصحص": "проявление истины",
    "حفو": "настаивать, упорствовать",
    "حنجر": "горло, гортань",
    "خردل": "горчица (мера малости)",
    "خرطم": "хобот, морда, нос",
    "خنزر": "свинья",
    "درهم": "дирхам, серебряная монета",
    "دسو": "скрывать, прятать, осквернять",
    "دمدم": "полностью уничтожить, истребить",
    "دنر": "динар, золотая монета",
    "دهي": "бедствие, несчастье, хитрость",
    "ذبذب": "колебаться, сомневаться",
    "رفرف": "подушка, зеленое покрывало, балдахин",
    "زحزح": "отдалять, отстранять",
    "زخرف": "украшение, золотой декор, орнамент",
    "زري": "презрение, пренебрежение",
    "زلزل": "землетрясение, сильная тряска",
    "زمهر": "лютый холод, жестокий мороз",
    "سجو": "покрывать, ночная тишина",
    "سربل": "одевать, одежда, рубашка",
    "سردق": "шатер, навес, палатка",
    "سرمد": "вечный, непрерывный, постоянный",
    "سلسل": "цепь, серия, последовательность",
    "سنبل": "колос зерна",
    "شرذم": "малая разрозненная группа, фракция",
    "شمز": "чувствовать отвращение, содрогаться",
    "صدي": "эхо, отвращать, препятствовать",
    "صرصر": "свирепый холодный ветер, буря",
    "صفصف": "ровная безводная равнина",
    "صلصل": "сухая глина, звенящий звук",
    "صمع": "кельи отшельников, монастыри",
    "ضفدع": "лягушка",
    "طحو": "расстилать, выравнивать",
    "طرو": "свежий, нежный, новый",
    "طمأن": "спокойствие, умиротворение, душевный покой",
    "عبقر": "тонкие ковры, парча (Абкари)",
    "عرجن": "старая сухая ветвь финиковой пальмы",
    "عسعس": "наступление или отступление ночи",
    "عضو": "разделять на части, член тела",
    "عنكب": "паук",
    "عنو": "покоряться, смиряться",
    "فضو": "обнаруживать, раскрывать",
    "فلن": "корабль, судно",
    "قرطس": "пергамент, поражать цель",
    "قسطس": "справедливые весы, точная мера",
    "قشعر": "дрожать, мурашки, содрогаться",
    "قضض": "рассеянный, разбросанный",
    "قطمر": "пленка финиковой косточки, мельчайшая вещь",
    "قمطر": "суровый, мрачный день",
    "قنطر": "большое богатство, кинтар",
    "كبكب": "бросать вниз головой, падать кувырком",
    "كفأ": "равный, эквивалентный, подобный",
    "كوكب": "звезда, планета, небесное тело",
    "كين": "бытие, существование, сущность",
    "لؤلؤ": "жемчуг",
    "لوت": "Лут (имя пророка)",
    "مجس": "маг, огнепоклонник",
    "مسو": "протирать, касаться, помазать",
    "مكو": "свистеть, хлопать (пугая птиц)",
    "نفي": "изгонять, отвергать",
    "نمرق": "подушка, мягкое сиденье",
    "هاء": "на!, бери! (глагол давания)",
    "هات": "дай!, принеси! (глагол просьбы)",
    "هدهد": "удод (птица)",
    "هشش": "быть мягким, ломать ветки",
    "همن": "охранять, оберегать, покровитель",
    "وأد": "закапывать живьем (детоубийство)",
    "وسوس": "нашептывать, искушать, наущение",
    "وهي": "ослабевать, рушиться, разрушаться",
    "يقظ": "бодрствовать, быть бдительным, настороже"
};

const LANG_TRANSLATIONS = { en: EN_TRANSLATIONS, es: ES_TRANSLATIONS, it: IT_TRANSLATIONS, ru: RU_TRANSLATIONS };

// Normalizasyon haritalari (eski denormalize -> dogru kok)
function normalizeRoot(root) {
    return root
        .replace(/^ا/g, 'أ')   // Baslangic elif -> hemze
        .replace(/إ/g, 'أ')    // Elif altinda hemze
        .replace(/ى$/g, 'ي')   // Son elif maqsura -> ya
        .replace(/ؤ/g, 'أ')    // Vav ustu hemze
        .replace(/ة/g, 'ت');   // Ta marbuta -> ta
}

// Islem
const langs = ['en', 'es', 'it', 'ru'];
const morphLems = {};
const morphLines = fs.readFileSync(path.join(__dirname, 'quran-morphology.txt'), 'utf8').split('\n');
for (const line of morphLines) {
    const rootMatch = line.match(/ROOT:([^|]+)/);
    const lemMatch = line.match(/LEM:([^|]+)/);
    if (rootMatch && lemMatch) {
        const root = rootMatch[1];
        if (!morphLems[root]) morphLems[root] = new Set();
        morphLems[root].add(lemMatch[1]);
    }
}

for (const lang of langs) {
    const filePath = path.join(LOCALES_DIR, `roots_${lang}.json`);
    const locale = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const translations = LANG_TRANSLATIONS[lang];
    
    console.log(`\n=== ${lang.toUpperCase()} ===`);
    
    // 1) Denormalize varyantlardan ceviri kurtarma
    const extraKeys = Object.keys(locale).filter(r => !mainKeys.has(r));
    let salvaged = 0;
    for (const oldKey of extraKeys) {
        const normKey = normalizeRoot(oldKey);
        if (normKey !== oldKey && mainKeys.has(normKey)) {
            // Dogru key zaten varsa ve cevirisi yoksa, eskiden al
            if (locale[normKey] && (!locale[normKey].meaning || locale[normKey].meaning === '')) {
                locale[normKey] = locale[oldKey];
                salvaged++;
            } else if (!locale[normKey]) {
                locale[normKey] = locale[oldKey];
                salvaged++;
            }
        }
    }
    console.log(`  Kurtarilan varyant ceviriler: ${salvaged}`);
    
    // 2) Fazla girisleri sil
    let removed = 0;
    for (const key of Object.keys(locale)) {
        if (!mainKeys.has(key)) {
            delete locale[key];
            removed++;
        }
    }
    console.log(`  Silinen fazla girisler: ${removed}`);
    
    // 3) Eksik girisleri ekle
    let added = 0;
    for (const key of mainKeys) {
        if (!locale[key]) {
            const meaning = translations[key] || mainRoots[key].meaning || '';
            const derived = (morphLems[key] || new Set());
            locale[key] = {
                meaning: meaning,
                derived: [...derived].slice(0, 5).map(lem => ({
                    word: lem,
                    meaning: ""
                }))
            };
            added++;
        }
    }
    console.log(`  Eklenen eksik girisler: ${added}`);
    
    // 4) Sirala ve kaydet
    const sorted = {};
    for (const key of Object.keys(locale).sort()) {
        sorted[key] = locale[key];
    }
    
    fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2), 'utf8');
    
    // 5) Dogrulama
    const finalKeys = new Set(Object.keys(sorted));
    const stillMissing = [...mainKeys].filter(r => !finalKeys.has(r));
    const stillExtra = [...finalKeys].filter(r => !mainKeys.has(r));
    const emptyMeaning = Object.entries(sorted).filter(([k, v]) => !v.meaning || v.meaning === '').length;
    console.log(`  Sonuc: ${finalKeys.size} giris | Eksik: ${stillMissing.length} | Fazla: ${stillExtra.length} | Bos anlam: ${emptyMeaning}`);
    console.log(`  Senkron: ${stillMissing.length === 0 && stillExtra.length === 0 ? 'EVET' : 'HAYIR'}`);
}
