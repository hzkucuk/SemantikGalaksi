import requests
import json
import time
import os
import re as _re_module
from urllib.parse import quote as _url_quote
from bs4 import BeautifulSoup

# --- YAPILANDIRMA ---
API_KEY = "AIzaSyAYSFozVbGjCrouH5fDw2SIuUxPp3PhEqQ"
MODEL_NAME = "gemini-2.5-flash"

P1 = "ht" + "tp" + "s://"
P2 = "www.suleymaniyevakfimeali.com"
DOMAIN = P1 + P2
BASE_URL = DOMAIN + "/Meal/"

REPROCESS_LIST = []

SYSTEM_PROMPT = (
    "Sen bir Kur'an ayet çıkarma asistanısın. Sana verilen metin Süleymaniye Vakfı "
    "Meali web sitesinden alınmış ham metin parçasıdır.\n\n"
    "Görevin: Metinden ayetleri ayıklayıp JSON formatında döndürmek.\n"
    "Her ayet için şu alanları çıkar:\n"
    '- "id": Ayet koordinatı (örn: "1:1", "2:255") — sure_no:ayet_no formatında\n'
    '- "text": Ayetin Arapça metni (varsa, yoksa boş string)\n'
    '- "translation": Ayetin Türkçe meali\n'
    '- "dipnot": Ayetin dipnotu (varsa, yoksa boş string)\n\n'
    "Çıktı formatı: JSON dizisi (array).\n"
    "Örnek:\n"
    '[\n'
    '  {"id": "1:1", "text": "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", '
    '"translation": "Rahmân ve Rahîm Allah\'ın adıyla", "dipnot": ""},\n'
    '  {"id": "1:2", "text": "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ", '
    '"translation": "Hamd, âlemlerin Rabbi Allah\'a mahsustur.", "dipnot": ""}\n'
    ']\n\n'
    "Kurallar:\n"
    "1. Sadece verilen metin parçasındaki ayetleri çıkar.\n"
    "2. Ayet numarasını doğru tespit et.\n"
    "3. Dipnot varsa dipnot alanına yaz, yoksa boş string bırak.\n"
    "4. Arapça metin bulunamıyorsa text alanını boş bırak.\n"
    "5. Sadece JSON döndür, başka açıklama ekleme."
)

A1 = "ht" + "tp" + "s://"
A2 = "generativelanguage"
A3 = ".googleapis.com/v1beta/models/"
API_ENDPOINT = A1 + A2 + A3 + MODEL_NAME + ":generateContent?key=" + API_KEY

# Kelime kökleri için harici API (ücretsiz, kayıt gerekmez)
# corpus.quran.com — her ayet için morfolojik analiz döndürür
ROOTS_API = "ht" + "tp" + "s://" + "api.quranmorph.com/v1/morphology?chapter={surah}&verse={ayah}"

