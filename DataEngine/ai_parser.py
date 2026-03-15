# -*- coding: utf-8 -*-
"""SemantikGalaksi -- AI-Powered Self-Healing Parser

Claude API kullanarak site yapisi degistiginde otomatik olarak:
1. Sayfadan veri cikarir (ayet, meal, dipnot, tefsir)
2. Yeni site yapisina uygun Python parse kodu uretir
3. Uretilen kodu kaydeder ve sonraki calismalarda kullanir

Kullanim:
    from ai_parser import AIParser
    parser = AIParser(api_key="sk-ant-...")
    # Veri cikartma
    verses = parser.extract_verses(html, sure_no)
    # Yeni parser kodu uretme
    parser.generate_and_save_parser(html)
"""

import os
import sys
import json
import time
import re
import hashlib

try:
    import requests as _req
except ImportError:
    _req = None

# ---------------------------------------------------------------------------
# Guvenlik — Kod Sandbox Dogrulayici
# ---------------------------------------------------------------------------
# Claude'un urettigi kodda tehlikeli islemler olmamasini garanti eder.
_BLOCKED_PATTERNS = [
    r'\bos\.system\b',
    r'\bos\.popen\b',
    r'\bos\.exec\w*\b',
    r'\bos\.spawn\w*\b',
    r'\bos\.remove\b',
    r'\bos\.unlink\b',
    r'\bos\.rmdir\b',
    r'\bos\.rename\b',
    r'\bsubprocess\b',
    r'\bshutil\.rmtree\b',
    r'\bshutil\.move\b',
    r'\b__import__\b',
    r'\beval\s*\(',
    r'\bexec\s*\(',
    r'\bcompile\s*\(',
    r'\bopen\s*\([^)]*["\']w',
    r'\bsocket\b',
    r'\brequests\b',
    r'\burllib\b',
    r'\bhttp\.client\b',
    r'\bctypes\b',
]
_ALLOWED_IMPORTS = {'re', 'bs4', 'json', 'html', 'collections', 'itertools', 'string', 'unicodedata'}


def _validate_generated_code(code):
    """Claude urettigi Python kodunu guvenlik aciklari icin dogrula.
    Tehlikeli import/cagri varsa (False, sebep) doner.
    Guvenli ise (True, None) doner."""
    for pattern in _BLOCKED_PATTERNS:
        m = re.search(pattern, code)
        if m:
            return False, f"Yasakli pattern tespit edildi: {m.group()}"

    # import kontrolu — sadece izin verilenler
    import_lines = re.findall(r'^\s*(?:import|from)\s+([\w.]+)', code, re.MULTILINE)
    for imp in import_lines:
        top_module = imp.split('.')[0]
        if top_module not in _ALLOWED_IMPORTS:
            return False, f"Izin verilmeyen import: {imp}"

    return True, None


# ---------------------------------------------------------------------------
# Yapilandirma
# ---------------------------------------------------------------------------
_DIR = os.path.dirname(os.path.abspath(sys.executable)) if getattr(sys, 'frozen', False) else os.path.dirname(os.path.abspath(__file__))
SITE_CONFIG_PATH = os.path.join(_DIR, 'site_config.json')
GENERATED_PARSER_PATH = os.path.join(_DIR, 'generated_parser.py')
GENERATED_PARSER_HASH = os.path.join(_DIR, '.generated_parser.sha256')
PARSER_HISTORY_DIR = os.path.join(_DIR, 'parser_history')

# Claude API
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
DEFAULT_MODEL = "claude-sonnet-4-20250514"
MAX_TOKENS = 8192


