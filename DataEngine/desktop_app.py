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

# --- AYARLAR ---
def _get_base_dir():
    """PyInstaller ile paketlenmiş veya normal çalışmaya göre kök dizini belirler."""
    if getattr(sys, 'frozen', False):
        # PyInstaller ile paketlenmiş EXE: bundle edilen dosyalar _MEIPASS altında
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))


def _get_user_data_dir():
    """Kullanıcı verilerinin (notes, keys, config) saklanacağı yazılabilir dizin."""
    if getattr(sys, 'frozen', False):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.abspath(__file__))


BASE_DIR = _get_base_dir()
USER_DATA_DIR = _get_user_data_dir()

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__)) if not getattr(sys, 'frozen', False) else USER_DATA_DIR
ROOT_DIR = os.path.join(BASE_DIR, 'Frontend')
WEBVIEW_DATA_DIR = os.path.join(USER_DATA_DIR, 'webview_data')
KEYS_FILE = os.path.join(USER_DATA_DIR, 'webview_data', '.api_keys')
DATASETS_DIR = os.path.join(ROOT_DIR, 'datasets')
NOTES_DIR = os.path.join(USER_DATA_DIR, 'notes')
CONFIG_FILE = os.path.join(USER_DATA_DIR, 'config.json')


def _load_config():
    """config.json > env var > CLI arg > otomatik port bulma"""
    cfg = {'port': 8080, 'host': '0.0.0.0', 'auto_port': True}
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

    def save_file(self, content, filename):
        """Native OS 'Farklı Kaydet' diyaloğu ile dosya indirme"""
        try:
            result = self._window.create_file_dialog(
                webview.SAVE_DIALOG,
                save_filename=filename,
                file_types=('JSON Dosyaları (*.json)',)
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
            print(f"WebSocket sunucusu: ws://{host}:{port}")
            while True:
                conn, _ = srv.accept()
                threading.Thread(target=self._handle, args=(conn,), daemon=True).start()
        except OSError:
            print(f"Uyar\u0131: WebSocket portu {port} kullan\u0131lamad\u0131.")

    def _recv_all(self, sock, n):
        buf = b''
        while len(buf) < n:
            chunk = sock.recv(n - len(buf))
            if not chunk:
                raise ConnectionError
            buf += chunk
        return buf

    def _handle(self, conn):
        session = None
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
                self._clients.append({'sock': conn, 'session': session})
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
        elif self.path == '/api/dataset-rename':
            self._rename_dataset()
        elif self.path == '/api/dataset-duplicate':
            self._duplicate_dataset()
        elif self.path.startswith('/api/dataset/'):
            self._save_dataset()
        elif self.path == '/api/notes':
            self._save_notes()

    def do_PUT(self):
        if self.path.startswith('/api/auth/user/'):
            self._update_user_role()

    def do_DELETE(self):
        if self.path.startswith('/api/auth/user/'):
            self._delete_user()
        elif self.path.startswith('/api/note/'):
            self._delete_note()
        elif self.path.startswith('/api/dataset/'):
            self._delete_dataset()

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
            self._json_response({'error': 'Kullanıcı bulunamadı'}, 401)
            return
        _, hashed = _hash_pw(password, user['salt'])
        if hashed != user['password']:
            self._json_response({'error': 'Hatalı şifre'}, 401)
            return
        token = secrets.token_hex(32)
        _sessions[token] = {'username': username, 'role': user['role']}
        self._json_response({'token': token, 'username': username, 'role': user['role']})

    def _logout(self):
        auth = self.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            _sessions.pop(auth[7:], None)
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
            self._json_response({'ok': True})
        except Exception as e:
            self._json_response({'error': str(e)}, 500)

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
        path = os.path.join(DATASETS_DIR, name)
        if not os.path.exists(path):
            self._json_response({'error': 'Bulunamadı'}, 404)
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
        data = self._read_body()
        if data is None:
            self._json_response({'error': 'Geçersiz JSON'}, 400)
            return
        if '_meta' not in data:
            data['_meta'] = {}
        data['_meta']['modifiedBy'] = session['username']
        data['_meta']['modifiedAt'] = time.strftime('%Y-%m-%dT%H:%M:%S')
        os.makedirs(DATASETS_DIR, exist_ok=True)
        path = os.path.join(DATASETS_DIR, name)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
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
        path = os.path.join(DATASETS_DIR, name)
        if os.path.exists(path):
            os.remove(path)
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
        if name == 'quran_data.json':
            filepath = os.path.join(ROOT_DIR, 'quran_data.json')
        else:
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
        self._json_response({'users': ws_server.online_users()})

    def _server_info(self):
        self._json_response({
            'ip': get_local_ip(),
            'port': PORT,
            'wsPort': WS_PORT,
            'url': f'http://{get_local_ip()}:{PORT}'
        })

    def log_message(self, format, *args):
        pass

class _ThreadingServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True


def sunucuyu_baslat():
    """Arka planda sessiz bir sunucu başlatır"""
    global PORT, WS_PORT
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
            print(f"Sunucu başlatıldı: http://127.0.0.1:{PORT}")
            print(f"WebSocket:         ws://127.0.0.1:{WS_PORT}")
            print(f"Ağ erişimi:        http://{ip}:{PORT}")
            print(f"Varsayılan giriş:  admin / admin123")
            httpd.serve_forever()
    except OSError:
        print(f"Uyarı: {PORT} portu zaten kullanımda olabilir.")

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
        api_bridge._window = window
        window.events.closing += on_closing

        _besmele_wav = os.path.join(ROOT_DIR, 'besmele.wav')

        def on_loaded():
            """Pencere yüklendikten sonra besmele sesini tetikle"""
            if os.path.exists(_besmele_wav):
                try:
                    import winsound
                    winsound.PlaySound(
                        _besmele_wav,
                        winsound.SND_FILENAME | winsound.SND_ASYNC
                    )
                except Exception:
                    pass

        window.events.loaded += on_loaded
        webview.start(debug=False, storage_path=WEBVIEW_DATA_DIR, private_mode=False)
    except Exception as e:
        print(f"Pencere açılırken hata oluştu: {e}")