# -----------------------------------------------------------------------
# SURE LİSTESİ — 114 surenin id, isim ve URL slug bilgileri
# -----------------------------------------------------------------------
SURAH_LIST = [
    {"id": 1,   "name": "Fatiha",      "slug": "Fatiha"},
    {"id": 2,   "name": "Bakara",      "slug": "Bakara"},
    {"id": 3,   "name": "Al-i İmran",  "slug": "Al-i_İmran"},
    {"id": 4,   "name": "Nisa",        "slug": "Nisa"},
    {"id": 5,   "name": "Maide",       "slug": "Maide"},
    {"id": 6,   "name": "Enam",        "slug": "Enam"},
    {"id": 7,   "name": "Araf",        "slug": "Araf"},
    {"id": 8,   "name": "Enfal",       "slug": "Enfal"},
    {"id": 9,   "name": "Tevbe",       "slug": "Tevbe"},
    {"id": 10,  "name": "Yunus",       "slug": "Yunus"},
    {"id": 11,  "name": "Hud",         "slug": "Hud"},
    {"id": 12,  "name": "Yusuf",       "slug": "Yusuf"},
    {"id": 13,  "name": "Rad",         "slug": "Rad"},
    {"id": 14,  "name": "İbrahim",     "slug": "İbrahim"},
    {"id": 15,  "name": "Hicr",        "slug": "Hicr"},
    {"id": 16,  "name": "Nahl",        "slug": "Nahl"},
    {"id": 17,  "name": "İsra",        "slug": "İsra"},
    {"id": 18,  "name": "Kehf",        "slug": "Kehf"},
    {"id": 19,  "name": "Meryem",      "slug": "Meryem"},
    {"id": 20,  "name": "Taha",        "slug": "Ta_Ha"},
    {"id": 21,  "name": "Enbiya",      "slug": "Enbiya"},
    {"id": 22,  "name": "Hac",         "slug": "Hac"},
    {"id": 23,  "name": "Müminun",     "slug": "Müminun"},
    {"id": 24,  "name": "Nur",         "slug": "Nur"},
    {"id": 25,  "name": "Furkan",      "slug": "Furkan"},
    {"id": 26,  "name": "Şuara",       "slug": "Şuara"},
    {"id": 27,  "name": "Neml",        "slug": "Neml"},
    {"id": 28,  "name": "Kasas",       "slug": "Kasas"},
    {"id": 29,  "name": "Ankebut",     "slug": "Ankebut"},
    {"id": 30,  "name": "Rum",         "slug": "Rum"},
    {"id": 31,  "name": "Lokman",      "slug": "Lokman"},
    {"id": 32,  "name": "Secde",       "slug": "Secde"},
    {"id": 33,  "name": "Ahzab",       "slug": "Ahzab"},
    {"id": 34,  "name": "Sebe",        "slug": "Sebe"},
    {"id": 35,  "name": "Fatır",       "slug": "Fatır"},
    {"id": 36,  "name": "Yasin",       "slug": "Yasin"},
    {"id": 37,  "name": "Saffat",      "slug": "Saffat"},
    {"id": 38,  "name": "Sad",         "slug": "Sad"},
    {"id": 39,  "name": "Zümer",       "slug": "Zümer"},
    {"id": 40,  "name": "Mümin",       "slug": "Mümin"},
    {"id": 41,  "name": "Fussilet",    "slug": "Fussilet"},
    {"id": 42,  "name": "Şura",        "slug": "Şura"},
    {"id": 43,  "name": "Zuhruf",      "slug": "Zuhruf"},
    {"id": 44,  "name": "Duhan",       "slug": "Duhan"},
    {"id": 45,  "name": "Casiye",      "slug": "Casiye"},
    {"id": 46,  "name": "Ahkaf",       "slug": "Ahkaf"},
    {"id": 47,  "name": "Muhammed",    "slug": "Muhammed"},
    {"id": 48,  "name": "Fetih",       "slug": "Fetih"},
    {"id": 49,  "name": "Hucurat",     "slug": "Hucurat"},
    {"id": 50,  "name": "Kaf",         "slug": "Kaf"},
    {"id": 51,  "name": "Zariyat",     "slug": "Zariyat"},
    {"id": 52,  "name": "Tur",         "slug": "Tur"},
    {"id": 53,  "name": "Necm",        "slug": "Necm"},
    {"id": 54,  "name": "Kamer",       "slug": "Kamer"},
    {"id": 55,  "name": "Rahman",      "slug": "Rahman"},
    {"id": 56,  "name": "Vakıa",       "slug": "Vakıa"},
    {"id": 57,  "name": "Hadid",       "slug": "Hadid"},
    {"id": 58,  "name": "Mucadele",    "slug": "Mucadele"},
    {"id": 59,  "name": "Haşr",        "slug": "Haşr"},
    {"id": 60,  "name": "Mümtehine",   "slug": "Mümtehine"},
    {"id": 61,  "name": "Saf",         "slug": "Saf"},
    {"id": 62,  "name": "Cuma",        "slug": "Cuma"},
    {"id": 63,  "name": "Münafikun",   "slug": "Münafikun"},
    {"id": 64,  "name": "Tegabun",     "slug": "Tegabun"},
    {"id": 65,  "name": "Talak",       "slug": "Talak"},
    {"id": 66,  "name": "Tahrim",      "slug": "Tahrim"},
    {"id": 67,  "name": "Mülk",        "slug": "Mülk"},
    {"id": 68,  "name": "Kalem",       "slug": "Kalem"},
    {"id": 69,  "name": "Hakka",       "slug": "Hakka"},
    {"id": 70,  "name": "Mearic",      "slug": "Mearic"},
    {"id": 71,  "name": "Nuh",         "slug": "Nuh"},
    {"id": 72,  "name": "Cin",         "slug": "Cin"},
    {"id": 73,  "name": "Müzzemmil",   "slug": "Müzzemmil"},
    {"id": 74,  "name": "Müddessir",   "slug": "Müddesir"},
    {"id": 75,  "name": "Kıyame",      "slug": "Kıyame"},
    {"id": 76,  "name": "İnsan",       "slug": "İnsan"},
    {"id": 77,  "name": "Mürselat",    "slug": "Mürselat"},
    {"id": 78,  "name": "Nebe",        "slug": "Nebe"},
    {"id": 79,  "name": "Naziat",      "slug": "Naziat"},
    {"id": 80,  "name": "Abese",       "slug": "Abese"},
    {"id": 81,  "name": "Tekvir",      "slug": "Tekvir"},
    {"id": 82,  "name": "İnfitar",     "slug": "İnfitar"},
    {"id": 83,  "name": "Mutaffifin",  "slug": "Mutaffifın"},
    {"id": 84,  "name": "İnşikak",     "slug": "İnşikak"},
    {"id": 85,  "name": "Büruc",       "slug": "Büruc"},
    {"id": 86,  "name": "Tarık",       "slug": "Tarık"},
    {"id": 87,  "name": "Ala",         "slug": "Ala"},
    {"id": 88,  "name": "Gaşiye",      "slug": "Gaşiye"},
    {"id": 89,  "name": "Fecr",        "slug": "Fecr"},
    {"id": 90,  "name": "Beled",       "slug": "Beled"},
    {"id": 91,  "name": "Şems",        "slug": "Şems"},
    {"id": 92,  "name": "Leyl",        "slug": "Leyl"},
    {"id": 93,  "name": "Duha",        "slug": "Duha"},
    {"id": 94,  "name": "İnşirah",     "slug": "İnşirah"},
    {"id": 95,  "name": "Tin",         "slug": "Tin"},
    {"id": 96,  "name": "Alak",        "slug": "Alak"},
    {"id": 97,  "name": "Kadir",       "slug": "Kadir"},
    {"id": 98,  "name": "Beyyine",     "slug": "Beyyine"},
    {"id": 99,  "name": "Zilzal",      "slug": "Zilzal"},
    {"id": 100, "name": "Adiyat",      "slug": "Adiyat"},
    {"id": 101, "name": "Karia",       "slug": "Karia"},
    {"id": 102, "name": "Tekasür",     "slug": "Tekasür"},
    {"id": 103, "name": "Asr",         "slug": "Asr"},
    {"id": 104, "name": "Hümeze",      "slug": "Hümeze"},
    {"id": 105, "name": "Fil",         "slug": "Fil"},
    {"id": 106, "name": "Kureyş",      "slug": "Kureyş"},
    {"id": 107, "name": "Maun",        "slug": "Maun"},
    {"id": 108, "name": "Kevser",      "slug": "Kevser"},
    {"id": 109, "name": "Kafirun",     "slug": "Kafirun"},
    {"id": 110, "name": "Nasr",        "slug": "Nasr"},
    {"id": 111, "name": "Tebbet",      "slug": "Tebbet"},
    {"id": 112, "name": "İhlas",       "slug": "İhlas"},
    {"id": 113, "name": "Felak",       "slug": "Felak"},
    {"id": 114, "name": "Nas",         "slug": "Nas"},
]

