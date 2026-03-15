import webview
import threading
import os
import sys
import http.server
import socketserver
import time
import json
import base64
import urllib.parse
import socket
import hashlib
import secrets
import struct
import datetime

try:
    import updater
except ImportError:
    updater = None

try:
    from logger import log_system, log_auth, log_crud, read_logs, LOG_DIR
except ImportError:
    # Fallback: logger yoksa sessiz kal
    class _NullLog:
        def info(self, *a, **kw): pass
        def warning(self, *a, **kw): pass
        def error(self, *a, **kw): pass
        def debug(self, *a, **kw): pass
        def critical(self, *a, **kw): pass
    log_system = log_auth = log_crud = _NullLog()
    read_logs = lambda **kw: []
    LOG_DIR = ''

try:
    import db as quran_db
    _HAS_DB = True
except ImportError:
    quran_db = None
    _HAS_DB = False

# --- AYARLAR ---
def _get_base_dir():
    """PyInstaller veya cx_Freeze ile paketlenmiş ya da normal çalışmaya göre kök dizini belirler."""
    if getattr(sys, 'frozen', False):
        if hasattr(sys, '_MEIPASS'):
            # PyInstaller: bundle edilen dosyalar _MEIPASS altında
            return sys._MEIPASS
        # cx_Freeze: dosyalar EXE'nin yanında
        return os.path.dirname(os.path.abspath(sys.executable))
    # Geliştirme modu: DataEngine klasörünün üst dizini (proje kökü)
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _get_user_data_dir():
    """Kullanıcı verilerinin (notes, datasets, keys, config) saklanacağı yazılabilir dizin.
    Frozen modda %APPDATA%/SemantikGalaksi kullanılır — MSI kaldırılsa bile veriler korunur."""
    if getattr(sys, 'frozen', False):
        appdata = os.environ.get('APPDATA', os.path.expanduser('~'))
        ud = os.path.join(appdata, 'SemantikGalaksi')
        os.makedirs(ud, exist_ok=True)
        return ud
    return os.path.dirname(os.path.abspath(__file__))


BASE_DIR = _get_base_dir()
USER_DATA_DIR = _get_user_data_dir()

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__)) if not getattr(sys, 'frozen', False) else USER_DATA_DIR
ROOT_DIR = os.path.join(BASE_DIR, 'Frontend')
WEBVIEW_DATA_DIR = os.path.join(USER_DATA_DIR, 'webview_data')
KEYS_FILE = os.path.join(USER_DATA_DIR, 'webview_data', '.api_keys')
DATASETS_DIR = os.path.join(USER_DATA_DIR, 'datasets')
NOTES_DIR = os.path.join(USER_DATA_DIR, 'notes')
CONFIG_FILE = os.path.join(USER_DATA_DIR, 'config.json')


def _migrate_old_data():
    """Eski kurulum dizinindeki (C:\\SemantikGalaksi) kullanıcı verilerini
    %APPDATA%/SemantikGalaksi altına taşır. Sadece frozen modda ve
    hedefte dosya yoksa kopyalar — mevcut veriyi ezmez."""
    if not getattr(sys, 'frozen', False):
        return
    import shutil
    old_base = os.path.dirname(os.path.abspath(sys.executable))
    if os.path.normcase(old_base) == os.path.normcase(USER_DATA_DIR):
        return
    migrations = [
        (os.path.join(old_base, 'notes'), NOTES_DIR),
        (os.path.join(old_base, 'webview_data'), WEBVIEW_DATA_DIR),
        (os.path.join(old_base, 'Frontend', 'datasets'), DATASETS_DIR),
        (os.path.join(old_base, 'config.json'), CONFIG_FILE),
        (os.path.join(old_base, 'quran.db'), os.path.join(USER_DATA_DIR, 'quran.db')),
    ]
    for src, dst in migrations:
        if not os.path.exists(src):
            continue
        if os.path.isdir(src):
            os.makedirs(dst, exist_ok=True)
            for fname in os.listdir(src):
                s = os.path.join(src, fname)
                d = os.path.join(dst, fname)
                if os.path.isfile(s) and not os.path.exists(d):
                    shutil.copy2(s, d)
        elif os.path.isfile(src) and not os.path.exists(dst):
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)


_migrate_old_data()


