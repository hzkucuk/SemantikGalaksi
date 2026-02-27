import webview
import threading
import os
import http.server
import socketserver
import time

# --- AYARLAR ---
PORT = 8080
# Proje kök dizini (DataEngine klasörünün bir üstündeki Frontend klasörü)
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.join(CURRENT_DIR, '..', 'Frontend')
WEBVIEW_DATA_DIR = os.path.join(CURRENT_DIR, 'webview_data')

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
        """Pencere kapanırken tarayıcı sürecini güvenli şekilde temizle"""
        try:
            window = webview.windows[0] if webview.windows else None
            if window and hasattr(window, 'gui') and window.gui:
                browser = getattr(window.gui, '_browser', None)
                if browser is not None:
                    browser.Dispose()
        except Exception:
            pass
        return True

    try:
        window = webview.create_window(
            title="Kur'an-ı Kerim Kelime Kök Uzayı",
            url=f'http://127.0.0.1:{PORT}/index.html',
            width=1280, 
            height=800,
            background_color='#000000', # Siyah arka plan
            resizable=True,
            text_select=False # Uygulama hissi
        )
        window.events.closing += on_closing
        webview.start(debug=True, storage_path=WEBVIEW_DATA_DIR) # F12 ile konsol açılabilir
    except Exception as e:
        print(f"Pencere açılırken hata oluştu: {e}")