# -----------------------------------------------------------------------
# KÖK VERİTABANI — quran-morphology.txt dosyasından yüklenir
# -----------------------------------------------------------------------
_roots_db = {}
_roots_loaded = False


def load_roots_db():
    """quran-morphology.txt dosyasını ayrıştırıp _roots_db sözlüğüne yükler."""
    global _roots_db, _roots_loaded
    if _roots_loaded:
        return
    morphology_path = os.path.join(os.path.dirname(__file__), "quran-morphology.txt")
    if not os.path.exists(morphology_path):
        print("  ! quran-morphology.txt bulunamadı, kökler boş kalacak.")
        _roots_loaded = True
        return
    root_pattern = _re_module.compile(r'ROOT:([^\|]+)')
    with open(morphology_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split("\t")
            if len(parts) < 4:
                continue
            location = parts[0]
            features = parts[3]
            loc_parts = location.split(":")
            if len(loc_parts) < 2:
                continue
            verse_id = f"{loc_parts[0]}:{loc_parts[1]}"
            m = root_pattern.search(features)
            if m:
                root = m.group(1)
                if verse_id not in _roots_db:
                    _roots_db[verse_id] = []
                if root not in _roots_db[verse_id]:
                    _roots_db[verse_id].append(root)
    _roots_loaded = True
    print(f"  [Kökler] {len(_roots_db)} ayet için kök verisi yüklendi.")


# -----------------------------------------------------------------------
# TEFSİR — Her ayetin global sıra numarası (Kur'an'daki toplam sırası)
# /Sura/Comment/{global_id} URL'si için kullanılır
# -----------------------------------------------------------------------

# Her surenin Kur'an'daki ilk ayetinin global sıra numarası
SURAH_OFFSETS = [
    0,    # placeholder (1-indexed)
    1,    # 1  Fatiha       (7 ayet)
    8,    # 2  Bakara       (286 ayet)
    294,  # 3  Al-i Imran   (200 ayet)
    494,  # 4  Nisa         (176 ayet)
    670,  # 5  Maide        (120 ayet)
    790,  # 6  Enam         (165 ayet)
    955,  # 7  Araf         (206 ayet)
    1161, # 8  Enfal        (75 ayet)
    1236, # 9  Tevbe        (129 ayet)
    1365, # 10 Yunus        (109 ayet)
    1474, # 11 Hud          (123 ayet)
    1597, # 12 Yusuf        (111 ayet)
    1708, # 13 Rad          (43 ayet)
    1751, # 14 Ibrahim      (52 ayet)
    1803, # 15 Hicr         (99 ayet)
    1902, # 16 Nahl         (128 ayet)
    2030, # 17 Isra         (111 ayet)
    2141, # 18 Kehf         (110 ayet)
    2251, # 19 Meryem       (98 ayet)
    2349, # 20 Taha         (135 ayet)
    2484, # 21 Enbiya       (112 ayet)
    2596, # 22 Hac          (78 ayet)
    2674, # 23 Muminun      (118 ayet)
    2792, # 24 Nur          (64 ayet)
    2856, # 25 Furkan       (77 ayet)
    2933, # 26 Suara        (227 ayet)
    3160, # 27 Neml         (93 ayet)
    3253, # 28 Kasas        (88 ayet)
    3341, # 29 Ankebut      (69 ayet)
    3410, # 30 Rum          (60 ayet)
    3470, # 31 Lokman       (34 ayet)
    3504, # 32 Secde        (30 ayet)
    3534, # 33 Ahzab        (73 ayet)
    3607, # 34 Sebe         (54 ayet)
    3661, # 35 Fatir        (45 ayet)
    3706, # 36 Yasin        (83 ayet)
    3789, # 37 Saffat       (182 ayet)
    3971, # 38 Sad          (88 ayet)
    4059, # 39 Zumer        (75 ayet)
    4134, # 40 Mumin        (85 ayet)
    4219, # 41 Fussilet     (54 ayet)
    4273, # 42 Sura         (53 ayet)
    4326, # 43 Zuhruf       (89 ayet)
    4415, # 44 Duhan        (59 ayet)
    4474, # 45 Casiye       (37 ayet)
    4511, # 46 Ahkaf        (35 ayet)
    4546, # 47 Muhammed     (38 ayet)
    4584, # 48 Fetih        (29 ayet)
    4613, # 49 Hucurat      (18 ayet)
    4631, # 50 Kaf          (45 ayet)
    4676, # 51 Zariyat      (60 ayet)
    4736, # 52 Tur          (49 ayet)
    4785, # 53 Necm         (62 ayet)
    4847, # 54 Kamer        (55 ayet)
    4902, # 55 Rahman       (78 ayet)
    4980, # 56 Vakia        (96 ayet)
    5076, # 57 Hadid        (29 ayet)
    5105, # 58 Mucadele     (22 ayet)
    5127, # 59 Hasr         (24 ayet)
    5151, # 60 Mumtehine    (13 ayet)
    5164, # 61 Saff         (14 ayet)
    5178, # 62 Cuma         (11 ayet)
    5189, # 63 Munafikun    (11 ayet)
    5200, # 64 Tegabun      (18 ayet)
    5218, # 65 Talak        (12 ayet)
    5230, # 66 Tahrim       (12 ayet)
    5242, # 67 Mulk         (30 ayet)
    5272, # 68 Kalem        (52 ayet)
    5324, # 69 Hakka        (52 ayet)
    5376, # 70 Mearic       (44 ayet)
    5420, # 71 Nuh          (28 ayet)
    5448, # 72 Cin          (28 ayet)
    5476, # 73 Muzzemmil    (20 ayet)
    5496, # 74 Muddessir    (56 ayet)
    5552, # 75 Kiyame       (40 ayet)
    5592, # 76 Insan        (31 ayet)
    5623, # 77 Murselat     (50 ayet)
    5673, # 78 Nebe         (40 ayet)
    5713, # 79 Naziat       (46 ayet)
    5759, # 80 Abese        (42 ayet)
    5801, # 81 Tekvir       (29 ayet)
    5830, # 82 Infitar      (19 ayet)
    5849, # 83 Mutaffifin   (36 ayet)
    5885, # 84 Insikak      (25 ayet)
    5910, # 85 Buruc        (22 ayet)
    5932, # 86 Tarik        (17 ayet)
    5949, # 87 Ala          (19 ayet)
    5968, # 88 Gasiye       (26 ayet)
    5994, # 89 Fecr         (30 ayet)
    6024, # 90 Beled        (20 ayet)
    6044, # 91 Sems         (15 ayet)
    6059, # 92 Leyl         (21 ayet)
    6080, # 93 Duha         (11 ayet)
    6091, # 94 Insirah      (8 ayet)
    6099, # 95 Tin          (8 ayet)
    6107, # 96 Alak         (19 ayet)
    6126, # 97 Kadir        (5 ayet)
    6131, # 98 Beyyine      (8 ayet)
    6139, # 99 Zilzal       (8 ayet)
    6147, # 100 Adiyat      (11 ayet)
    6158, # 101 Karia       (11 ayet)
    6169, # 102 Tekasur     (8 ayet)
    6177, # 103 Asr         (3 ayet)
    6180, # 104 Humeze      (9 ayet)
    6189, # 105 Fil         (5 ayet)
    6194, # 106 Kureys      (4 ayet)
    6198, # 107 Maun        (7 ayet)
    6205, # 108 Kevser      (3 ayet)
    6208, # 109 Kafirun     (6 ayet)
    6214, # 110 Nasr        (3 ayet)
    6217, # 111 Leheb       (5 ayet)
    6222, # 112 Ihlas       (4 ayet)
    6226, # 113 Felak       (5 ayet)
    6231, # 114 Nas         (6 ayet)
]

def get_tefsir_url(surah_id: int, ayah: int) -> str:
    """Ayetin TEFSİR popup URL'sini döndürür."""
    if surah_id < 1 or surah_id > 114:
        return None
    global_id = SURAH_OFFSETS[surah_id] + ayah - 1
    return DOMAIN + f"/Sura/Comment/{global_id}"

def fetch_tefsir_content(surah_id: int, ayah: int) -> str | None:
    """TEFSİR popup sayfasının metin içeriğini çeker."""
    url = get_tefsir_url(surah_id, ayah)
    if not url:
        return None
    try:
        response = requests.get(url, timeout=15)
        response.encoding = 'utf-8'
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
                tag.extract()
            lines = [l.strip() for l in soup.get_text(separator="\n").splitlines() if l.strip()]
            text = "\n".join(lines)
            return text if len(text) > 50 else None
        return None
    except Exception:
        return None

def parse_rich_text(text: str) -> tuple[list, list]:
    """
    Dipnot veya tefsir metnini link/text parçalarına böler.
    Döner: (segments, connections)
    """
    import re

    SURAH_NUMBERS = {
        "fatiha":1,"bakara":2,"al-i imran":3,"ali imran":3,"âl-i imran":3,"al-i imran":3,
        "nisa":4,"nisâ":4,"maide":5,"mâide":5,"enam":6,"en'am":6,"en'âm":6,"en´am":6,
        "araf":7,"a'raf":7,"a'râf":7,"a´raf":7,"enfal":8,"enfâl":8,"tevbe":9,
        "yunus":10,"yûnus":10,"hud":11,"hûd":11,"yusuf":12,"yûsuf":12,
        "rad":13,"ra'd":13,"ibrahim":14,"ibrâhîm":14,"hicr":15,"nahl":16,
        "isra":17,"kehf":18,"meryem":19,"taha":20,"tâhâ":20,"ta ha":20,
        "enbiya":21,"enbiyâ":21,"hac":22,"muminun":23,"mü'minûn":23,"mü´minun":23,
        "nur":24,"nûr":24,"furkan":25,"furkân":25,"suara":26,"şuarâ":26,
        "neml":27,"kasas":28,"ankebut":29,"ankebût":29,"rum":30,"rûm":30,
        "lokman":31,"lokmân":31,"secde":32,"ahzab":33,"ahzâb":33,"sebe":34,
        "fatir":35,"fâtır":35,"yasin":36,"yâsîn":36,"saffat":37,"sâffât":37,
        "sad":38,"sâd":38,"zumer":39,"zümer":39,"mumin":40,"mü'min":40,"gafir":40,
        "fussilet":41,"sura":42,"şûrâ":42,"zuhruf":43,"duhan":44,"duhân":44,
        "casiye":45,"câsiye":45,"ahkaf":46,"ahkâf":46,"muhammed":47,"fetih":48,
        "hucurat":49,"hucurât":49,"kaf":50,"kâf":50,"zariyat":51,"zâriyât":51,
        "tur":52,"tûr":52,"necm":53,"kamer":54,"rahman":55,"rahmân":55,
        "vakia":56,"vâkıa":56,"hadid":57,"hadîd":57,"mucadele":58,"mücâdele":58,
        "hasr":59,"haşr":59,"mumtehine":60,"mümtehine":60,"saff":61,"cuma":62,
        "munafikun":63,"münâfikûn":63,"tegabun":64,"tegâbun":64,"talak":65,"talâk":65,
        "tahrim":66,"tahrîm":66,"mulk":67,"mülk":67,"kalem":68,"hakka":69,"hâkka":69,
        "mearic":70,"meâric":70,"nuh":71,"nûh":71,"cin":72,"muzzemmil":73,"müzzemmil":73,
        "muddessir":74,"müddessir":74,"kiyame":75,"kıyâme":75,"insan":76,"insân":76,
        "murselat":77,"mürselât":77,"nebe":78,"nebe'":78,"naziat":79,"nâziât":79,
        "abese":80,"tekvir":81,"tekvîr":81,"infitar":82,"i̇nfitâr":82,"infitâr":82,
        "mutaffifin":83,"mutaffifîn":83,"insikak":84,"i̇nşikâk":84,"buruc":85,"burûc":85,
        "tarik":86,"târık":86,"ala":87,"a'lâ":87,"gasiye":88,"gâşiye":88,"fecr":89,
        "beled":90,"sems":91,"şems":91,"leyl":92,"duha":93,"duhâ":93,
        "insirah":94,"i̇nşirâh":94,"tin":95,"tîn":95,"alak":96,"kadir":97,
        "beyyine":98,"zilzal":99,"zilzâl":99,"adiyat":100,"âdiyât":100,"karia":101,
        "kâria":101,"tekasur":102,"tekâsür":102,"asr":103,"humeze":104,"hümeze":104,
        "fil":105,"fîl":105,"kureys":106,"kureyş":106,"maun":107,"mâûn":107,
        "kevser":108,"kafirun":109,"kâfirûn":109,"nasr":110,"leheb":111,
        "ihlas":112,"i̇hlâs":112,"felak":113,"nas":114,"nâs":114,
        "kıyamet":75,"kıyâmet":75,
    }

    def normalize(name: str) -> str:
        name = name.lower().strip()
        for a, b in [("î","i"),("â","a"),("û","u"),("ö","o"),("ü","u"),
                     ("ş","s"),("ğ","g"),("ç","c"),("ı","i"),("'","'"),("´","'")]:
            name = name.replace(a, b)
        return name

    def surah_name_to_id(name: str) -> int | None:
        return SURAH_NUMBERS.get(normalize(name))

    def clean_ayah_spec(spec: str) -> str:
        """Whitespace ve newline'ları temizle, sadece rakam/tire/virgül bırak."""
        return re.sub(r'[\s\n]+', '', spec).strip('.,;)(')

    def expand_range(surah_id: int, spec: str) -> list[str]:
        spec = clean_ayah_spec(spec)
        coords = []
        if not spec:
            return coords
        # Önce virgülle böl, her parçayı ayrı işle: "15-16,48" → ["15-16", "48"]
        for part in spec.split(','):
            part = part.strip()
            if not part:
                continue
            if '-' in part:
                pieces = part.split('-')
                try:
                    start = int(pieces[0].strip())
                    end   = int(pieces[-1].strip())
                    if end - start > 300 or start < 1:
                        continue
                    for i in range(start, end + 1):
                        coords.append(f"{surah_id}:{i}")
                except (ValueError, TypeError):
                    pass
            elif part.isdigit():
                coords.append(f"{surah_id}:{part}")
        return coords

    # Regex: sure adı (opsiyonel) + sure_no/ayet_spec
    # Yeni satır ve boşlukları toleranslı şekilde yakala
    pattern = re.compile(
        r'(?:([A-ZÂÎÛÇŞĞÜÖa-zâîûçşğüöıİ\'\-]+'
        r'(?:[\s\-][A-ZÂÎÛÇŞĞÜÖa-zâîûçşğüöıİ\'\-]+)*)'
        r'\s+)?'           # sure adı opsiyonel
        r'(\d{1,3})'       # sure numarası
        r'/\s*'            # /
        r'(\d[\d\s\-,]*)' # ayet spec (newline toleranslı)
        , re.UNICODE
    )

    segments = []
    connections = []
    last_end = 0

    for m in pattern.finditer(text):
        start, end = m.start(), m.end()
        surah_name = (m.group(1) or "").strip()
        surah_num_str = m.group(2)
        ayah_spec_raw = m.group(3)

        # Sure ID: önce isme göre bak, yoksa numaradan al
        surah_id = surah_name_to_id(surah_name) if surah_name else None
        if not surah_id:
            try:
                surah_id = int(surah_num_str)
                if not (1 <= surah_id <= 114):
                    continue
            except Exception:
                continue

        ayah_spec = clean_ayah_spec(ayah_spec_raw)
        if not ayah_spec:
            continue

        targets = expand_range(surah_id, ayah_spec)
        if not targets:
            continue

        # Önceki düz metin
        if start > last_end:
            seg_text = text[last_end:start]
            if seg_text.strip():
                segments.append({"type": "text", "content": seg_text})

        # Link içeriği: "Sure SureNo/Ayet" formatında temiz göster
        if surah_name:
            link_content = f"{surah_name} {surah_num_str}/{ayah_spec}"
        else:
            link_content = f"{surah_num_str}/{ayah_spec}"

        segments.append({"type": "link", "content": link_content, "targets": targets})
        for t in targets:
            connections.append({"target_coordinate": t, "context": link_content})
        last_end = end

    # Kalan metin
    if last_end < len(text):
        remaining = text[last_end:]
        if remaining.strip():
            segments.append({"type": "text", "content": remaining})

    return segments, connections

def fetch_roots_for_surah(surah_id: int, verse_ids: list[str]) -> dict:
    """
    Bellek içi veritabanından sure ayetlerinin köklerini döndürür.
    verse_ids: ["3:1", "3:2", ...] formatında liste
    """
    load_roots_db()
    roots_map = {}
    for vid in verse_ids:
        roots = _roots_db.get(vid)
        roots_map[vid] = roots if roots else None
    found = sum(1 for v in roots_map.values() if v)
    print(f"    [Kökler] {found}/{len(verse_ids)} ayetin kökü bulundu.")
    return roots_map


# -----------------------------------------------------------------------
# Yardımcı fonksiyonlar
# -----------------------------------------------------------------------

def clean_json_response(raw_text):
    raw_text = raw_text.strip()
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    elif raw_text.startswith("```"):
        raw_text = raw_text[3:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]
    return raw_text.strip()


def chunk_text(text, max_chars=2800):
    if not text:
        return []
    paragraphs = text.split('\n')
    chunks, current_chunk = [], ""
    for p in paragraphs:
        p = p.strip()
        if not p:
            continue
        if len(current_chunk) + len(p) > max_chars:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = p + "\n"
        else:
            current_chunk += p + "\n"
    if current_chunk:
        chunks.append(current_chunk.strip())
    return chunks


def get_surah_audio_url(surah_id: int) -> str:
    """
    Her sure için ses dosyası URL'sini döndürür.
    Site yapısı: /Content/Voices/{id}.mp3
    """
    return DOMAIN + f"/Content/Voices/{surah_id}.mp3"


def get_page_content(url):
    try:
        response = requests.get(url, timeout=30)
        response.encoding = 'utf-8'
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            # Audio tag'lerini tamamen kaldır — surah_audio ayrı alanda tutulacak
            for audio in soup.find_all('audio'):
                audio.decompose()
            for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
                tag.extract()
            lines = [l.strip() for l in soup.get_text(separator="\n").splitlines() if l.strip()]
            return "\n".join(lines)
        return None
    except Exception as e:
        print(f"    ! Sayfa çekme hatası: {str(e)}")
        return None


# -----------------------------------------------------------------------
# AI ile ayet çıkarma
# -----------------------------------------------------------------------

def fetch_surah_data(surah):
    surah_url = BASE_URL + _url_quote(surah['slug']) + ".htm"
    print(f"    URL: {surah_url}")
    page_text = get_page_content(surah_url)

    if not page_text or len(page_text) < 150:
        print(f"    ! Uyarı: {surah['name']} içeriği boş veya hatalı.")
        return None

    chunks = chunk_text(page_text, max_chars=2800)
    all_verses = []

    for idx, chunk in enumerate(chunks):
        print(f"    > Parça {idx + 1}/{len(chunks)} analiz ediliyor...")
        query_text = (
            f"Aşağıdaki metin Süleymaniye Vakfı Meali'nin {surah['name']} suresi "
            f"sayfasına aittir. LÜTFEN SADECE BU PARÇADAKİ AYETLERİ AYIKLA:\n\n{chunk}"
        )

        payload = {
            "contents": [{"parts": [{"text": query_text}]}],
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1
            }
        }

        delays = [2, 4, 8, 16, 32]
        chunk_success = False

        for attempt in range(len(delays)):
            try:
                response = requests.post(API_ENDPOINT, json=payload, timeout=300)

                if response.status_code == 200:
                    result = response.json()
                    candidates = result.get('candidates')
                    if not candidates:
                        time.sleep(delays[attempt])
                        continue

                    candidate = candidates[0]
                    finish_reason = candidate.get('finishReason', '')
                    if finish_reason not in ('STOP', 'MAX_TOKENS', ''):
                        print(f"    ! Model durdu: {finish_reason}")
                        time.sleep(delays[attempt])
                        continue

                    if not candidate.get('content'):
                        time.sleep(delays[attempt])
                        continue

                    parts = candidate['content'].get('parts', [])
                    if not parts or 'text' not in parts[0]:
                        time.sleep(delays[attempt])
                        continue

                    cleaned_json = clean_json_response(parts[0]['text'])

                    try:
                        parsed_json = json.loads(cleaned_json)
                        if isinstance(parsed_json, dict) and "nodes" in parsed_json:
                            parsed_json = parsed_json["nodes"]
                        if isinstance(parsed_json, list):
                            all_verses.extend(parsed_json)
                            chunk_success = True
                            break
                        else:
                            time.sleep(delays[attempt])
                    except json.JSONDecodeError as e:
                        print(f"    ! JSON Hatası: {e}")
                        time.sleep(delays[attempt])

                elif response.status_code == 429:
                    wait = delays[attempt] * 3
                    print(f"    ! Rate limit. {wait}s bekleniyor...")
                    time.sleep(wait)
                else:
                    if attempt == len(delays) - 1:
                        print(f"    ! API Hatası: {response.status_code}")
                    time.sleep(delays[attempt])

            except requests.exceptions.Timeout:
                print(f"    ! Zaman aşımı.")
                time.sleep(delays[attempt])
            except Exception as e:
                print(f"    ! Hata: {e}")
                time.sleep(delays[attempt])

        if not chunk_success:
            print(f"    X Parça {idx + 1} alınamadı.")
            return None

        time.sleep(2)

    if not all_verses:
        return None

    # -----------------------------------------------------------------------
    # ROOTS: Lokal morfoloji dosyasından doldur
    # -----------------------------------------------------------------------
    verse_ids = [v["id"] for v in all_verses if isinstance(v.get("id"), str)]
    if verse_ids:
        roots_map = fetch_roots_for_surah(surah["id"], verse_ids)
        for verse in all_verses:
            vid = verse.get("id")
            if vid and vid in roots_map:
                verse["roots"] = roots_map[vid]

    # -----------------------------------------------------------------------
    # DIPNOT_PARSED: dipnot metnini link/text parçalarına böl
    # -----------------------------------------------------------------------
    for verse in all_verses:
        dipnot = verse.get("dipnot")
        # AI'dan gelen tefsir alanını kaldır
        verse.pop("tefsir", None)
        if dipnot:
            segments, dipnot_connections = parse_rich_text(dipnot)
            verse["dipnot_parsed"] = segments
        else:
            verse["dipnot_parsed"] = None
            dipnot_connections = []
        # mapping_data'yı dipnot bağlantılarıyla başlat
        verse["mapping_data"] = {
            "coordinate": verse.get("id", ""),
            "connections": dipnot_connections
        }

    # -----------------------------------------------------------------------
    # TEFSİR POPUP: Her ayet için ayrı sayfadan çek, parse et, mapping'e ekle
    # -----------------------------------------------------------------------
    print(f"    [Tefsir] {len(all_verses)} ayet için tefsir sayfaları çekiliyor...")
    tefsir_found = 0
    for verse in all_verses:
        vid = verse.get("id", "")
        try:
            parts = vid.split(":")
            s_id, a_id = int(parts[0]), int(parts[1])
            tefsir_text = fetch_tefsir_content(s_id, a_id)
            if tefsir_text:
                # Ham metni link/text parçalarına böl
                segments, popup_connections = parse_rich_text(tefsir_text)
                verse["tefsir_popup"] = segments

                # mapping_data'ya tefsir_popup bağlantılarını da ekle (tekrarları atla)
                existing = verse["mapping_data"].get("connections", [])
                existing_targets = {c["target_coordinate"] for c in existing}
                for conn in popup_connections:
                    if conn["target_coordinate"] not in existing_targets:
                        existing.append(conn)
                        existing_targets.add(conn["target_coordinate"])
                verse["mapping_data"]["connections"] = existing
                tefsir_found += 1
            else:
                verse["tefsir_popup"] = None
        except Exception as e:
            verse["tefsir_popup"] = None
        time.sleep(0.5)
    print(f"    [Tefsir] {tefsir_found}/{len(all_verses)} ayetin tefsiri bulundu.")

    return all_verses


