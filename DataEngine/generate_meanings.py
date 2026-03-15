# -*- coding: utf-8 -*-
"""
Morphology gramer etiketleri + kok anlamlari kullanarak
derived_words icin Turkce anlam ureten script.
Gemini API KULLANMAZ - tamamen offline.
"""
import sqlite3
import re
from collections import defaultdict

DB_PATH = 'quran.db'
MORPH_FILE = 'quran-morphology.txt'

# ======================================================================
# OZEL SOZLUK: Kur'an'da sik gecen kelimelerin birebir Turkce karsiliklari
# ======================================================================
OVERRIDE_DICT = {
    # --- Temel Fiiller ---
    "عَبَدَ": "kulluk etmek, ibadet etmek",
    "اسْتَعِينُ": "yardim dilemek",
    "هَدَى": "hidayet etmek, yol gostermek",
    "أَنْعَمَ": "nimet vermek",
    "آمَنَ": "iman etmek, inanmak",
    "كَفَرَ": "inkar etmek, ort etmek",
    "أَقامَ": "dosdogru kilmak",
    "رَزَقَ": "rizik vermek",
    "أَنفَقَ": "infak etmek, harcamak",
    "أَنزَلَ": "indirmek",
    "يُوقِنُ": "kesin bilmek, yakin etmek",
    "خَتَمَ": "muhurlemek",
    "أَفْسَدَ": "bozgunculuk yapmak",
    "أَصْلَحَ": "islah etmek, duzeltmek",
    "اسْتَهْزَأَ": "alay etmek",
    "اشْتَرَى": "satin almak",
    "ضَلَّ": "sapmak, yolunu kaybetmek",
    "ضَرَبَ": "vurmak, ornek vermek",
    "عَلِمَ": "bilmek",
    "جَعَلَ": "kilmak, yapmak",
    "قالَ": "demek, soylemek",
    "أَرادَ": "istemek, dilemek",
    "ذَهَبَ": "gitmek",
    "قامَ": "kalkmak, dikilmek",
    "أَتَى": "gelmek, getirmek",
    "آتَى": "vermek",
    "نَزَلَ": "inmek",
    "دَخَلَ": "girmek",
    "خَرَجَ": "cikmak",
    "سَمِعَ": "isitmek, dinlemek",
    "بَصُرَ": "gormek, bakmak",
    "نَظَرَ": "bakmak",
    "كَتَبَ": "yazmak, farz kilmak",
    "حَكَمَ": "hukmetmek",
    "سَجَدَ": "secde etmek",
    "رَكَعَ": "ruku etmek",
    "صَلَّى": "namaz kilmak, dua etmek",
    "صَامَ": "oruc tutmak",
    "ذَكَرَ": "anmak, hatirlamak",
    "شَكَرَ": "sukretmek",
    "صَبَرَ": "sabretmek",
    "تَوَكَّلَ": "tevekkul etmek",
    "تابَ": "tovbe etmek",
    "غَفَرَ": "bagislamak",
    "رَحِمَ": "merhamet etmek",
    "عَذَّبَ": "azap etmek",
    "حَرَّمَ": "haram kilmak",
    "أَحَلَّ": "helal kilmak",
    "أَمَرَ": "emretmek",
    "نَهَى": "yasaklamak, nehyetmek",
    "فَعَلَ": "yapmak, islemek",
    "خَلَقَ": "yaratmak",
    "بَعَثَ": "gondermek, diriltmek",
    "أَرْسَلَ": "gondermek",
    "وَعَدَ": "vaat etmek",
    "أَوْعَدَ": "tehdit etmek",
    "قَتَلَ": "oldurmek",
    "أَحْيَا": "diriltmek, hayat vermek",
    "أَمَاتَ": "oldurmek, oldurtmek",
    "وَرِثَ": "miras almak",
    "كَسَبَ": "kazanmak",
    "اكْتَسَبَ": "kazanmak, elde etmek",
    "ظَلَمَ": "zulmetmek",
    "عَدَلَ": "adalet etmek",
    "حَسِبَ": "sanmak, hesap etmek",
    "عَرَفَ": "bilmek, tanimak",
    "أَنكَرَ": "inkar etmek",
    "فَتَحَ": "fethetmek, acmak",
    "بَدَّلَ": "degistirmek",
    "سَبَّحَ": "tesbih etmek, yuceltmek",
    "حَمِدَ": "hamd etmek, ovmek",
    "اتَّبَعَ": "tabi olmak, uymak",
    "اتَّقَى": "takva sahibi olmak, sakinmak",
    "أَشْرَكَ": "sirk kosmak, ortak tutmak",
    "اسْتَكْبَرَ": "buyuklenmek, kibirlenmek",
    "اسْتَغْفَرَ": "bagislanma dilemek",
    "تَوَلَّى": "yuz cevirmek, donmek",
    "تَفَكَّرَ": "dusunmek, tefekkur etmek",
    "تَدَبَّرَ": "derin dusunmek",
    "كَذَّبَ": "yalanlamak",
    "صَدَقَ": "dogru soylemek, dogrulamak",
    "فَسَقَ": "yoldan cikmak, fiskelenmek",
    "نَافَقَ": "munafliklik yapmak",
    "حَاجَّ": "tartismak, delil getirmek",
    "جَاهَدَ": "cihad etmek, cabalasmak",
    "أَطَاعَ": "itaat etmek",
    "عَصَى": "isyan etmek, karsi gelmek",
    "وَقَى": "korunmak, sakindirmak",
    "هَلَكَ": "helak olmak",
    "أَهْلَكَ": "helak etmek",
    "نَجَا": "kurtulmak",
    "أَنجَى": "kurtarmak",
    "فَرَّقَ": "ayirmak, bolmek",
    "جَمَعَ": "toplamak, bir araya getirmek",
    "وَصَّى": "vasiyet etmek, tavsiye etmek",
    "بَشَّرَ": "mujdelemek",
    "أَنذَرَ": "uyarmak, korkutmak",
    "لَعَنَ": "lanetlemek",
    "مَكَرَ": "tuzak kurmak, hile yapmak",
    "كَادَ": "neredeyse yapmak",
    "شَاءَ": "dilemek, istemek",
    "قَدَرَ": "takdir etmek, olcmek",
    "سَخَّرَ": "boyun egdirmek, musahhar kilmak",
    "وَكَّلَ": "vekil kilmak",
    "سَأَلَ": "sormak, istemek",
    "دَعَا": "dua etmek, cagirmak",
    "اسْتَجَابَ": "icabet etmek, kabul etmek",
    "زَكَّى": "arindirmak, zekat vermek",
    "طَهَّرَ": "temizlemek",
    "حَاسَبَ": "hesaba cekmek",
    "وَزَنَ": "tartmak",
    "أَسْلَمَ": "teslim olmak, Musluman olmak",
    "فَرَّ": "kacmak",
    "لَبِثَ": "kalmak, beklemek",
    "بَلَغَ": "ulasmak, erismek",
    "حَلَّ": "helal olmak, inmek",
    "زَادَ": "artirmak, cogaltmak",
    "نَقَصَ": "eksiltmek, azaltmak",
    "مَدَّ": "uzatmak, yaymak",
    "وَسِعَ": "genislemek, kusatmak",
    "ضَاقَ": "daralmak",
    "بَنَى": "insa etmek, bina etmek",
    "أَسَّسَ": "temel atmak",
    "زَرَعَ": "ekmek (tohum)",
    "سَقَى": "sulamak, icirmek",
    "أَكَلَ": "yemek",
    "شَرِبَ": "icmek",
    "لَبِسَ": "giymek",
    "سَكَنَ": "oturmak, ikamet etmek",
    "مَشَى": "yuruemek",
    "رَكِبَ": "binmek",
    "سَبَحَ": "yuzmek",
    "طَارَ": "ucmak",
    "سَبَقَ": "gecmek, one gecmek",
    "لَحِقَ": "yetismek, kavusmak",
    "وَقَعَ": "meydana gelmek, dusmek",
    "صَنَعَ": "yapmak, imal etmek",
    "زَيَّنَ": "susmek, guzellesirmek",
    "أَحْسَنَ": "guzel yapmak, ihsan etmek",
    "أَسَاءَ": "kotu yapmak",
    "حَفِظَ": "korumak, hifzetmek",
    "نَسِيَ": "unutmak",
    "عَقَلَ": "akletmek, dusunmek",
    "فَقِهَ": "anlamak, kavramak",
    "شَعَرَ": "hissetmek, farkinda olmak",
    "خَشِيَ": "korkmak, cekinmek",
    "خَافَ": "korkmak",
    "رَجَا": "umit etmek",
    "طَمِعَ": "tamah etmek",
    "حَسَدَ": "kiskancmak, haset etmek",
    "أَحَبَّ": "sevmek",
    "كَرِهَ": "hos gormemek, kerhiat etmek",
    "فَرِحَ": "sevinmek",
    "حَزِنَ": "uzulmek",
    "بَكَى": "aglamak",
    "ضَحِكَ": "gulmek",
    "أَخَذَ": "almak, tutmak",
    "اتَّخَذَ": "edinmek, tutmak",
    "تَرَكَ": "birakmak, terk etmek",
    "وَضَعَ": "koymak, birakmak",
    "رَفَعَ": "yukkseltmek, kaldirmak",
    "رَدَّ": "geri cevirmek, reddetmek",
    "أَلْقَى": "atmak, birakivermek",
    "أَخْفَى": "gizlemek",
    "أَظْهَرَ": "aciga cikarmak",
    "أَبْدَى": "gostermek, aciklamak",
    "كَشَفَ": "acmak, ortmek kaldirmak",
    "سَتَرَ": "ortemek, gizlemek",
    "فَتَنَ": "fitneye dusurmek, sinamak",
    "بَلَا": "sinamak, denemek",
    "امْتَحَنَ": "sinamak, imtihan etmek",
    "وَعَظَ": "ogut vermek",
    "بَرَّ": "iyilik etmek",
    "وَفَّى": "tamamen odemek",
    "ابْتَغَى": "aramak, talep etmek",
    "حَرَصَ": "cok istemek, hirs etmek",
    "زَعَمَ": "iddia etmek",
    "ظَنَّ": "zannetmek, sanmak",
    "افْتَرَى": "iftira etmek",
    "اعْتَدَى": "haddi asmak, saldirmak",
    "أَسْرَفَ": "israf etmek",
    "بَغَى": "azginlik etmek, saldirmak",
    "تَكَبَّرَ": "buyuklenmek",
    "فَجَرَ": "gunah islemek, tug etmek",
    "وَلَّى": "yuz cevirmek, donmek",
    "بَدَلَ": "degistirmek",
    "حَوَّلَ": "dondurmek, cevirmek",
    "صَرَفَ": "cevirmek, yonlendirmek",
    "قَلَبَ": "cevirmek, dondurmek",
    "لَقِيَ": "karsilasmak, bulusmak",
    "جَزَى": "ceza/mukafat vermek",
    "وَفَى": "soze sadik kalmak",
    "أَخْلَفَ": "sozden donmek",
    "نَكَثَ": "bozmak (ahdi)",
    "عَاهَدَ": "ahitlesmek, sozlesmek",
    "تَقَبَّلَ": "kabul etmek",
    "مَنَعَ": "engellemek, yasaklamak",
    "حَالَ": "engel olmak",
    "أَعَادَ": "geri cevirmek, iade etmek",
    "كَلَّمَ": "konusmak",
    "نَطَقَ": "konusmak, soz soylemek",
    "تَلَا": "okumak, tilavet etmek",
    "قَرَأَ": "okumak",
    "فَسَّرَ": "aciklamak, tefsir etmek",
    "بَيَّنَ": "aciklamak, beyan etmek",
    "وَصَلَ": "ulasmak, baglamak",
    "قَطَعَ": "kesmek, koparmak",
    "شَفَعَ": "sefaat etmek",
    "شَفَى": "sifa vermek",
    "أَوْحَى": "vahyetmek, bildirmek",
    "نَبَّأَ": "haber vermek",
    "أَخْبَرَ": "haber vermek",
    "عَلَّمَ": "ogretmek",
    "فَهِمَ": "anlamak",
    "ذَرَأَ": "yaratmak, cogaltmak",
    "بَرَأَ": "yaratmak (yoktan)",
    "صَوَّرَ": "sekil vermek, suret vermek",
    "فَطَرَ": "yaratmak (ilk kez)",
    "أَنشَأَ": "olusturmak, insa etmek",
    "دَبَّرَ": "idare etmek, yonetmek",
    "مَلَكَ": "sahip olmak, hukmetmek",
    "حَكَّمَ": "hakem kilmak",
    "قَضَى": "hukmetmek, karar vermek",
    "فَصَلَ": "ayirmak, hukum vermek",
    "سَبَّبَ": "sebep olmak",
    "مَهَّدَ": "duzeltmek, hazirlamak",
    "يَسَّرَ": "kolaylastirmak",
    "عَسُرَ": "zorlastirmak",
    "وَسْوَسَ": "vesvese vermek",
    "غَوَى": "azdirmak, yoldan cikarmak",
    "أَضَلَّ": "saptirmak",
    "هَدَّدَ": "tehdit etmek",
    "ابْتَلَى": "sinamak, imtihan etmek",
    "اسْتَقَامَ": "dosdogru olmak",
    "أَسْرَعَ": "acele etmek",
    "اسْتَعْجَلَ": "acele istemek",
    "تَنَزَّلَ": "indirmek, inmek",
    "نَزَّلَ": "peyderpey indirmek",
    "كَلَّفَ": "yuklemek, sorumluluk vermek",
    "حَمَلَ": "tasimak, yuklemek",
    "وَلَدَ": "dogmak, dogurmak",
    "نَكَحَ": "evlenmek, nikah kilmak",
    "طَلَّقَ": "bosanmak",
    "زَنَى": "zina etmek",
    "سَرَقَ": "calmak",
    "قَذَفَ": "iftira atmak",
    "شَهِدَ": "sahit olmak, taniklik etmek",
    "أَقْسَمَ": "yemin etmek",
    "حَلَفَ": "yemin etmek",
    "نَذَرَ": "adak adamak",
    "صَدَّ": "engellemek, alkoymak",
    "أَعْرَضَ": "yuz cevirmek",
    "لَهَا": "oyalanmak, eglenmek",
    "لَعِبَ": "oynamak, oyun oynamak",
    # --- Isim-i Fail (ACT_PCPL) ---
    "مالِك": "sahip olan, malik",
    "مُسْتَقِيم": "dosdogru",
    "ضالّ": "sapkin, yolunu yitirmis",
    "مُتَّقي": "takva sahibi, sakinian",
    "مُفْلِح": "kurtulan, felaha eren",
    "مُؤْمِن": "inanan, muemin",
    "مُصْلِح": "islah eden, duezelten",
    "مُفْسِد": "bozguncu",
    "مُسْتَهْزِء": "alay eden",
    "مُهْتَدي": "hidayete ermis",
    "كافِر": "inkar eden, kafir",
    "مُنافِق": "ikiyuzlu, muenafik",
    "فاسِق": "yoldan cikmis, fasik",
    "ظالِم": "zulmeden, zalim",
    "مُشْرِك": "ortak kosan, muesrik",
    "صالِح": "iyi, salih",
    "صادِق": "dogruyu soyleyen, sadik",
    "كاذِب": "yalanci",
    "عالِم": "bilen, alim",
    "حاكِم": "huekmeden, hakim",
    "شاهِد": "sahit, tanik",
    "ناصِر": "yardimci",
    "حافِظ": "koruyucu, hafiz",
    "قادِر": "guec yetiren, kadir",
    "خالِق": "yaratan, halik",
    "رازِق": "rizik veren",
    "غافِر": "bagislayan",
    "وارِث": "miras alan, varis",
    "سامِع": "isiten",
    "باصِر": "goren",
    "عَلِيم": "hakkiyla bilen",
    "حَكِيم": "hikmet sahibi",
    "رَحِيم": "cok merhametli",
    "رَحْمٰن": "cok esirgeyen",
    "غَفُور": "cok bagislayan",
    "شَكُور": "cok sukreden",
    "صَبُور": "cok sabreden",
    "وَدُود": "cok seven",
    "كَرِيم": "cok comert, kerim",
    "عَظِيم": "buyuk, azim",
    "حَلِيم": "yumusak huylu, halim",
    "قَدِير": "kudreti sonsuz",
    "كَبِير": "buyuk",
    "صَغِير": "kucuk",
    "قَلِيل": "az",
    "كَثِير": "cok",
    "طَوِيل": "uzun",
    "قَرِيب": "yakin",
    "بَعِيد": "uzak",
    "جَدِيد": "yeni",
    "قَدِيم": "eski",
    "شَدِيد": "siddetli, sert",
    "سَمِيع": "cok isiten",
    "بَصِير": "cok goren",
    "خَبِير": "haberdar olan",
    "لَطِيف": "lutuf sahibi, ince bilen",
    "وَكِيل": "vekil, guvenilen",
    "وَلِيّ": "dost, veli",
    "نَصِير": "yardimci",
    "مَوْلَى": "sahip, efendi, dost",
    "سُلْطان": "huccet, kanit, otorite",
    "مُنَافِق": "ikiyuzlu, munafik",
    # --- Isim-i Meful (PASS_PCPL) ---
    "مَغْضُوب": "gazaba ugramis",
    "مُطَهَّرَة": "temizlenmis, pak",
    "مُسْتَقَرّ": "karar kilinis yeri",
    "مُسَلَّمَة": "teslim edilmis, kusursuz",
    "مَعْدُودَة": "sayili, sinirli",
    "مُحَرَّم": "haram kilinmis, yasaklanmis",
    "مُسَخَّر": "boyun egdirilmis",
    "مَعْرُوف": "bilinen, iyi",
    "مَحِيض": "aybasin donemi",
    "مُطَلَّقَة": "bosanmis kadin",
    "مَكْتُوب": "yazilmis",
    "مَحْفُوظ": "korunmus",
    "مَلْعُون": "lanetlenmis",
    "مَرْجُوم": "taslanmis",
    "مَنْصُور": "yardim edimis, muzaffer",
    "مَظْلُوم": "zulme ugramis",
    "مَرْزُوق": "riziklandirilmis",
    "مَعْلُوم": "bilinen, belli",
    "مَجْهُول": "bilinmeyen",
    "مَسْحُور": "buyulenmis",
    "مَرْحُوم": "rahmet edilmis",
    "مُبارَك": "bereketli, mubarek",
    "مُكَرَّم": "sereflendirilmis",
    "مَذْكُور": "anilan, zikredilen",
    "مُبِين": "apacik, belgeleyen",
    # --- Mastar (VN) ---
    "طُغْيان": "azginlik, taskinlik",
    "حَذَر": "korku, tedbirlilik",
    "اتِّخاذ": "edinme, tutma",
    "قَوْل": "soz",
    "إِحْسان": "iyilik, guzellik",
    "إِخْراج": "cikarma",
    "إِيمان": "iman, inanc",
    "مَثُوبَة": "sevap, mukafat",
    "شِقاق": "ayrilik, carpisma",
    "تَقَلُّب": "donup dolasma",
    "عِبادَة": "ibadet, kulluk",
    "هِداية": "hidayet, yol gosterme",
    "رَحْمَة": "rahmet, merhamet",
    "نِعْمَة": "nimet",
    "عَذاب": "azap, ceza",
    "عِلْم": "bilgi, ilim",
    "حِكْمَة": "hikmet",
    "كِتاب": "kitap",
    "حِساب": "hesap",
    "مِيزان": "terazi, olcu",
    "صِراط": "yol",
    "سَبِيل": "yol",
    "فِتْنَة": "fitne, sinav",
    "تَوْبَة": "tovbe",
    "مَغْفِرَة": "bagislanma",
    "شَفاعَة": "sefaat",
    "أَمْر": "is, emir",
    "نَهْي": "yasak, nehiy",
    "وَعْد": "vaat, soz",
    "وَعِيد": "tehdit, uyari",
    "حَقّ": "hak, gercek",
    "باطِل": "batil, bos",
    "صِدْق": "dogruluk",
    "كَذِب": "yalan",
    "عَدْل": "adalet",
    "ظُلْم": "zulum",
    "فَضْل": "lutuf, fazilet",
    "شُكْر": "sukur",
    "صَبْر": "sabir",
    "تَوَكُّل": "tevekkul, guvenme",
    "ذِكْر": "anis, zikir",
    "دُعاء": "dua",
    "صَلاة": "namaz, dua",
    "زَكاة": "zekat, arinma",
    "صَوْم": "oruc",
    "حَجّ": "hac",
    "جِهاد": "cihad, mucadele",
    "هِجْرَة": "hicret, goc",
    "طاعَة": "itaat",
    "مَعْصِيَة": "gunah, isyan",
    "رِزْق": "rizik, gecimlik",
    "مال": "mal, servet",
    "تِجارَة": "ticaret",
    "رِبا": "faiz",
    "صَدَقَة": "sadaka",
    "خَلْق": "yaratma, yaratilis",
    "مَوْت": "olum",
    "حَياة": "hayat",
    "بَعْث": "dirilis",
    "نُشُور": "dirilis, yayilis",
    "حَشْر": "toplanma",
    "جَنَّة": "cennet",
    "نار": "ates, cehennem",
    "سِحْر": "buyu, sihir",
    "بَيْع": "satis",
    "شِرَاء": "satin alma",
    "نِكاح": "nikah, evlilik",
    "طَلاق": "bosanma",
    "إِنفاق": "harcama, infak",
    "إِسْلام": "Islam, teslim olma",
    "كُفْر": "inkar, nankorluk",
    "شِرْك": "sirk, ortak kosma",
    "نِفاق": "ikiyuzluluk, nifak",
    "فِسْق": "yoldan cikma, gunahkarlik",
    "تَبْذِير": "savurganluk",
    "إِسْراف": "israf",
    "تَكْذِيب": "yalanlama",
    "تَصْدِيق": "dogrulama",
    "تَنْزِيل": "indirme, tenzil",
    "تَفْسِير": "aciklama, tefsir",
    "تَأْوِيل": "yorum, tevil",
    "تَسْبِيح": "tesbih, yuceltme",
    "تَحْرِيم": "haram kilma",
    "تَحْلِيل": "helal kilma",
    "تَقْدِير": "takdir, olcme",
    "خِلافَة": "halifelik",
    "أَمانَة": "emanet, guvenilirlik",
    "خِيانَة": "ihanet",
    "بَيِّنَة": "acik delil, belgey",
    "آيَة": "ayet, isaret",
    "بُرْهان": "kesin delil",
    "حُجَّة": "kanit, huccet",
    "مُعْجِزَة": "mucize",
    "وَحْي": "vahiy",
    "رِسالَة": "risalet, mesaj",
    "نُبُوَّة": "nebilik, peygamberlik",
    # --- Ozel Isimler ---
    "اللَّه": "Allah",
    "إِبْراهِيم": "Ibrahim",
    "مُوسَى": "Musa",
    "عِيسَى": "Isa",
    "مُحَمَّد": "Muhammed",
    "مَرْيَم": "Meryem",
    "آدَم": "Adem",
    "نُوح": "Nuh",
    "إِسْماعِيل": "Ismail",
    "إِسْحاق": "Ishak",
    "يَعْقُوب": "Yakub",
    "يُوسُف": "Yusuf",
    "داوُود": "Davud",
    "سُلَيْمان": "Suleyman",
    "أَيُّوب": "Eyyub",
    "يُونُس": "Yunus",
    "هارُون": "Harun",
    "زَكَرِيَّا": "Zekeriyya",
    "يَحْيَى": "Yahya",
    "إِلْياس": "Ilyas",
    "اليَسَع": "Elyesa",
    "ذَا ٱلْكِفْل": "Zulkifl",
    "لُوط": "Lut",
    "صالِح": "Salih",
    "هُود": "Hud",
    "شُعَيْب": "Suayb",
    "إِدْرِيس": "Idris",
    "ذَا ٱلنُّون": "Zunnun (Yunus)",
    "فِرْعَوْن": "Firavun",
    "قارُون": "Karun",
    "هامان": "Haman",
    "جالُوت": "Calut",
    "طالُوت": "Talut",
    "إِبْلِيس": "Iblis",
    "جِبْرِيل": "Cebrail",
    "مِيكال": "Mikail",
    "لُقْمان": "Lokman",
    "ذُو ٱلْقَرْنَيْن": "Zulkarneyn",
    "تُبَّع": "Tubba",
    "ثَمُود": "Semud kavmi",
    "عاد": "Ad kavmi",
    "مَدْيَن": "Medyen",
    "بَابِل": "Babil",
    "مِصْر": "Misir",
    "مَكَّة": "Mekke",
    "يَثْرِب": "Yesrib (Medine)",
    "بَدْر": "Bedir",
    "أُحُد": "Uhud",
    "حُنَيْن": "Huneyn",
    "سَبَأ": "Sebe",
    "إِرَم": "Irem",
    "لَظَى": "Leza (cehennem tabakasi)",
    "سَقَر": "Sekar (cehennem tabakasi)",
    "جَهَنَّم": "cehennem",
    "كَوْثَر": "Kevser",
    "سَلْسَبِيل": "Selsebil (cennet pınari)",
    "تَسْنِيم": "Tesnim (cennet icecegi)",
    "سِجِّيل": "pismis balcik",
    "سِجِّين": "Siccin (cehennem defteri)",
    "عِلِّيُّون": "Illiyyun (cennet defteri)",
    "طُوبَى": "Tuba (cennet agaci)",
    "زَقُّوم": "Zakkum (cehennem agaci)",
    "حَنِيف": "hakka yonelen, hanif",
    # --- Diger onemli kelimeler ---
    "مَلَك": "melek",
    "جِنّ": "cin",
    "شَيْطان": "seytan",
    "إِنسان": "insan",
    "بَشَر": "insan, beser",
    "نَفْس": "can, nefis, oz",
    "قَلْب": "kalp, gonul",
    "عَقْل": "akil",
    "رُوح": "ruh",
    "عَيْن": "goz, kaynak, pinar",
    "أُذُن": "kulak",
    "يَد": "el",
    "وَجْه": "yuz",
    "سَماء": "gok, gokyuzu",
    "أَرْض": "yer, dunya",
    "شَمْس": "gunes",
    "قَمَر": "ay",
    "نَجْم": "yildiz",
    "كَوْكَب": "gezegen, parlak yildiz",
    "لَيْل": "gece",
    "نَهار": "gunduz",
    "يَوْم": "gun",
    "شَهْر": "ay (takvim)",
    "سَنَة": "yil",
    "دَهْر": "cag, uzun sure",
    "بَحْر": "deniz",
    "نَهْر": "nehir, irmak",
    "جَبَل": "dag",
    "شَجَرَة": "agac",
    "ماء": "su",
    "تُراب": "toprak",
    "حَجَر": "tas",
    "حَدِيد": "demir",
    "ذَهَب": "altin",
    "فِضَّة": "gumus",
    "ثَوْب": "elbise, giysi",
    "طَعام": "yemek, gida",
    "لَحْم": "et",
    "لَبَن": "sut",
    "عَسَل": "bal",
    "خَمْر": "sarap, icki",
    "فاكِهَة": "meyve",
    "زَيْتُون": "zeytin",
    "نَخْل": "hurma agaci",
    "عِنَب": "uzum",
    "رُمَّان": "nar",
    "تِين": "incir",
    "حَبّ": "tohum, dane",
    "وَرَق": "yaprak",
    "زَهْرَة": "cicek",
    "بَقَرَة": "inek, sigir",
    "جَمَل": "deve",
    "فَرَس": "at",
    "حِمار": "esek",
    "بَغْل": "katir",
    "كَلْب": "kopek",
    "أَسَد": "arslan",
    "ذِئْب": "kurt",
    "حُوت": "balina, buyuk balik",
    "نَمْل": "karinca",
    "نَحْل": "ari",
    "عَنكَبُوت": "orumcek",
    "ذُبَاب": "sinek",
    "بَعُوضَة": "sivrisinek",
    "طَيْر": "kus",
    "غُراب": "karga",
    "هُدْهُد": "hudhud kusu",
    "سَمَك": "balik",
    "دابَّة": "canli varlık",
    "أُمَّة": "ummet, topluluk",
    "قَوْم": "kavim, topluluk",
    "مِلَّة": "din, inanc sistemi",
    "شَرِيعَة": "seriat, yol",
    "مِنْهاج": "yontem, yol",
    "سُنَّة": "gelenek, kanun",
    "عُرْف": "orfen bilinen, adet",
    "مُنكَر": "kotu, cirkin",
    "حَسَنَة": "iyilik, guzellik",
    "سَيِّئَة": "kotuluk, gunah",
    "ثَواب": "sevap, mukafat",
    "عِقاب": "ceza",
    "مَسْجِد": "mescid, cami",
    "قِبْلَة": "kible, yon",
    "مِنبَر": "minber",
    "مِحْراب": "mihrab",
    "كَعْبَة": "Kabe",
    "عَرْش": "ars, taht",
    "كُرْسِيّ": "kursi, taht",
    "جِسْر": "kopru",
    "مِيثاق": "ahit, sozlesme",
    "عَهْد": "ahit, soz",
    "يَمِين": "yemin, sag",
    "شِمال": "sol",
    "فَوْق": "ust, ustte",
    "تَحْت": "alt, altta",
    "أَمام": "on, onde",
    "وَراء": "arka, arkada",
    "بَيْن": "arasi, aralarinda",
    "مِثْل": "ornek, benzer",
    "غَيْر": "baska, disinda",
}