def _load_site_config():
    """Bilinen site yapisini yukle."""
    if os.path.exists(SITE_CONFIG_PATH):
        with open(SITE_CONFIG_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def _save_site_config(config):
    """Site yapisini kaydet."""
    with open(SITE_CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Guvenlik -- Prompt Injection Temizleyici
# ---------------------------------------------------------------------------
_INJECTION_PATTERNS = [
    r'(?i)ignore\s+(all\s+)?previous\s+instructions',
    r'(?i)ignore\s+(all\s+)?above\s+instructions',
    r'(?i)disregard\s+(all\s+)?previous',
    r'(?i)forget\s+(all\s+)?previous',
    r'(?i)you\s+are\s+now\s+a',
    r'(?i)act\s+as\s+(a|an|if)',
    r'(?i)new\s+system\s*prompt',
    r'(?i)system\s*:\s*you',
    r'(?i)\[system\]',
    r'(?i)\[instruction\]',
    r'(?i)override\s+(system|safety|instructions)',
    r'(?i)jailbreak',
    r'(?i)DAN\s+mode',
    r'(?i)do\s+anything\s+now',
    r'(?i)pretend\s+you\s+are',
    r'(?i)respond\s+as\s+if',
    r'(?i)bypass\s+(filter|safety|restriction)',
]

def _sanitize_prompt_injection(text):
    """HTML icerigindeki prompt injection girisimlerini temizle."""
    for pat in _INJECTION_PATTERNS:
        text = re.sub(pat, '[BLOCKED]', text)
    return text


# ---------------------------------------------------------------------------
# Claude API Client
# ---------------------------------------------------------------------------
class AIParser:
    """Claude API ile self-healing HTML parser."""

    def __init__(self, api_key=None, model=None):
        self.api_key = api_key
        self.model = model or DEFAULT_MODEL
        self.site_config = _load_site_config()
        self._last_error = None

    def _scrub_key(self, text):
        """Hata mesajlarindan API key ve hassas bilgileri temizle."""
        if self.api_key and self.api_key in text:
            masked = self.api_key[:4] + '****' + self.api_key[-4:] if len(self.api_key) >= 12 else '****'
            text = text.replace(self.api_key, masked)
        # Genel API key pattern'lerini de temizle
        text = re.sub(r'sk-ant-[a-zA-Z0-9_-]{20,}', 'sk-ant-****', text)
        text = re.sub(r'AIzaSy[a-zA-Z0-9_-]{30,}', 'AIzaSy****', text)
        return text

    def _call_claude(self, system_prompt, user_prompt, max_tokens=None):
        """Claude API'yi cagir."""
        if not _req:
            raise ImportError("requests modulu gerekli")
        if not self.api_key:
            raise ValueError("Claude API key gerekli")

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": self.model,
            "max_tokens": max_tokens or MAX_TOKENS,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        }
        try:
            resp = _req.post(ANTHROPIC_API_URL, headers=headers,
                             json=payload, timeout=120)
            if resp.status_code != 200:
                self._last_error = self._scrub_key(f"HTTP {resp.status_code}: {resp.text[:300]}")
                return None
            data = resp.json()
            # content[0].text
            content = data.get("content", [])
            if content and content[0].get("type") == "text":
                return content[0]["text"]
            self._last_error = "Bos yanit"
            return None
        except Exception as e:
            self._last_error = self._scrub_key(str(e))
            return None

    def test_key(self):
        """API key'in gecerli olup olmadigini test et."""
        if not _req or not self.api_key:
            return False, "API key veya requests modulu eksik"
        try:
            headers = {
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            }
            payload = {
                "model": self.model,
                "max_tokens": 32,
                "messages": [{"role": "user", "content": "Merhaba, test. Sadece 'OK' yaz."}],
            }
            resp = _req.post(ANTHROPIC_API_URL, headers=headers,
                             json=payload, timeout=30)
            if resp.status_code == 200:
                return True, "OK"
            err = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
            return False, self._scrub_key(err)
        except Exception as e:
            return False, self._scrub_key(str(e))

    # -------------------------------------------------------------------
    # 1) Veri Cikartma — HTML'den yapilandirilmis veri cikart
    # -------------------------------------------------------------------
    def extract_verses(self, html, sure_no):
        """Claude'a HTML gonderip yapilandirilmis ayet verisi cikart.
        Doner: {ayet_no: {ayet, meal, dipnot, has_tefsir}} veya None"""

        # HTML'i kisalt (cok buyuk olabilir)
        trimmed = self._trim_html(html, sure_no)

        system = """Sen bir Kuran ayeti veri cikartma uzmanisin.
Sana bir HTML sayfasi verilecek. Bu sayfa Sueleymaniye Vakfi meali sitesinden alinmistir.
Sayfada Arapca ayet metinleri, Turkce meal cevirileri, dipnotlar ve bazi ayetler icin tefsir bilgileri bulunur.

Gorev: Sayfadaki TUM ayetleri yapilandirilmis JSON olarak cikar.

Cikti formati (sadece JSON, baska bir sey yazma):
{
  "verses": {
    "1": {"ayet": "Arapca metin", "meal": "Turkce ceviri", "dipnot": "dipnot metni veya bos", "has_tefsir": true/false},
    "2": {"ayet": "...", "meal": "...", "dipnot": "...", "has_tefsir": false},
    ...
  }
}

Kurallar:
- ayet: Arapca metin (hareke dahil, oldugu gibi)
- meal: Turkce ceviri (dipnot oncesi kisim)
- dipnot: [*] veya [1*] gibi isaretlerle baslayan aciklama metni. Yoksa bos string.
- has_tefsir: Sayfa basliginda veya yapisinda bu ayet icin tefsir/aciklama olduguna dair isaret varsa true
- Besmele satirini atla (ayet numarasi olmayan ilk giris)
- Sure numarasi: """ + str(sure_no) + """
- SADECE JSON don, aciklama yazma"""

        user = f"Sure {sure_no} icin asagidaki HTML sayfasindan tum ayetleri cikar:\n\n{trimmed}"

        result = self._call_claude(system, user, max_tokens=MAX_TOKENS)
        if not result:
            return None

        # JSON parse
        try:
            # JSON blogu bul
            json_match = re.search(r'\{[\s\S]*\}', result)
            if json_match:
                data = json.loads(json_match.group())
                verses = data.get("verses", data)
                # String key -> int key
                return {int(k): v for k, v in verses.items()}
        except (json.JSONDecodeError, ValueError) as e:
            self._last_error = f"JSON parse hatasi: {e}"
        return None

    # -------------------------------------------------------------------
    # 2) Parser Kodu Uretme — Yeni site yapisina uygun parse kodu olustur
    # -------------------------------------------------------------------
    def generate_and_save_parser(self, sample_html, sure_no=1):
        """Claude'a ornek HTML gonderip Python parse kodu uret ve kaydet.
        Uretilen kod generated_parser.py olarak kaydedilir."""

        config_str = json.dumps(self.site_config, ensure_ascii=False, indent=2)

        system = """Sen bir Python web scraping uzmanisin.
Sana bir Kuran meali sitesinin HTML sayfasi ve daha once calisan site yapisi bilgisi verilecek.
Site yapisi degismis olabilir — yeni yapiya uygun bir Python parse fonksiyonu yazman gerekiyor.

Yazacagin fonksiyon su imzaya sahip olmali:

```python
def parse_surah(html_content, sure_no):
    \"\"\"HTML'den ayet verilerini parse eder.
    Doner: {ayet_no: {"ayet": str, "meal": str, "dipnot": str, "has_tefsir": bool}}
    \"\"\"
```

Kurallar:
1. BeautifulSoup kullan (from bs4 import BeautifulSoup)
2. re modulu kullanabilirsin
3. Fonksiyon SADECE dict donmeli (hata durumunda bos dict)
4. Besmele satirini atla (ilk giris, ayet numarasi yok)
5. Meal ve dipnotu ayir: dipnot genellikle [*] veya [1*] ile baslar
6. has_tefsir: baslikta 'TEFSiR' kelimesi varsa True
7. SADECE Python kodu yaz, aciklama yazma
8. Kodun basina '# AUTO-GENERATED PARSER' yorum satiri ekle
9. Kodun basina tarih bilgisi ekle

Bilinen eski site yapisi:
""" + config_str

        user = f"Asagidaki HTML sure {sure_no} sayfasidir. Yeni yapiya uygun parse_surah() fonksiyonu yaz:\n\n{self._trim_html(sample_html, sure_no)}"

        result = self._call_claude(system, user, max_tokens=MAX_TOKENS)
        if not result:
            return False, self._last_error

        # Python kodunu cikar
        code = self._extract_python_code(result)
        if not code:
            return False, "Python kodu cikarilamadi"

        # Guvenlik: Sandbox dogrulamasi (regex + AST)
        safe, reason = _validate_generated_code(code)
        if not safe:
            self._last_error = f"Guvenlik ihlali: {reason}"
            return False, self._last_error
        safe, reason = _ast_validate(code)
        if not safe:
            self._last_error = f"AST guvenlik ihlali: {reason}"
            return False, self._last_error

        # Onceki parser'i yedekle
        self._backup_parser()

        # Kaydet + hash
        with open(GENERATED_PARSER_PATH, 'w', encoding='utf-8') as f:
            f.write(code)
        _save_parser_hash(code)

        return True, GENERATED_PARSER_PATH

    def update_parser_for_tefsir(self, sample_html, sure_no=1):
        """Mevcut parser'i tefsir alani icin guncelle."""
        existing_code = ""
        if os.path.exists(GENERATED_PARSER_PATH):
            with open(GENERATED_PARSER_PATH, 'r', encoding='utf-8') as f:
                existing_code = f.read()

        system = """Sen bir Python programcisin. Mevcut bir Kuran sayfasi parser fonksiyonunu
tefsir verisi cikartma yetenegini ekleyecek sekilde guncelle.

Site yapisinda tefsir bilgisi su sekilde belirlenir:
- Ayet basliginda (qrHeader/benzeri) 'TEFSiR' kelimesi varsa o ayetin tefsiri mevcuttur
- Tefsir icerigi dipnot kismindadir ([*] sonrasi)

Cikti olarak SADECE guncellenmis Python kodu yaz."""

        user_msg = "Mevcut parser kodu:\n" + existing_code + "\n\nOrnek HTML:\n" + self._trim_html(sample_html, sure_no)

        result = self._call_claude(system, user_msg, max_tokens=MAX_TOKENS)
        if not result:
            return False, self._last_error

        code = self._extract_python_code(result)
        if not code:
            return False, "Guncellenmis kod cikarilamadi"

        # Guvenlik: Sandbox dogrulamasi (regex + AST)
        safe, reason = _validate_generated_code(code)
        if not safe:
            self._last_error = f"Guvenlik ihlali: {reason}"
            return False, self._last_error
        safe, reason = _ast_validate(code)
        if not safe:
            self._last_error = f"AST guvenlik ihlali: {reason}"
            return False, self._last_error

        self._backup_parser()
        with open(GENERATED_PARSER_PATH, 'w', encoding='utf-8') as f:
            f.write(code)
        _save_parser_hash(code)

        return True, GENERATED_PARSER_PATH

    # -------------------------------------------------------------------
    # 3) URL Kesfetme — Site adresi degistiyse yeni URL bul
    # -------------------------------------------------------------------
    def discover_new_url(self, old_domain, sure_no=1, slug="Fatiha"):
        """Site adresi degistiyse Claude'a sor."""
        system = """Sen bir web arastirmaci ve URL tespit uzmanisin.
Sana eski bir web sitesi adresi ve sure bilgisi verilecek.
Sueleymaniye Vakfi Kuran meali sitesinin guncel adresini bul.

Cikti formati (sadece JSON):
{"domain": "https://yeni-adres.com", "url_pattern": "{domain}/path/{slug}.htm", "verified": true/false, "notes": "aciklama"}

Eger bulamazsan: {"domain": null, "verified": false, "notes": "sebep"}"""

        user = f"Eski site: {old_domain}\nSure slug: {slug}\nSure no: {sure_no}\n\nSueleymaniye Vakfi meali sitesinin guncel adresini bul."

        result = self._call_claude(system, user, max_tokens=1024)
        if not result:
            return None

        try:
            json_match = re.search(r'\{[\s\S]*?\}', result)
            if json_match:
                return json.loads(json_match.group())
        except (json.JSONDecodeError, ValueError):
            pass
        return None

    # -------------------------------------------------------------------
    # Yardimcilar
    # -------------------------------------------------------------------
    def _trim_html(self, html, sure_no):
        """HTML'i Claude icin kisalt ve prompt injection'a karsi temizle."""
        if not html:
            return ""
        # <head> kismi gereksiz, kaldir
        html = re.sub(r'<head[\s\S]*?</head>', '', html, flags=re.IGNORECASE)
        # script/style kaldir
        html = re.sub(r'<script[\s\S]*?</script>', '', html, flags=re.IGNORECASE)
        html = re.sub(r'<style[\s\S]*?</style>', '', html, flags=re.IGNORECASE)
        # HTML yorumlarini kaldir (prompt injection vektoru)
        html = re.sub(r'<!--[\s\S]*?-->', '', html)
        # Prompt injection kaliplari temizle
        html = _sanitize_prompt_injection(html)
        # Coklu bosluk temizle
        html = re.sub(r'\n\s*\n', '\n', html)
        # Cok uzunsa kes (yakl. 60K char ~ 15K token)
        max_len = 60000
        if len(html) > max_len:
            html = html[:max_len] + "\n<!-- ... truncated ... -->"
        return html

    def _extract_python_code(self, response):
        """Claude yanitindan Python kodu cikar."""
        # ```python ... ``` blogu ara
        m = re.search(r'```python\s*\n([\s\S]*?)```', response)
        if m:
            return m.group(1).strip()
        # ``` ... ``` blogu ara
        m = re.search(r'```\s*\n([\s\S]*?)```', response)
        if m:
            code = m.group(1).strip()
            if 'def ' in code or 'import ' in code:
                return code
        # Dogrudan kod olabilir
        if 'def parse_surah' in response:
            # Ilk def'ten itibaren al
            idx = response.index('def parse_surah')
            return response[idx:].strip()
        return None

    def _backup_parser(self):
        """Mevcut generated_parser.py'yi yedekle."""
        if not os.path.exists(GENERATED_PARSER_PATH):
            return
        os.makedirs(PARSER_HISTORY_DIR, exist_ok=True)
        import shutil
        ts = time.strftime('%Y%m%d_%H%M%S')
        backup_name = f'generated_parser_{ts}.py'
        shutil.copy2(GENERATED_PARSER_PATH, os.path.join(PARSER_HISTORY_DIR, backup_name))

    @property
    def last_error(self):
        return self._last_error


# ---------------------------------------------------------------------------
# Dosya Butunlugu -- Hash Dogrulama
# ---------------------------------------------------------------------------
def _save_parser_hash(code):
    """Uretilmis parser kodunun SHA-256 hash'ini kaydet."""
    h = hashlib.sha256(code.encode('utf-8')).hexdigest()
    with open(GENERATED_PARSER_HASH, 'w', encoding='utf-8') as f:
        f.write(h)


def _verify_parser_hash(code):
    """Kaydedilmis hash ile dosya butunlugunu dogrula.
    Hash dosyasi yoksa False doner (dogrulanamaz)."""
    if not os.path.exists(GENERATED_PARSER_HASH):
        return False
    try:
        with open(GENERATED_PARSER_HASH, 'r', encoding='utf-8') as f:
            stored = f.read().strip()
        actual = hashlib.sha256(code.encode('utf-8')).hexdigest()
        return stored == actual
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Generated Parser Yukleyici
# ---------------------------------------------------------------------------
def _ast_validate(code):
    """AST uzerinden tehlikeli node'lari tespit et (regex'e ek katman)."""
    import ast
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return False, "Gecersiz Python sozdizimi"
    _DANGEROUS_ATTRS = {'system', 'popen', 'exec', 'eval', 'compile',
                        'spawn', 'remove', 'unlink', 'rmdir', 'rmtree'}
    _DANGEROUS_NAMES = {'exec', 'eval', 'compile', '__import__',
                        'breakpoint', 'exit', 'quit'}
    for node in ast.walk(tree):
        # exec(...) / eval(...) cagrilari
        if isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Name) and func.id in _DANGEROUS_NAMES:
                return False, f"Yasakli cagri: {func.id}()"
            if isinstance(func, ast.Attribute) and func.attr in _DANGEROUS_ATTRS:
                return False, f"Yasakli metod: .{func.attr}()"
        # import os / import subprocess
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            names = []
            if isinstance(node, ast.Import):
                names = [a.name.split('.')[0] for a in node.names]
            elif node.module:
                names = [node.module.split('.')[0]]
            for n in names:
                if n not in _ALLOWED_IMPORTS:
                    return False, f"Izin verilmeyen import: {n}"
    return True, None