def _load_config():
    """config.json > env var > CLI arg > otomatik port bulma"""
    cfg = {
        'port': 8080, 'host': '0.0.0.0', 'auto_port': True,
        'mode': 'server',
        'server_ip': '127.0.0.1', 'server_port': 8080, 'server_ws_port': 8081
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                cfg.update(json.load(f))
        except Exception:
            pass
    env_port = os.environ.get('SGX_PORT')
    if env_port:
        try:
            cfg['port'] = int(env_port)
        except ValueError:
            pass
    env_host = os.environ.get('SGX_HOST')
    if env_host:
        cfg['host'] = env_host
    args = sys.argv[1:]
    for i, a in enumerate(args):
        if a == '--port' and i + 1 < len(args):
            try:
                cfg['port'] = int(args[i + 1])
            except ValueError:
                pass
        elif a == '--host' and i + 1 < len(args):
            cfg['host'] = args[i + 1]
        elif a == '--mode' and i + 1 < len(args):
            cfg['mode'] = args[i + 1]
    return cfg


def _find_free_port(host, start_port, max_tries=20):
    """Belirtilen porttan başlayarak boş port arar"""
    for offset in range(max_tries):
        port = start_port + offset
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind((host, port))
                return port
        except OSError:
            continue
    return start_port


_config = _load_config()
PORT = _config['port']
HOST = _config['host']
AUTO_PORT = _config.get('auto_port', True)
WS_PORT = _config.get('ws_port', PORT + 1)
RUN_MODE = _config.get('mode', 'server')
SERVER_IP = _config.get('server_ip', '127.0.0.1')
SERVER_PORT = _config.get('server_port', 8080)
SERVER_WS_PORT = _config.get('server_ws_port', 8081)

log_system.info('Yapilandirma yuklendi', mode=RUN_MODE, port=PORT, host=HOST, ws_port=WS_PORT)


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


def _load_env_api_key():
    """DataEngine/.env dosyasindan API_KEY degerini okur."""
    env_path = os.path.join(CURRENT_DIR, '.env')
    if not os.path.exists(env_path):
        return None
    try:
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('API_KEY=') and not line.startswith('#'):
                    return line.split('=', 1)[1].strip()
    except Exception:
        pass
    return None


def _sync_env_key_to_stores(window):
    """Eger .env'de API_KEY varsa hem .api_keys dosyasina hem JS KeyManager'a ekler."""
    env_key = _load_env_api_key()
    if not env_key:
        return
    keys = _load_keys()
    if not any(k['key'] == env_key for k in keys):
        keys.append({'key': env_key, 'status': 'pending'})
        _save_keys(keys)
    try:
        safe_key = env_key.replace("'", "\\'")
        window.evaluate_js(
            f"if(typeof KeyManager!=='undefined')KeyManager.addKey('{safe_key}');"
        )
    except Exception:
        pass


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
        log_crud.info('API key eklendi', key_prefix=key[:8])
        return True

    def remove_key(self, key):
        keys = [k for k in _load_keys() if k["key"] != key]
        _save_keys(keys)
        log_crud.info('API key silindi', key_prefix=key[:8])

    def update_status(self, key, status):
        keys = _load_keys()
        for k in keys:
            if k["key"] == key:
                k["status"] = status
        _save_keys(keys)

    def get_raw_keys(self):
        """Tam anahtarları döndürür (sadece JS tarafından API çağrısı için)."""
        return [k["key"] for k in _load_keys()]

    def save_file(self, content, filename):
        """Native OS 'Farkli Kaydet' diyalogu ile dosya indirme"""
        try:
            if filename.endswith('.csv'):
                file_types = ('CSV Dosyalari (*.csv)',)
            elif filename.endswith('.json'):
                file_types = ('JSON Dosyalari (*.json)',)
            else:
                file_types = ('Tum Dosyalar (*.*)',)
            result = self._window.create_file_dialog(
                webview.SAVE_DIALOG,
                save_filename=filename,
                file_types=file_types
            )
            if result:
                filepath = result if isinstance(result, str) else result[0]
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                return True
        except Exception:
            pass
        return False

    def stop_besmele(self):
        """Besmele sesini durdur (JS bridge'den çağrılır)"""
        try:
            import winsound
            winsound.PlaySound(None, winsound.SND_PURGE)
        except Exception:
            pass

    def list_locales(self):
        """locales/ klasoründeki JSON dil dosyalarini listele (i18n auto-discover icin)"""
        try:
            locales_dir = os.path.join(ROOT_DIR, 'locales')
            if not os.path.isdir(locales_dir):
                return []
            return [f for f in os.listdir(locales_dir) if f.endswith('.json') and not f.startswith('roots_')]
        except Exception:
            return []

    def save_lang_pref(self, code):
        """Secili dil kodunu dosyaya yaz (besmele icin)"""
        try:
            pref_path = os.path.join(ROOT_DIR, 'locales', '.last_lang')
            os.makedirs(os.path.dirname(pref_path), exist_ok=True)
            with open(pref_path, 'w', encoding='utf-8') as f:
                f.write(code)
        except Exception:
            pass

    def check_update(self):
        """GitHub'dan güncelleme kontrolü"""
        if not updater:
            return {'available': False, 'error': 'Updater not available'}
        return updater.check_for_update()

    def do_update(self, msi_url, msi_name):
        """Yedek al → MSI indir → yükleyici başlat → uygulamayı kapat"""
        if not updater:
            return {'error': 'Updater not available'}
        try:
            updater.download_and_install(msi_url, msi_name)
            os._exit(0)
        except Exception as e:
            return {'error': str(e)}

    def create_backup(self):
        """Manuel yedekleme"""
        if not updater:
            return {'error': 'Updater not available'}
        try:
            path = updater.create_backup()
            return {'path': path}
        except Exception as e:
            return {'error': str(e)}


def get_local_ip():
    """LAN IP adresini bul"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


USERS_FILE = os.path.join(CURRENT_DIR, 'webview_data', 'users.json')
_sessions = {}

# Korumali dosyalar — sadece admin duzenleyebilir
PROTECTED_DATASETS = set()
PROTECTED_LOCALES = set()

# Değişiklik geçmişi limiti (dosya başına)
MAX_HISTORY_ENTRIES = 50


def _hash_pw(pw, salt=None):
    if not salt:
        salt = secrets.token_hex(16)
    return salt, hashlib.sha256((salt + pw).encode()).hexdigest()


def _load_users():
    _ensure_dir()
    if not os.path.exists(USERS_FILE):
        s, h = _hash_pw('admin123')
        users = [{'username': 'admin', 'password': h, 'salt': s, 'role': 'admin'}]
        _save_users(users)
        return users
    try:
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []


def _save_users(users):
    _ensure_dir()
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=2)


def _get_session(headers):
    auth = headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None
    return _sessions.get(auth[7:])


# --- WebSocket Sunucusu (raw implementation) ---
class WebSocketServer:
    GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

    def __init__(self):
        self._clients = []
        self._lock = threading.Lock()
        self._running = False

    def start(self, host, port):
        srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            srv.bind((host, port))
            srv.listen(20)
            self._running = True
            log_system.info('WebSocket sunucusu baslatildi', address=f'ws://{host}:{port}')
            while True:
                conn, addr = srv.accept()
                threading.Thread(target=self._handle, args=(conn, addr), daemon=True).start()
        except OSError:
            log_system.error('WebSocket portu kullanilamadi', port=port)

    def _recv_all(self, sock, n):
        buf = b''
        while len(buf) < n:
            chunk = sock.recv(n - len(buf))
            if not chunk:
                raise ConnectionError
            buf += chunk
        return buf

    def _handle(self, conn, addr=None):
        session = None
        client_ip = addr[0] if addr else 'bilinmiyor'
        try:
            data = conn.recv(4096).decode('utf-8', errors='ignore')
            if 'upgrade: websocket' not in data.lower():
                conn.close()
                return
            first_line = data.split('\r\n')[0]
            path = first_line.split(' ')[1] if ' ' in first_line else '/'
            parsed = urllib.parse.urlparse(path)
            params = urllib.parse.parse_qs(parsed.query)
            token = params.get('token', [None])[0]
            session = _sessions.get(token) if token else None
            if not session:
                conn.send(b'HTTP/1.1 401 Unauthorized\r\n\r\n')
                conn.close()
                return
            hostname = client_ip
            try:
                hostname = socket.getfqdn(client_ip)
            except Exception:
                pass
            ws_key = None
            for line in data.split('\r\n'):
                if line.lower().startswith('sec-websocket-key:'):
                    ws_key = line.split(':', 1)[1].strip()
                    break
            if not ws_key:
                conn.close()
                return
            accept = base64.b64encode(
                hashlib.sha1((ws_key + self.GUID).encode()).digest()
            ).decode()
            handshake = (
                'HTTP/1.1 101 Switching Protocols\r\n'
                'Upgrade: websocket\r\n'
                'Connection: Upgrade\r\n'
                f'Sec-WebSocket-Accept: {accept}\r\n\r\n'
            )
            conn.send(handshake.encode())
            with self._lock:
                self._clients.append({
                    'sock': conn,
                    'session': session,
                    'ip': client_ip,
                    'hostname': hostname,
                    'connected_at': datetime.datetime.now().isoformat()
                })
            log_system.info('WebSocket baglantisi', user=session['username'], ip=client_ip, hostname=hostname)
            self.broadcast(json.dumps({
                'type': 'user_joined',
                'username': session['username'],
                'online': self.online_users()
            }), exclude=conn)
            while True:
                frame = self._read_frame(conn)
                if frame is None:
                    break
        except Exception:
            pass
        finally:
            with self._lock:
                self._clients = [c for c in self._clients if c['sock'] != conn]
            if session:
                log_system.info('WebSocket baglanti kesildi', user=session['username'])
                self.broadcast(json.dumps({
                    'type': 'user_left',
                    'username': session['username'],
                    'online': self.online_users()
                }))
            try:
                conn.close()
            except Exception:
                pass

    def _read_frame(self, sock):
        header = self._recv_all(sock, 2)
        opcode = header[0] & 0x0F
        is_masked = bool(header[1] & 0x80)
        length = header[1] & 0x7F
        if opcode == 0x8:
            return None
        if length == 126:
            length = struct.unpack('>H', self._recv_all(sock, 2))[0]
        elif length == 127:
            length = struct.unpack('>Q', self._recv_all(sock, 8))[0]
        mask_key = self._recv_all(sock, 4) if is_masked else None
        payload = bytearray(self._recv_all(sock, length))
        if mask_key:
            for i in range(len(payload)):
                payload[i] ^= mask_key[i % 4]
        if opcode == 0x9:
            self._send_frame(sock, bytes(payload), 0xA)
            return self._read_frame(sock)
        return payload.decode('utf-8')

    def _send_frame(self, sock, data, opcode=0x1):
        if isinstance(data, str):
            data = data.encode('utf-8')
        frame = bytearray()
        frame.append(0x80 | opcode)
        length = len(data)
        if length < 126:
            frame.append(length)
        elif length < 65536:
            frame.append(126)
            frame.extend(struct.pack('>H', length))
        else:
            frame.append(127)
            frame.extend(struct.pack('>Q', length))
        frame.extend(data)
        sock.sendall(bytes(frame))

    def broadcast(self, message, exclude=None):
        if not self._running:
            return
        with self._lock:
            dead = []
            for c in self._clients:
                if c['sock'] == exclude:
                    continue
                try:
                    self._send_frame(c['sock'], message)
                except Exception:
                    dead.append(c)
            for d in dead:
                if d in self._clients:
                    self._clients.remove(d)

    def online_users(self):
        with self._lock:
            return list(set(
                c['session'].get('username', '')
                for c in self._clients if c.get('session')
            ))

    def online_users_detail(self):
        with self._lock:
            seen = {}
            for c in self._clients:
                s = c.get('session')
                if not s:
                    continue
                uname = s.get('username', '')
                if uname not in seen:
                    seen[uname] = {
                        'username': uname,
                        'ip': c.get('ip', 'bilinmiyor'),
                        'hostname': c.get('hostname', 'bilinmiyor'),
                        'connected_at': c.get('connected_at', '')
                    }
            return list(seen.values())


ws_server = WebSocketServer()


class ProjeHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path == '/api/auth/me':
            self._auth_me()
        elif path == '/api/auth/users':
            self._list_users()
        elif path == '/api/datasets':
            self._list_datasets()
        elif path == '/api/locales':
            self._list_locales_api()
        elif path.startswith('/api/locale/'):
            self._get_locale()
        elif path.startswith('/api/download/'):
            self._download_file()
        elif path.startswith('/api/dataset/'):
            self._get_dataset()
        elif path == '/api/online-users':
            self._online_users()
        elif path == '/api/notes':
            self._get_notes()
        elif path == '/api/info':
            self._server_info()
        elif path == '/api/logs':
            self._get_logs()
        elif path == '/api/db/integrity':
            self._check_integrity()
        elif path == '/api/db/audit':
            self._db_audit()
        elif path == '/api/db/stats':
            self._db_stats()
        elif path == '/api/db/changelog':
            self._db_changelog()
        elif path == '/api/db/export':
            self._db_export()
        elif path == '/api/db/data':
            self._db_full_data()
        elif path == '/api/db/roots-dict':
            self._db_full_roots()
        elif path == '/api/db/verses':
            self._db_list_verses()
        elif path == '/api/db/roots-list':
            self._db_list_roots()
        elif path == '/api/db/translations':
            self._db_list_translations()
        elif path.startswith('/api/db/root-translations/'):
            self._db_root_translations()
        elif path == '/api/db/locales':
            self._db_list_locales()
        elif path.startswith('/api/db/locale/'):
            self._db_get_locale()
        elif path.startswith('/api/db/root/'):
            self._db_get_root_detail()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/auth/login':
            self._login()
        elif self.path == '/api/auth/logout':
            self._logout()
        elif self.path == '/api/auth/users':
            self._create_user()
        elif self.path == '/api/auth/change-password':
            self._change_password()
        elif self.path.startswith('/api/locale/'):
            self._save_locale()
        elif self.path == '/api/roots':
            self._save_roots()
        elif self.path == '/api/dataset-rename':
            self._rename_dataset()
        elif self.path == '/api/dataset-duplicate':
            self._duplicate_dataset()
        elif self.path.startswith('/api/dataset/'):
            self._save_dataset()
        elif self.path == '/api/notes':
            self._save_notes()
        elif self.path == '/api/db/root':
            self._db_add_root()

    def do_PUT(self):
        if self.path.startswith('/api/auth/user/'):
            self._update_user_role()
        elif self.path.startswith('/api/db/verse/') and self.path.endswith('/roots'):
            self._db_update_verse_roots()
        elif self.path.startswith('/api/db/verse/'):
            self._db_update_verse()
        elif self.path.startswith('/api/db/root/'):
            self._db_update_root()
        elif self.path.startswith('/api/db/locale/'):
            self._db_save_locale()

    def do_DELETE(self):
        if self.path.startswith('/api/auth/user/'):
            self._delete_user()
        elif self.path.startswith('/api/note/'):
            self._delete_note()
        elif self.path.startswith('/api/dataset/'):
            self._delete_dataset()
        elif self.path.startswith('/api/db/root/'):
            self._db_delete_root()

    def _read_body(self):
        length = int(self.headers.get('Content-Length', 0))
        if not length:
            return None
        try:
            return json.loads(self.rfile.read(length))
        except Exception:
            return None

    def _json_response(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(body)

    # --- Auth Endpoints ---
    def _login(self):
        body = self._read_body()
        if not body:
            self._json_response({'error': 'Geçersiz istek'}, 400)
            return
        username = body.get('username', '').strip()
        password = body.get('password', '')
        users = _load_users()
        user = next((u for u in users if u['username'] == username), None)
        if not user:
            log_auth.warning('Basarisiz giris - kullanici bulunamadi', user=username, ip=self.client_address[0])
            self._json_response({'error': 'Kullanıcı bulunamadı'}, 401)
            return
        _, hashed = _hash_pw(password, user['salt'])
        if hashed != user['password']:
            log_auth.warning('Basarisiz giris - hatali sifre', user=username, ip=self.client_address[0])
            self._json_response({'error': 'Hatalı şifre'}, 401)
            return
        token = secrets.token_hex(32)
        _sessions[token] = {'username': username, 'role': user['role']}
        log_auth.info('Giris basarili', user=username, role=user['role'], ip=self.client_address[0])
        self._json_response({'token': token, 'username': username, 'role': user['role']})

    def _logout(self):
        auth = self.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            session = _sessions.pop(auth[7:], None)
            if session:
                log_auth.info('Cikis yapildi', user=session.get('username', '?'))
        self._json_response({'ok': True})

    def _auth_me(self):
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        self._json_response({'username': session['username'], 'role': session['role']})

    def _list_users(self):
        session = _get_session(self.headers)
        if not session or session['role'] != 'admin':
            self._json_response({'error': 'Yetkisiz'}, 403)
            return
        self._json_response([{'username': u['username'], 'role': u['role']} for u in _load_users()])

    def _create_user(self):
        session = _get_session(self.headers)
        if not session or session['role'] != 'admin':
            self._json_response({'error': 'Yetkisiz'}, 403)
            return
        body = self._read_body()
        if not body:
            self._json_response({'error': 'Geçersiz istek'}, 400)
            return
        username = body.get('username', '').strip()
        password = body.get('password', '').strip()
        role = body.get('role', 'viewer')
        if not username or not password:
            self._json_response({'error': 'Kullanıcı adı ve şifre gerekli'}, 400)
            return
        if role not in ('admin', 'editor', 'viewer'):
            role = 'viewer'
        users = _load_users()
        if any(u['username'] == username for u in users):
            self._json_response({'error': 'Bu kullanıcı zaten var'}, 409)
            return
        s, h = _hash_pw(password)
        users.append({'username': username, 'password': h, 'salt': s, 'role': role})
        _save_users(users)
        log_auth.info('Kullanici olusturuldu', user=username, role=role, by=session['username'])
        self._json_response({'ok': True, 'username': username, 'role': role})

    def _delete_user(self):
        session = _get_session(self.headers)
        if not session or session['role'] != 'admin':
            self._json_response({'error': 'Yetkisiz'}, 403)
            return
        username = urllib.parse.unquote(self.path[len('/api/auth/user/'):])
        if username == session['username']:
            self._json_response({'error': 'Kendinizi silemezsiniz'}, 400)
            return
        users = [u for u in _load_users() if u['username'] != username]
        _save_users(users)
        for t in [t for t, s in _sessions.items() if s['username'] == username]:
            del _sessions[t]
        log_auth.info('Kullanici silindi', user=username, by=session['username'])
        self._json_response({'ok': True})

    def _update_user_role(self):
        session = _get_session(self.headers)
        if not session or session['role'] != 'admin':
            self._json_response({'error': 'Yetkisiz'}, 403)
            return
        username = urllib.parse.unquote(self.path[len('/api/auth/user/'):])
        body = self._read_body()
        role = body.get('role', 'viewer') if body else 'viewer'
        if role not in ('admin', 'editor', 'viewer'):
            role = 'viewer'
        users = _load_users()
        for u in users:
            if u['username'] == username:
                u['role'] = role
        _save_users(users)
        for s in _sessions.values():
            if s['username'] == username:
                s['role'] = role
        log_auth.info('Rol degistirildi', user=username, role=role, by=session['username'])
        self._json_response({'ok': True})

    def _change_password(self):
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        body = self._read_body()
        if not body:
            self._json_response({'error': 'Geçersiz istek'}, 400)
            return
        old_pw = body.get('oldPassword', '')
        new_pw = body.get('newPassword', '')
        if not new_pw:
            self._json_response({'error': 'Yeni şifre gerekli'}, 400)
            return
        users = _load_users()
        user = next((u for u in users if u['username'] == session['username']), None)
        if not user:
            self._json_response({'error': 'Kullanıcı bulunamadı'}, 404)
            return
        _, hashed = _hash_pw(old_pw, user['salt'])
        if hashed != user['password']:
            self._json_response({'error': 'Mevcut şifre hatalı'}, 401)
            return
        s, h = _hash_pw(new_pw)
        user['salt'] = s
        user['password'] = h
        _save_users(users)
        log_auth.info('Sifre degistirildi', user=session['username'])
        self._json_response({'ok': True})

    # --- Notes Endpoints ---
    def _get_notes(self):
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        username = session['username']
        os.makedirs(NOTES_DIR, exist_ok=True)
        notes_file = os.path.join(NOTES_DIR, f'{username}.json')
        if not os.path.exists(notes_file):
            self._json_response([])
            return
        try:
            with open(notes_file, 'r', encoding='utf-8') as f:
                notes = json.load(f)
            self._json_response(notes)
        except Exception:
            self._json_response([])

    def _save_notes(self):
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        body = self._read_body()
        if body is None:
            self._json_response({'error': 'Geçersiz veri'}, 400)
            return
        username = session['username']
        os.makedirs(NOTES_DIR, exist_ok=True)
        notes_file = os.path.join(NOTES_DIR, f'{username}.json')
        try:
            with open(notes_file, 'w', encoding='utf-8') as f:
                json.dump(body, f, ensure_ascii=False, indent=2)
            log_crud.info('Notlar kaydedildi', user=username)
            self._json_response({'ok': True})
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

    def _delete_note(self):
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        note_id = urllib.parse.unquote(self.path[len('/api/note/'):])
        username = session['username']
        notes_file = os.path.join(NOTES_DIR, f'{username}.json')
        if not os.path.exists(notes_file):
            self._json_response({'ok': True})
            return
        try:
            with open(notes_file, 'r', encoding='utf-8') as f:
                notes = json.load(f)
            notes = [n for n in notes if n.get('id') != note_id]
            with open(notes_file, 'w', encoding='utf-8') as f:
                json.dump(notes, f, ensure_ascii=False, indent=2)
            log_crud.info('Not silindi', user=username, note_id=note_id)
            self._json_response({'ok': True})
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

    # --- Roots Endpoint (bulk) ---
    def _save_roots(self):
        """Kok sozlugu toplu kaydetme — sadece admin."""
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        if session['role'] != 'admin':
            self._json_response({'error': 'Kok sozlugu sadece admin tarafindan duzenlenebilir'}, 403)
            return
        data = self._read_body()
        if data is None or not isinstance(data, dict):
            self._json_response({'error': 'Gecersiz JSON'}, 400)
            return
        username = session['username']
        try:
            added, updated, removed = quran_db.save_roots_bulk(data, user=username)
            log_crud.info('Kok sozlugu kaydedildi (SQLite)',
                          user=username, added=added, updated=updated, removed=removed)
            self._json_response({'ok': True, 'added': added, 'updated': updated, 'removed': removed})
        except Exception as e:
            log_crud.error('Kok sozlugu kaydetme hatasi', user=username, error=str(e))
            self._json_response({'error': str(e)}, 500)

    # --- Locale Endpoints ---
    def _list_locales_api(self):
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        locales_dir = os.path.join(ROOT_DIR, 'locales')
        result = []
        if os.path.isdir(locales_dir):
            for f in sorted(os.listdir(locales_dir)):
                if not f.endswith('.json') or f.startswith('roots_'):
                    continue
                path = os.path.join(locales_dir, f)
                try:
                    stat = os.stat(path)
                    result.append({
                        'name': f,
                        'sizeKB': round(stat.st_size / 1024, 1),
                        'date': time.strftime('%d.%m.%Y %H:%M', time.localtime(stat.st_mtime))
                    })
                except Exception:
                    pass
        self._json_response(result)

    def _get_locale(self):
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        name = urllib.parse.unquote(self.path[len('/api/locale/'):])
        path = os.path.join(ROOT_DIR, 'locales', name)
        if not os.path.exists(path):
            self._json_response({'error': 'Bulunamadi'}, 404)
            return
        with open(path, 'r', encoding='utf-8') as f:
            self._json_response(json.load(f))

    def _save_locale(self):
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        if session['role'] == 'viewer':
            self._json_response({'error': 'Duzenleme yetkiniz yok'}, 403)
            return
        name = urllib.parse.unquote(self.path[len('/api/locale/'):])
        if name in PROTECTED_LOCALES and session['role'] != 'admin':
            self._json_response({'error': 'Bu locale dosyasi korumali'}, 403)
            return
        data = self._read_body()
        if data is None:
            self._json_response({'error': 'Gecersiz JSON'}, 400)
            return
        username = session['username']
        # roots_{lang}.json ise SQLite'a yonlendir
        if name.startswith('roots_') and name.endswith('.json') and _HAS_DB:
            lang = name.replace('roots_', '').replace('.json', '')
            try:
                added, updated = quran_db.save_root_translations(lang, data, user=username)
                log_crud.info('Locale kok cevirisi kaydedildi (SQLite)',
                              user=username, lang=lang, added=added, updated=updated)
                self._json_response({'ok': True, 'name': name, 'added': added, 'updated': updated})
            except Exception as e:
                log_crud.error('Locale kok cevirisi kaydetme hatasi', user=username, error=str(e))
                self._json_response({'error': str(e)}, 500)
            return
        # Normal locale dosyasi (TR-tr.json, EN-en.json vb.)
        locales_dir = os.path.join(ROOT_DIR, 'locales')
        os.makedirs(locales_dir, exist_ok=True)
        path = os.path.join(locales_dir, name)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        log_crud.info('Locale kaydedildi', user=username, target=name)
        self._json_response({'ok': True, 'name': name})

    # --- Dataset Endpoints ---
    def _list_datasets(self):
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        os.makedirs(DATASETS_DIR, exist_ok=True)
        result = []
        for f in sorted(os.listdir(DATASETS_DIR)):
            if not f.endswith('.json'):
                continue
            path = os.path.join(DATASETS_DIR, f)
            try:
                stat = os.stat(path)
                size_bytes = stat.st_size
                with open(path, 'r', encoding='utf-8') as fp:
                    data = json.load(fp)
                result.append({
                    'name': f,
                    'nodeCount': len(data.get('nodes', [])),
                    'modified': stat.st_mtime,
                    'date': time.strftime('%d.%m.%Y %H:%M', time.localtime(stat.st_mtime)),
                    'modifiedBy': data.get('_meta', {}).get('modifiedBy', ''),
                    'sizeKB': round(size_bytes / 1024, 1)
                })
            except Exception:
                pass
        self._json_response(result)

    def _get_dataset(self):
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        name = urllib.parse.unquote(self.path[len('/api/dataset/'):])
        # Korumali dosyalar ROOT_DIR'de, diger datasetler DATASETS_DIR'de
        if name in PROTECTED_DATASETS:
            path = os.path.join(ROOT_DIR, name)
        else:
            path = os.path.join(DATASETS_DIR, name)
        if not os.path.exists(path):
            self._json_response({'error': 'Bulunamadi'}, 404)
            return
        with open(path, 'r', encoding='utf-8') as f:
            self._json_response(json.load(f))

    def _save_dataset(self):
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        if session['role'] == 'viewer':
            self._json_response({'error': 'Düzenleme yetkiniz yok'}, 403)
            return
        name = urllib.parse.unquote(self.path[len('/api/dataset/'):])
        if name in PROTECTED_DATASETS and session['role'] != 'admin':
            self._json_response({'error': 'Bu dosya korumali, sadece admin duzenleyebilir'}, 403)
            return
        data = self._read_body()
        if data is None:
            self._json_response({'error': 'Geçersiz JSON'}, 400)
            return
        if '_meta' not in data:
            data['_meta'] = {}
        # --- Degisiklik gecmisi ---
        if name in PROTECTED_DATASETS:
            path = os.path.join(ROOT_DIR, name)
        else:
            os.makedirs(DATASETS_DIR, exist_ok=True)
            path = os.path.join(DATASETS_DIR, name)
        old_summary = None
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    old_data = json.load(f)
                old_nodes = len(old_data.get('nodes', [])) if isinstance(old_data, dict) else 0
                new_nodes = len(data.get('nodes', [])) if isinstance(data, dict) else 0
                old_keys = len(old_data) if isinstance(old_data, dict) else 0
                new_keys = len(data) if isinstance(data, dict) else 0
                old_summary = {
                    'nodeCount': old_nodes,
                    'keyCount': old_keys,
                    'sizeBytes': os.path.getsize(path)
                }
                new_summary = {
                    'nodeCount': new_nodes,
                    'keyCount': new_keys
                }
            except Exception:
                old_summary = None
        history_entry = {
            'user': session['username'],
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S'),
            'action': 'update' if old_summary else 'create'
        }
        if old_summary:
            history_entry['before'] = old_summary
            history_entry['after'] = new_summary
        if '_history' not in data['_meta']:
            data['_meta']['_history'] = []
        data['_meta']['_history'].insert(0, history_entry)
        data['_meta']['_history'] = data['_meta']['_history'][:MAX_HISTORY_ENTRIES]
        data['_meta']['modifiedBy'] = session['username']
        data['_meta']['modifiedAt'] = time.strftime('%Y-%m-%dT%H:%M:%S')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        log_crud.info('Dataset kaydedildi', user=session['username'], target=name)
        self._json_response({'ok': True, 'name': name})
        ws_server.broadcast(json.dumps({
            'type': 'dataset_saved', 'name': name,
            'username': session['username']
        }))

    def _delete_dataset(self):
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        if session['role'] == 'viewer':
            self._json_response({'error': 'Silme yetkiniz yok'}, 403)
            return
        name = urllib.parse.unquote(self.path[len('/api/dataset/'):])
        if name in PROTECTED_DATASETS:
            self._json_response({'error': 'Bu dosya korumali, silinemez'}, 403)
            return
        path = os.path.join(DATASETS_DIR, name)
        if os.path.exists(path):
            os.remove(path)
        log_crud.info('Dataset silindi', user=session['username'], target=name)
        self._json_response({'ok': True})
        ws_server.broadcast(json.dumps({
            'type': 'dataset_deleted', 'name': name,
            'username': session['username']
        }))

    # --- Download Endpoint ---
    def _download_file(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        token = params.get('token', [None])[0]
        session = _sessions.get(token) if token else _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        name = urllib.parse.unquote(parsed.path[len('/api/download/'):])
        filepath = os.path.join(DATASETS_DIR, name)
        if not os.path.exists(filepath):
            self._json_response({'error': 'Bulunamadı'}, 404)
            return
        with open(filepath, 'rb') as f:
            content = f.read()
        self.send_response(200)
        self.send_header('Content-Type', 'application/octet-stream')
        self.send_header('Content-Disposition', f'attachment; filename="{name}"')
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    # --- Rename / Duplicate ---
    def _rename_dataset(self):
        session = _get_session(self.headers)
        if not session or session['role'] == 'viewer':
            self._json_response({'error': 'Yetkisiz'}, 403)
            return
        body = self._read_body()
        if not body:
            self._json_response({'error': 'Geçersiz istek'}, 400)
            return
        old_name = body.get('oldName', '')
        new_name = body.get('newName', '')
        if old_name in PROTECTED_DATASETS:
            self._json_response({'error': 'Bu dosya korumali, yeniden adlandirilamaz'}, 403)
            return
        if not old_name or not new_name:
            self._json_response({'error': 'İsim gerekli'}, 400)
            return
        if not new_name.endswith('.json'):
            new_name += '.json'
        old_path = os.path.join(DATASETS_DIR, old_name)
        new_path = os.path.join(DATASETS_DIR, new_name)
        if not os.path.exists(old_path):
            self._json_response({'error': 'Kaynak bulunamadı'}, 404)
            return
        if os.path.exists(new_path):
            self._json_response({'error': 'Bu isimde dosya zaten var'}, 409)
            return
        os.rename(old_path, new_path)
        log_crud.info('Dataset yeniden adlandirildi', user=session['username'], old=old_name, new=new_name)
        self._json_response({'ok': True, 'name': new_name})
        ws_server.broadcast(json.dumps({
            'type': 'dataset_renamed', 'oldName': old_name,
            'newName': new_name, 'username': session['username']
        }))

    def _duplicate_dataset(self):
        session = _get_session(self.headers)
        if not session or session['role'] == 'viewer':
            self._json_response({'error': 'Yetkisiz'}, 403)
            return
        body = self._read_body()
        if not body:
            self._json_response({'error': 'Geçersiz istek'}, 400)
            return
        source = body.get('sourceName', '')
        new_name = body.get('newName', '')
        if new_name and new_name.rstrip('.json') + '.json' in PROTECTED_DATASETS:
            self._json_response({'error': 'Korumali dosya adi kullanilamaz'}, 403)
            return
        if not source or not new_name:
            self._json_response({'error': 'İsim gerekli'}, 400)
            return
        if not new_name.endswith('.json'):
            new_name += '.json'
        src_path = os.path.join(DATASETS_DIR, source)
        dst_path = os.path.join(DATASETS_DIR, new_name)
        if not os.path.exists(src_path):
            self._json_response({'error': 'Kaynak bulunamadı'}, 404)
            return
        if os.path.exists(dst_path):
            self._json_response({'error': 'Bu isimde dosya zaten var'}, 409)
            return
        import shutil
        shutil.copy2(src_path, dst_path)
        log_crud.info('Dataset kopyalandi', user=session['username'], source=source, target=new_name)
        self._json_response({'ok': True, 'name': new_name})
        ws_server.broadcast(json.dumps({
            'type': 'dataset_duplicated', 'sourceName': source,
            'newName': new_name, 'username': session['username']
        }))

    def _online_users(self):
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        current_user = session.get('username', '')
        current_ip = self.client_address[0] if self.client_address else 'bilinmiyor'
        details = ws_server.online_users_detail()
        usernames = [d['username'] for d in details]
        if current_user and current_user not in usernames:
            details.append({
                'username': current_user,
                'ip': current_ip,
                'hostname': current_ip,
                'connected_at': datetime.datetime.now().isoformat()
            })
        self._json_response({
            'users': [d['username'] for d in details],
            'details': details
        })

    def _server_info(self):
        self._json_response({
            'ip': get_local_ip(),
            'port': PORT,
            'wsPort': WS_PORT,
            'url': f'http://{get_local_ip()}:{PORT}'
        })

    def _get_logs(self):
        """Admin icin log okuma endpoint'i.
        Query params: category=system|auth|crud|all, limit=200, level=INFO|WARNING|ERROR"""
        session = _get_session(self.headers)
        if not session or session['role'] != 'admin':
            self._json_response({'error': 'Yetkisiz'}, 403)
            return
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        category = params.get('category', ['all'])[0]
        limit = int(params.get('limit', ['200'])[0])
        level = params.get('level', [None])[0]
        entries = read_logs(category=category, limit=limit, level=level)
        self._json_response({'entries': entries, 'total': len(entries), 'logDir': LOG_DIR})

    # --- Database Integrity & Stats Endpoints ---
    def _check_integrity(self):
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        if session['role'] != 'admin':
            self._json_response({'error': 'Sadece admin butunluk kontrolu yapabilir'}, 403)
            return
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        try:
            report = quran_db.check_integrity()
            log_system.info('Butunluk kontrolu yapildi', user=session['username'],
                            healthy=report.get('healthy', False))
            self._json_response(report)
        except Exception as e:
            log_system.error('Butunluk kontrolu hatasi', error=str(e))
            self._json_response({'error': str(e)}, 500)

    def _db_audit(self):
        """Kapsamli veri denetim raporu."""
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        try:
            report = quran_db.data_audit()
            self._json_response(report)
        except Exception as e:
            log_system.error('Veri denetim hatasi', error=str(e))
            self._json_response({'error': str(e)}, 500)

    def _db_stats(self):
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        try:
            stats = quran_db.get_stats()
            self._json_response(stats)
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

    def _db_changelog(self):
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        if session['role'] != 'admin':
            self._json_response({'error': 'Sadece admin degisiklik gecmisini gorebilir'}, 403)
            return
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        try:
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            table_name = params.get('table', [None])[0]
            if table_name == '':
                table_name = None
            page = int(params.get('page', [1])[0])
            limit = int(params.get('limit', [50])[0])
            search = params.get('search', [''])[0]
            result = quran_db.get_change_log(table_name=table_name, limit=limit, page=page, search=search)
            self._json_response(result)
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

    def _db_export(self):
        """SQLite'tan tum JSON dosyalarini yeniden olusturur (admin)."""
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        if session['role'] != 'admin':
            self._json_response({'error': 'Sadece admin JSON export yapabilir'}, 403)
            return
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        try:
            results = quran_db.export_all()
            log_system.info('JSON export tamamlandi', user=session['username'],
                            quran_data=results.get('quran_data', 0),
                            quran_roots=results.get('quran_roots', 0))
            self._json_response({'ok': True, 'exported': results})
        except Exception as e:
            log_system.error('JSON export hatasi', error=str(e))
            self._json_response({'error': str(e)}, 500)

    # --- Database Grid API Endpoints ---

    def _db_full_data(self):
        """Frontend 3D viz icin tam veri (quran_data.json yerine)."""
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        try:
            data = quran_db.get_full_data()
            self._json_response(data)
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

    def _db_full_roots(self):
        """Frontend rootDictionary icin tam veri (quran_roots.json yerine)."""
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        try:
            data = quran_db.get_full_roots()
            self._json_response(data)
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

    def _db_root_translations(self):
        """Belirli bir dil icin kok cevirilerini dondurur (roots_{lang}.json yerine)."""
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        try:
            lang = urllib.parse.unquote(self.path.split('/api/db/root-translations/')[-1])
            if not lang:
                self._json_response({'error': 'Dil kodu gerekli'}, 400)
                return
            data = quran_db.get_root_translations(lang)
            self._json_response(data)
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

    def _db_list_locales(self):
        """Mevcut UI dil listesini dondurur."""
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        try:
            data = quran_db.list_ui_languages()
            self._json_response(data)
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

    def _db_get_locale(self):
        """Belirli bir dil icin UI cevirilerini dondurur."""
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        try:
            lang = urllib.parse.unquote(self.path.split('/api/db/locale/')[-1])
            data = quran_db.get_ui_locale(lang)
            if data is None:
                self._json_response({'error': 'Dil bulunamadi'}, 404)
                return
            self._json_response(data)
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

    def _db_save_locale(self):
        """UI cevirilerini kaydeder — sadece admin."""
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        if session['role'] != 'admin':
            self._json_response({'error': 'Sadece admin duzenleyebilir'}, 403)
            return
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        try:
            lang = urllib.parse.unquote(self.path.split('/api/db/locale/')[-1])
            data = self._read_body()
            if not data or not isinstance(data, dict):
                self._json_response({'error': 'Gecersiz JSON'}, 400)
                return
            count = quran_db.save_ui_locale(lang, data, user=session['username'])
            self._json_response({'ok': True, 'lang': lang, 'count': count})
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

    def _db_list_verses(self):
        """Sayfalamali ayet listesi (editor grid)."""
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        try:
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            page = int(params.get('page', [1])[0])
            limit = int(params.get('limit', [50])[0])
            search = params.get('search', [''])[0]
            result = quran_db.list_verses(page=page, limit=limit, search=search)
            self._json_response(result)
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

    def _db_list_roots(self):
        """Sayfalamali kok listesi (editor grid)."""
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        try:
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            page = int(params.get('page', [1])[0])
            limit = int(params.get('limit', [50])[0])
            search = params.get('search', [''])[0]
            result = quran_db.list_roots(page=page, limit=limit, search=search)
            self._json_response(result)
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

    def _db_list_translations(self):
        """Sayfalamali ceviri listesi (editor grid)."""
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        try:
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            page = int(params.get('page', [1])[0])
            limit = int(params.get('limit', [50])[0])
            search = params.get('search', [''])[0]
            lang = params.get('lang', [None])[0]
            result = quran_db.list_translations(lang=lang, page=page, limit=limit, search=search)
            self._json_response(result)
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

    def _db_get_root_detail(self):
        """Tek bir kokun detayi."""
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        try:
            root_key = urllib.parse.unquote(self.path.split('/api/db/root/')[-1])
            result = quran_db.get_root_detail(root_key)
            if result is None:
                self._json_response({'error': 'Kok bulunamadi'}, 404)
                return
            self._json_response(result)
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

    def _db_update_verse(self):
        """Ayet meal/dipnot guncelleme (admin/editor)."""
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        if session['role'] == 'viewer':
            self._json_response({'error': 'Viewer rolunde duzenleme yapilamaz'}, 403)
            return
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        body = self._read_body()
        if not body:
            self._json_response({'error': 'Gecersiz istek'}, 400)
            return
        try:
            verse_id = urllib.parse.unquote(self.path.split('/api/db/verse/')[-1])
            ok = quran_db.update_verse(
                verse_id,
                meal=body.get('meal'),
                dipnot=body.get('dipnot'),
                user=session['username']
            )
            if not ok:
                self._json_response({'error': 'Ayet bulunamadi veya degisiklik yok'}, 404)
                return
            log_crud.info('Ayet guncellendi', verse_id=verse_id, user=session['username'])
            self._json_response({'ok': True, 'verse_id': verse_id})
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

    def _db_update_verse_roots(self):
        """Ayet koklerini guncelleme (admin only)."""
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        if session['role'] != 'admin':
            self._json_response({'error': 'Sadece admin ayet koklerini duzenleyebilir'}, 403)
            return
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        body = self._read_body()
        if not body or 'roots' not in body:
            self._json_response({'error': 'roots alani gerekli'}, 400)
            return
        try:
            # /api/db/verse/1:1/roots -> verse_id = 1:1
            path_part = self.path.replace('/api/db/verse/', '').replace('/roots', '')
            verse_id = urllib.parse.unquote(path_part)
            quran_db.update_verse_roots(verse_id, body['roots'], user=session['username'])
            log_crud.info('Ayet kokleri guncellendi', verse_id=verse_id, user=session['username'],
                          root_count=len(body['roots']))
            self._json_response({'ok': True, 'verse_id': verse_id})
        except ValueError as e:
            self._json_response({'error': str(e)}, 400)
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

    def _db_update_root(self):
        """Kok bilgisi guncelleme (admin only)."""
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        if session['role'] != 'admin':
            self._json_response({'error': 'Sadece admin kok duzenleyebilir'}, 403)
            return
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        body = self._read_body()
        if not body:
            self._json_response({'error': 'Gecersiz istek'}, 400)
            return
        try:
            root_key = urllib.parse.unquote(self.path.split('/api/db/root/')[-1])
            ok = quran_db.update_root(
                root_key,
                meaning_tr=body.get('meaning_tr'),
                meaning_ar=body.get('meaning_ar'),
                pronunciation=body.get('pronunciation'),
                user=session['username']
            )
            if not ok:
                self._json_response({'error': 'Kok bulunamadi veya degisiklik yok'}, 404)
                return
            log_crud.info('Kok guncellendi', root=root_key, user=session['username'])
            self._json_response({'ok': True, 'root': root_key})
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

    def _db_add_root(self):
        """Yeni kok ekleme (admin only)."""
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        if session['role'] != 'admin':
            self._json_response({'error': 'Sadece admin kok ekleyebilir'}, 403)
            return
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        body = self._read_body()
        if not body or 'root' not in body:
            self._json_response({'error': 'root alani gerekli'}, 400)
            return
        try:
            quran_db.add_root(
                body['root'],
                meaning_tr=body.get('meaning_tr', ''),
                meaning_ar=body.get('meaning_ar', ''),
                pronunciation=body.get('pronunciation', ''),
                user=session['username']
            )
            log_crud.info('Yeni kok eklendi', root=body['root'], user=session['username'])
            self._json_response({'ok': True, 'root': body['root']}, 201)
        except ValueError as e:
            self._json_response({'error': str(e)}, 409)
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

    def _db_delete_root(self):
        """Kok silme (admin only, FK kontrollu)."""
        session = _get_session(self.headers)
        if not session:
            self._json_response({'error': 'Yetkisiz'}, 401)
            return
        if session['role'] != 'admin':
            self._json_response({'error': 'Sadece admin kok silebilir'}, 403)
            return
        if not _HAS_DB:
            self._json_response({'error': 'SQLite modulu yuklu degil'}, 503)
            return
        try:
            root_key = urllib.parse.unquote(self.path.split('/api/db/root/')[-1])
            quran_db.delete_root(root_key, user=session['username'])
            log_crud.info('Kok silindi', root=root_key, user=session['username'])
            self._json_response({'ok': True, 'root': root_key})
        except ValueError as e:
            self._json_response({'error': str(e)}, 400)
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

    def log_message(self, format, *args):
        log_system.debug('HTTP', request=format % args if args else format)

class _ThreadingServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True


def _build_update_toast_js(info):
    """Güncelleme bildirimi için JS kodu oluştur"""
    data = json.dumps({
        'url': info['msi_url'],
        'name': info.get('msi_name', 'update.msi'),
        'current': info['current'],
        'latest': info['latest'],
        'size': info.get('msi_size', 0)
    })
    return """(function() {
    var d = """ + data + """;
    window._sgxUpdate = d;
    var c = document.getElementById('toast-container');
    if (!c || document.getElementById('update-toast')) return;
    var t = document.createElement('div');
    t.id = 'update-toast';
    t.style.cssText = 'pointer-events:auto;background:rgba(0,15,30,0.97);border:1px solid #22c55e;border-radius:16px;padding:18px 22px;min-width:300px;backdrop-filter:blur(20px);box-shadow:0 20px 60px rgba(0,0,0,0.7);';
    var sizeMB = d.size > 0 ? ' \u00b7 ' + (d.size / 1024 / 1024).toFixed(1) + ' MB' : '';
    var h = document.createElement('div');
    h.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px;';
    h.innerHTML = '<span style="font-size:22px">\ud83d\ude80</span><div><div style="font-size:11px;font-weight:900;color:#22c55e;text-transform:uppercase;letter-spacing:0.12em">G\u00fcncelleme Mevcut</div><div style="font-size:10px;color:#64748b;margin-top:2px">v' + d.current + ' \u2192 v' + d.latest + sizeMB + '</div></div>';
    t.appendChild(h);
    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:8px;';
    var ubtn = document.createElement('button');
    ubtn.textContent = 'G\u00fcncelle';
    ubtn.style.cssText = 'flex:1;padding:8px 12px;border-radius:10px;border:1px solid #22c55e;background:rgba(34,197,94,0.15);color:#22c55e;font-size:11px;font-weight:700;cursor:pointer;';
    ubtn.onclick = function() { ubtn.textContent = '\u23f3 \u0130ndiriliyor...'; ubtn.disabled = true; window.pywebview.api.do_update(d.url, d.name); };
    btns.appendChild(ubtn);
    var dbtn = document.createElement('button');
    dbtn.textContent = 'Sonra';
    dbtn.style.cssText = 'padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#64748b;font-size:11px;cursor:pointer;';
    dbtn.onclick = function() { t.remove(); };
    btns.appendChild(dbtn);
    t.appendChild(btns);
    c.appendChild(t);
})();"""


def _start_update_check(win):
    """Arka planda güncelleme kontrolü yap ve varsa toast göster"""
    if not updater or not getattr(sys, 'frozen', False):
        return

    def _check():
        time.sleep(5)
        try:
            info = updater.check_for_update()
            if info.get('available') and info.get('msi_url'):
                win.evaluate_js(_build_update_toast_js(info))
        except Exception:
            pass

    threading.Thread(target=_check, daemon=True).start()


def sunucuyu_baslat():
    """Arka planda sessiz bir sunucu başlatır"""
    global PORT, WS_PORT
    # SQLite veritabanini baslat
    if _HAS_DB:
        try:
            quran_db.get_db()
            log_system.info('SQLite veritabani baslatildi')
        except Exception as e:
            log_system.error('SQLite baslatilamadi, JSON fallback aktif', error=str(e))
    _ThreadingServer.allow_reuse_address = True
    if AUTO_PORT:
        PORT = _find_free_port(HOST, PORT)
        WS_PORT = _find_free_port(HOST, PORT + 1)
    ws_thread = threading.Thread(
        target=ws_server.start, args=(HOST, WS_PORT), daemon=True
    )
    ws_thread.start()
    try:
        with _ThreadingServer((HOST, PORT), ProjeHandler) as httpd:
            ip = get_local_ip()
            _load_users()
            log_system.info('HTTP sunucu baslatildi', url=f'http://127.0.0.1:{PORT}', network=f'http://{ip}:{PORT}')
            httpd.serve_forever()
    except OSError:
        log_system.error('HTTP port kullanimda', port=PORT)
    finally:
        if _HAS_DB:
            try:
                quran_db.close_db()
                log_system.info('SQLite veritabani kapatildi')
            except Exception:
                pass

if __name__ == '__main__':
    def _get_besmele_path():
        """Kullanicinin secili diline gore besmele WAV dosyasini belirle"""
        try:
            pref_path = os.path.join(ROOT_DIR, 'locales', '.last_lang')
            if os.path.exists(pref_path):
                with open(pref_path, 'r', encoding='utf-8') as f:
                    code = f.read().strip()
                if code and code != 'TR-tr':
                    lang = code.split('-')[0].lower()
                    lang_file = os.path.join(ROOT_DIR, 'locales', f'besmele_{lang}.wav')
                    if os.path.exists(lang_file):
                        return lang_file
        except Exception:
            pass
        return os.path.join(ROOT_DIR, 'besmele.wav')

    def _set_window_icon(win):
        """Win32 API ile pencere ikonunu ayarla"""
        try:
            import ctypes
            from ctypes import wintypes
            ico_path = os.path.join(BASE_DIR, 'app_icon.ico')
            if not os.path.exists(ico_path):
                return
            user32 = ctypes.windll.user32
            WM_SETICON = 0x0080
            ICON_SMALL = 0
            ICON_BIG = 1
            IMAGE_ICON = 1
            LR_LOADFROMFILE = 0x0010
            LR_DEFAULTSIZE = 0x0040
            hicon_big = user32.LoadImageW(0, ico_path, IMAGE_ICON, 0, 0, LR_LOADFROMFILE | LR_DEFAULTSIZE)
            hicon_small = user32.LoadImageW(0, ico_path, IMAGE_ICON, 16, 16, LR_LOADFROMFILE)
            hwnd = user32.FindWindowW(None, win.title)
            if hwnd:
                user32.SendMessageW(hwnd, WM_SETICON, ICON_BIG, hicon_big)
                user32.SendMessageW(hwnd, WM_SETICON, ICON_SMALL, hicon_small)
        except Exception:
            pass

    if RUN_MODE == 'client':
        # --- CLIENT MODU: Sunucu başlatılmaz, uzak sunucuya bağlanılır ---
        _target_url = f'http://{SERVER_IP}:{SERVER_PORT}/index.html'
        log_system.info('Client modu baslatildi', url=_target_url)

        def on_closing():
            return True

        try:
            api_bridge = ApiKeyBridge()
            window = webview.create_window(
                title="Kur'an-ı Kerim Kelime Kök Uzayı (Terminal)",
                url=_target_url,
                maximized=True,
                background_color='#000000',
                resizable=True,
                text_select=False,
                js_api=api_bridge
            )
            api_bridge._window = window
            window.events.closing += on_closing

            _besmele_wav = _get_besmele_path()
            _besmele_state = {'played': False}

            def on_loaded():
                if _besmele_state['played']:
                    return
                _besmele_state['played'] = True
                _set_window_icon(window)
                if os.path.exists(_besmele_wav):
                    try:
                        import winsound
                        winsound.PlaySound(
                            _besmele_wav,
                            winsound.SND_FILENAME | winsound.SND_ASYNC
                        )
                    except Exception:
                        pass
                _start_update_check(window)
                _sync_env_key_to_stores(window)

            window.events.loaded += on_loaded
            webview.start(debug=False, storage_path=WEBVIEW_DATA_DIR, private_mode=False)
        except Exception as e:
            log_system.error('Client pencere hatasi', error=str(e))
    else:
        # --- SERVER MODU: Sunucuyu başlat ve yerel pencereyi aç ---
        t = threading.Thread(target=sunucuyu_baslat)
        t.daemon = True
        t.start()

        time.sleep(1)

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
            api_bridge._window = window
            window.events.closing += on_closing

            _besmele_wav = _get_besmele_path()
            _besmele_state = {'played': False}

            def on_loaded():
                """Pencere yüklendikten sonra besmele sesini tetikle (tek sefer)"""
                if _besmele_state['played']:
                    return
                _besmele_state['played'] = True
                _set_window_icon(window)
                if os.path.exists(_besmele_wav):
                    try:
                        import winsound
                        winsound.PlaySound(
                            _besmele_wav,
                            winsound.SND_FILENAME | winsound.SND_ASYNC
                        )
                    except Exception:
                        pass
                _start_update_check(window)
                _sync_env_key_to_stores(window)

            window.events.loaded += on_loaded
            webview.start(debug=False, storage_path=WEBVIEW_DATA_DIR, private_mode=False)
        except Exception as e:
            log_system.error('Server pencere hatasi', error=str(e))