# ======================================================================
# GRAMER KALIPLARINA GORE OTOMATIK ANLAM URETICI
# ======================================================================

def get_morph_data():
    """Morphology dosyasindan her (root, lemma) icin gramer bilgisi cikar."""
    morph = {}
    root_p = re.compile(r'ROOT:([^\|]+)')
    lem_p = re.compile(r'LEM:([^\|]+)')
    vf_p = re.compile(r'VF:(\d+)')
    
    with open(MORPH_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            parts = line.split('\t')
            if len(parts) < 4: continue
            form_type = parts[2]  # N or V
            props = parts[3]
            
            rm = root_p.search(props)
            lm = lem_p.search(props)
            if not (rm and lm): continue
            
            root = rm.group(1)
            lemma = lm.group(1)
            key = (root, lemma)
            
            if key in morph:
                continue
            
            vf = vf_p.search(props)
            verb_form = int(vf.group(1)) if vf else 0
            
            tags = set()
            for tag in ['ACT_PCPL', 'PASS_PCPL', 'VN', 'ADJ', 'PN', 'PERF', 'IMPF', 'IMPV', 'PASS']:
                if tag in props:
                    tags.add(tag)
            
            morph[key] = {
                'form_type': form_type,
                'verb_form': verb_form,
                'tags': tags,
                'props': props
            }
    
    return morph

# Fiil formu aciklamalari
VF_TEMPLATES = {
    1: "",                    # Temel form
    2: "cokca/siddete ",      # Tef'il
    3: "karsilikli ",         # Mufaale
    4: "",                    # If'al (causative)
    5: "kendi kendine ",      # Tefaul
    6: "karsilikli ",         # Tefaul
    7: "",                    # Infial (passive)
    8: "",                    # Iftial
    10: "",                   # Istif'al
}

def generate_meaning(word, root, root_meaning, morph_info):
    """Gramer bilgisine gore Turkce anlam uret."""
    
    # 1. Override sozlukte varsa direkt don
    if word in OVERRIDE_DICT:
        return OVERRIDE_DICT[word]
    
    if not morph_info:
        return root_meaning  # Fallback: kok anlamini kullan
    
    tags = morph_info['tags']
    form_type = morph_info['form_type']
    vf = morph_info['verb_form']
    
    # Kok anlaminin ilk kelimesini al (kisa form icin)
    base = root_meaning.split(',')[0].strip()
    
    # 2. Ozel isim
    if 'PN' in tags:
        if word in OVERRIDE_DICT:
            return OVERRIDE_DICT[word]
        return word  # Arapca ismi koru
    
    # 3. Fiil
    if form_type == 'V' or 'PERF' in tags or 'IMPF' in tags or 'IMPV' in tags:
        if 'PASS' in tags:
            return f"{base} edilmek/olunmak"
        
        if vf == 1:
            return f"{base} etmek/olmak"
        elif vf == 2:
            return f"{base} ettirmek, cokca {base} etmek"
        elif vf == 3:
            return f"karsilikli {base} etmek"
        elif vf == 4:
            return f"{base} ettirmek"
        elif vf == 5:
            return f"{base} olma, {base} edinme"
        elif vf == 6:
            return f"karsilikli {base} olma"
        elif vf == 7:
            return f"{base} edilmek"
        elif vf == 8:
            return f"{base} edinmek, {base} olmak"
        elif vf == 10:
            return f"{base} istemek, {base} dilemek"
        return f"{base} etmek"
    
    # 4. Isim-i Fail (Active Participle)
    if 'ACT_PCPL' in tags:
        if vf == 1:
            return f"{base} eden/olan"
        elif vf == 2:
            return f"cokca {base} eden"
        elif vf == 3:
            return f"{base} edisen"
        elif vf == 4:
            return f"{base} ettiren"
        elif vf == 5:
            return f"{base} olan"
        elif vf == 8:
            return f"{base} edinen"
        elif vf == 10:
            return f"{base} isteyen"
        return f"{base} eden"
    
    # 5. Isim-i Meful (Passive Participle)
    if 'PASS_PCPL' in tags:
        if vf == 1:
            return f"{base} edilen/olunan"
        elif vf == 2:
            return f"{base} ettirilen"
        return f"{base} edilmis"
    
    # 6. Mastar (Verbal Noun)
    if 'VN' in tags:
        if vf == 1:
            return f"{base} etme/olma"
        elif vf == 2:
            return f"{base} ettirme"
        elif vf == 4:
            return f"{base} ettirme"
        elif vf == 5:
            return f"{base} olma"
        elif vf == 8:
            return f"{base} edinme"
        elif vf == 10:
            return f"{base} isteme"
        return f"{base} etme"
    
    # 7. Sifat
    if 'ADJ' in tags:
        return base
    
    # 8. Genel isim - kok anlamini kullan
    return root_meaning

def main():
    print("Morphology dosyasi okunuyor...")
    morph = get_morph_data()
    print(f"  {len(morph)} kelime-gramer eslemesi")
    
    db = sqlite3.connect(DB_PATH)
    
    # Kok anlamlari
    root_meanings = {}
    for root, mtr in db.execute("SELECT root, meaning_tr FROM roots"):
        root_meanings[root] = mtr
    
    # Anlami bos turevler
    empty_rows = db.execute("""
        SELECT id, root, word FROM derived_words 
        WHERE meaning_tr IS NULL OR TRIM(meaning_tr) = ''
        ORDER BY root, word
    """).fetchall()
    
    print(f"  {len(empty_rows)} bos anlam doldurulacak")
    print()
    
    updated = 0
    samples = []
    for row_id, root, word in empty_rows:
        root_meaning = root_meanings.get(root, '')
        morph_info = morph.get((root, word), None)
        
        meaning = generate_meaning(word, root, root_meaning, morph_info)
        
        if meaning:
            db.execute("UPDATE derived_words SET meaning_tr=? WHERE id=?", (meaning, row_id))
            updated += 1
            if len(samples) < 30:
                tag_str = ','.join(morph_info['tags']) if morph_info else 'N/A'
                samples.append(f"  {word:20s} kok={root:6s} -> {meaning:40s} [{tag_str}]")
    
    db.commit()
    
    print(f"  {updated}/{len(empty_rows)} anlam uretildi")
    print()
    print("  ORNEKLER:")
    for s in samples:
        print(s)
    
    # Dogrulama
    remaining = db.execute("SELECT COUNT(*) FROM derived_words WHERE meaning_tr IS NULL OR TRIM(meaning_tr)=''").fetchone()[0]
    total = db.execute("SELECT COUNT(*) FROM derived_words").fetchone()[0]
    print(f"\n  Toplam: {total}, Dolu: {total-remaining}, Bos: {remaining}")
    
    db.close()

if __name__ == '__main__':
    main()
