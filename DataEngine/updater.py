"""
SemantikGalaksi — Otomatik Güncelleme Modülü
─────────────────────────────────────────────
GitHub Release API üzerinden sürüm kontrolü,
kullanıcı verisi yedekleme ve MSI güncelleme.

Akış:
    1. Uygulama açılışında arka planda GitHub'dan son sürüm kontrol edilir
    2. Güncelleme varsa kullanıcıya toast bildirimi gösterilir
    3. Kullanıcı "Güncelle" derse:
        a) %APPDATA%/SemantikGalaksi/backups/ altına ZIP yedek alınır
        b) MSI temp'e indirilir
        c) Batch script ile yükleyici başlatılır
        d) Uygulama kapanır, MSI yeni sürümü kurar
"""

import os
import sys
import json
import zipfile
import datetime
import subprocess
import tempfile
import urllib.request

GITHUB_REPO = "hzkucuk/SemantikGalaksi"
GITHUB_API_URL = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"


def _get_app_dir():
    """Uygulama kök dizini (kurulum dizini)"""
    if getattr(sys, 'frozen', False):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _get_user_data_dir():
    """Kullanıcı veri dizini: frozen modda %APPDATA%/SemantikGalaksi,
    geliştirme modunda proje kökü."""
    if getattr(sys, 'frozen', False):
        appdata = os.environ.get('APPDATA', os.path.expanduser('~'))
        ud = os.path.join(appdata, 'SemantikGalaksi')
        os.makedirs(ud, exist_ok=True)
        return ud
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _get_backup_dir():
    """Yedekleme dizini: %APPDATA%/SemantikGalaksi/backups
    (MSI kaldırılsa bile yedekler korunur)"""
    d = os.path.join(_get_user_data_dir(), 'backups')
    os.makedirs(d, exist_ok=True)
    return d


def get_current_version():
    """VERSION dosyasından mevcut sürümü oku"""
    vf = os.path.join(_get_app_dir(), 'VERSION')
    if os.path.exists(vf):
        with open(vf, encoding='utf-8') as f:
            return f.read().strip()
    return "0.0.0"


def _parse_version(v):
    """Sürüm string'ini tuple'a çevir: '0.34.4' → (0, 34, 4)"""
    try:
        return tuple(int(x) for x in v.split('.'))
    except Exception:
        return (0, 0, 0)


def check_for_update():
    """GitHub'dan en son release'i kontrol et.

    Returns:
        dict: 'available' True/False, sürüm bilgileri ve MSI URL'si
    """
    try:
        req = urllib.request.Request(GITHUB_API_URL, headers={
            'User-Agent': 'SemantikGalaksi-Updater',
            'Accept': 'application/vnd.github.v3+json'
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            release = json.loads(resp.read().decode())

        latest = release.get('tag_name', '').lstrip('v')
        current = get_current_version()

        if _parse_version(latest) > _parse_version(current):
            # Release asset'lerinden Server MSI'yi tercih et
            assets = release.get('assets', [])
            msi_url = msi_name = msi_size = None
            for a in assets:
                n = a.get('name', '')
                if n.endswith('.msi') and 'Server' in n:
                    msi_url = a['browser_download_url']
                    msi_name = n
                    msi_size = a.get('size', 0)
                    break
            # Fallback: herhangi bir MSI
            if not msi_url:
                for a in assets:
                    if a.get('name', '').endswith('.msi'):
                        msi_url = a['browser_download_url']
                        msi_name = a['name']
                        msi_size = a.get('size', 0)
                        break

            return {
                'available': True,
                'current': current,
                'latest': latest,
                'msi_url': msi_url,
                'msi_name': msi_name,
                'msi_size': msi_size,
            }
        return {'available': False, 'current': current, 'latest': latest}
    except Exception as e:
        return {'available': False, 'error': str(e)}


def create_backup():
    """Kullanıcı verilerini ZIP olarak yedekle.

    Yedeklenen öğeler:
        - webview_data/  (API keys, localStorage, auth)  [%APPDATA%]
        - notes/         (kullanıcı notları)              [%APPDATA%]
        - datasets/      (kullanıcı düzenlenmiş JSON'lar) [%APPDATA%]
        - config.json    (yapılandırma)                   [%APPDATA%]
        - VERSION        (referans)                       [kurulum dizini]

    En fazla 5 yedek tutulur, eskiler silinir.
    Returns: ZIP dosya yolu
    """
    app_dir = _get_app_dir()
    user_data_dir = _get_user_data_dir()
    backup_dir = _get_backup_dir()
    ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    ver = get_current_version()
    zip_path = os.path.join(backup_dir, f'SGX_v{ver}_{ts}.zip')

    # Kullanıcı verileri %APPDATA%/SemantikGalaksi altında
    user_items = ['webview_data', 'notes', 'config.json', 'datasets', 'locales', 'quran.db']
    # VERSION uygulama kök dizininde kalır
    app_items = ['VERSION']

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        # Kullanıcı verileri (%APPDATA%)
        for item in user_items:
            fp = os.path.join(user_data_dir, item)
            if os.path.isfile(fp):
                zf.write(fp, item)
            elif os.path.isdir(fp):
                for root, _, files in os.walk(fp):
                    for f in files:
                        full = os.path.join(root, f)
                        zf.write(full, os.path.relpath(full, user_data_dir))
        # Uygulama dosyaları (kurulum dizini)
        for item in app_items:
            fp = os.path.join(app_dir, item)
            if os.path.isfile(fp):
                zf.write(fp, item)

    # Eski yedekleri temizle (en fazla 5)
    backups = sorted(
        [f for f in os.listdir(backup_dir) if f.endswith('.zip')]
    )
    while len(backups) > 5:
        try:
            os.remove(os.path.join(backup_dir, backups.pop(0)))
        except Exception:
            break

    return zip_path


def download_and_install(msi_url, msi_name=None):
    """MSI indir, yedek al, yükleyiciyi başlat.

    1. Kullanıcı verisi ZIP yedeklenir (uygulama klasörü/backups/)
    2. MSI temp klasörüne indirilir
    3. Batch script oluşturulur (3s bekle → MSI /passive kur)
    4. Batch script yeni process olarak başlatılır

    Returns: dict (backup yolu, msi yolu)
    Raises: Exception indirme veya yedekleme hatalarında
    """
    # 1. Yedek al
    backup_path = create_backup()

    # 2. MSI indir
    tmp = tempfile.gettempdir()
    msi_path = os.path.join(tmp, msi_name or 'SemantikGalaksi_Update.msi')
    urllib.request.urlretrieve(msi_url, msi_path)

    # 3. Batch script oluştur: bekle → kur → temizle
    bat_path = os.path.join(tmp, 'sgx_update.bat')
    with open(bat_path, 'w', encoding='utf-8') as f:
        f.write('@echo off\n')
        f.write('echo SemantikGalaksi guncelleniyor...\n')
        f.write('timeout /t 3 /nobreak >nul\n')
        f.write(f'msiexec /i "{msi_path}" /passive /norestart\n')
        f.write('del "%~f0"\n')

    subprocess.Popen(
        ['cmd', '/c', bat_path],
        creationflags=subprocess.CREATE_NEW_CONSOLE
    )

    return {'backup': backup_path, 'msi': msi_path}
