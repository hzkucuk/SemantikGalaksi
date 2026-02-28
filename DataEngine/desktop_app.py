import webview
import threading
import os
import http.server
import socketserver
import time
import json
import base64

# --- AYARLAR ---
PORT = 8080
# Proje kök dizini (DataEngine klasörünün bir üstündeki Frontend klasörü)
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.join(CURRENT_DIR, '..', 'Frontend')
WEBVIEW_DATA_DIR = os.path.join(CURRENT_DIR, 'webview_data')
KEYS_FILE = os.path.join(CURRENT_DIR, 'webview_data', '.api_keys')


def _ensure_dir():
    os.makedirs(os.path.dirname(KEYS_FILE), exist_ok=True)


def _load_keys():
    _ensure_dir()
    if not os.path.exists(KEYS_FILE):
        return []
    try:
        with open(KEYS_FILE, 'r', encoding='utf-8') as f:
            return json.loads(base64.b64decode(f.read()).decode('utf-8'))
    except Exception:
        return []


def _save_keys(keys):
    _ensure_dir()
    with open(KEYS_FILE, 'w', encoding='utf-8') as f:
        f.write(base64.b64encode(json.dumps(keys).encode('utf-8')).decode('utf-8'))


class ApiKeyBridge:
    """pywebview JS-Python köprüsü: API anahtarlarını güvenli dosyada saklar."""

    def get_keys(self):
        keys = _load_keys()
        return [{"key": k["key"][:8] + "••••" + k["key"][-4:], "full": k["key"],
                 "status": k.get("status", "pending")} for k in keys]

    def add_key(self, key):
        keys = _load_keys()
        if any(k["key"] == key for k in keys):
            return False
        keys.append({"key": key, "status": "pending"})
        _save_keys(keys)
        return True

    def remove_key(self, key):
        keys = [k for k in _load_keys() if k["key"] != key]
        _save_keys(keys)

    def update_status(self, key, status):
        keys = _load_keys()
        for k in keys:
            if k["key"] == key:
                k["status"] = status
        _save_keys(keys)

    def get_raw_keys(self):
        """Tam anahtarları döndürür (sadece JS tarafından API çağrısı için)."""
        return [k["key"] for k in _load_keys()]

class ProjeHandler(http.server.SimpleHTTPRequestHandler):
    """
    Statik dosyaları sunmak için özel handler.
    Root dizin olarak Frontend klasörünü kullanır.
    """
    def __init__(self, *args, **kwargs):
        # directory parametresi Python 3.7+ gerektirir
        super().__init__(*args, directory=ROOT_DIR, **kwargs)
    
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def log_message(self, format, *args):
        # Konsolu temiz tutmak için logları sustur
        pass

def sunucuyu_baslat():
    """Arka planda sessiz bir sunucu başlatır"""
    # Port çakışmasını önlemek için 'allow_reuse_address'
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("127.0.0.1", PORT), ProjeHandler) as httpd:
            print(f"Sunucu başlatıldı: http://127.0.0.1:{PORT}")
            httpd.serve_forever()
    except OSError:
        print(f"Uyarı: {PORT} portu zaten kullanımda olabilir.")
        # Port doluysa da pencereyi açmayı dene, belki başka bir işlem (örneğin eski bir instance) çalışıyordur

if __name__ == '__main__':
    # 1. Sunucuyu ayrı bir iş parçacığında başlat
    t = threading.Thread(target=sunucuyu_baslat)
    t.daemon = True
    t.start()
    
    # Sunucunun başlamasını bekle (kısa bir süre)
    time.sleep(1)
    
    # 2. Masaüstü Penceresini Aç
    def on_closing():
        """Pencere kapanırken temizlik"""
        return True

    try:
        api_bridge = ApiKeyBridge()
        window = webview.create_window(
            title="Kur'an-ı Kerim Kelime Kök Uzayı",
            url=f'http://127.0.0.1:{PORT}/index.html',
            maximized=True,
            background_color='#000000',
            resizable=True,
            text_select=False,
            js_api=api_bridge
        )
        window.events.closing += on_closing
        webview.start(debug=False, storage_path=WEBVIEW_DATA_DIR, private_mode=False)
    except Exception as e:
        print(f"Pencere açılırken hata oluştu: {e}")