# -----------------------------------------------------------------------
# Ana işlem
# -----------------------------------------------------------------------

def make_entry(surah, nodes):
    """Her ayete surah_audio'yu audio alanı olarak ekler, yapıyı bozmaz."""
    audio_url = get_surah_audio_url(surah["id"])
    for verse in nodes:
        if isinstance(verse, dict):
            verse["audio"] = audio_url
    return {"nodes": nodes}


def start_extraction():
    all_surahs = []
    if not os.path.exists('output'):
        os.makedirs('output')

    print("--- Kur'an Veri Çıkarma İşlemi Başladı ---")

    for surah in SURAH_LIST:
        file_path = f"output/surah_{surah['id']}.json"

        if surah['id'] in REPROCESS_LIST and os.path.exists(file_path):
            print(f"🔄 {surah['id']}. {surah['name']} zorla yeniden işleniyor...")
            os.remove(file_path)

        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    saved_data = json.load(f)
                if isinstance(saved_data, dict) and "nodes" in saved_data:
                    # surah_audio eksikse güncelle (eski format uyumluluğu)
                    if "surah_audio" not in saved_data:
                        saved_data = make_entry(surah, saved_data["nodes"])
                        with open(file_path, 'w', encoding='utf-8') as fw:
                            json.dump(saved_data, fw, ensure_ascii=False, indent=2)
                    print(f"⏩ {surah['id']}. {surah['name']} zaten işlenmiş, atlanıyor...")
                    all_surahs.append(saved_data)
                    continue
                else:
                    raise ValueError("Bilinmeyen format")
            except Exception as e:
                print(f"    ! Dosya okunamadı ({e}), yeniden işleniyor...")
                os.remove(file_path)

        print(f"--> {surah['id']}. {surah['name']} işleniyor...")
        data = fetch_surah_data(surah)

        if data:
            entry = make_entry(surah, data)
            all_surahs.append(entry)
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(entry, f, ensure_ascii=False, indent=2)
            print(f"✓ {surah['name']} tamamlandı. ({len(data)} ayet)")
        else:
            print(f"X {surah['name']} BAŞARISIZ.")

        time.sleep(3)

    all_verses = [v for s in all_surahs for v in s.get("nodes", [])]
    final_output = {"nodes": all_verses}
    with open("full_quran_rich_map.json", 'w', encoding='utf-8') as f:
        json.dump(final_output, f, ensure_ascii=False, indent=2)
    print(f"\n✓ İŞLEM TAMAMLANDI. {len(all_surahs)} sure, {len(all_verses)} ayet kaydedildi.")
    print("  Dosya: full_quran_rich_map.json")


if __name__ == "__main__":
    start_extraction()