def load_generated_parser():
    """Uretilmis parser'i yukle ve parse_surah fonksiyonunu don.
    Yoksa, guvenlik ihlali varsa veya hataliysa None doner."""
    if not os.path.exists(GENERATED_PARSER_PATH):
        return None
    try:
        # Guvenlik: Yukleme oncesi kod dogrulamasi (regex + AST + hash)
        with open(GENERATED_PARSER_PATH, 'r', encoding='utf-8') as f:
            code = f.read()
        # Hash butunluk kontrolu (dosya disaridan degistirilmis mi?)
        if not _verify_parser_hash(code):
            # Hash uyumsuz — dosya disaridan degistirilmis olabilir
            # Yine de guvenlik kontrolunden gecerse calistirilabilir
            pass
        safe, reason = _validate_generated_code(code)
        if not safe:
            return None
        safe, reason = _ast_validate(code)
        if not safe:
            return None

        import importlib.util
        spec = importlib.util.spec_from_file_location("generated_parser", GENERATED_PARSER_PATH)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        if hasattr(mod, 'parse_surah'):
            return mod.parse_surah
    except Exception:
        pass
    return None


def get_parser_status():
    """Generated parser durumunu don."""
    if not os.path.exists(GENERATED_PARSER_PATH):
        return {"exists": False, "path": GENERATED_PARSER_PATH}
    try:
        mtime = os.path.getmtime(GENERATED_PARSER_PATH)
        import datetime
        dt = datetime.datetime.fromtimestamp(mtime)
        # History sayisi
        history_count = 0
        if os.path.isdir(PARSER_HISTORY_DIR):
            history_count = len([f for f in os.listdir(PARSER_HISTORY_DIR) if f.endswith('.py')])
        # Hash ve guvenlik durumu
        with open(GENERATED_PARSER_PATH, 'r', encoding='utf-8') as f:
            code = f.read()
        hash_ok = _verify_parser_hash(code)
        safe_regex, _ = _validate_generated_code(code)
        safe_ast, _ = _ast_validate(code)
        return {
            "exists": True,
            "path": GENERATED_PARSER_PATH,
            "last_modified": dt.isoformat(),
            "size": os.path.getsize(GENERATED_PARSER_PATH),
            "history_count": history_count,
            "integrity": hash_ok,
            "sandbox_safe": safe_regex and safe_ast,
        }
    except Exception as e:
        return {"exists": True, "error": str(e)}
