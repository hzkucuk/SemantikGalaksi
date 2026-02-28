# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec dosyası — SemantikGalaksi masaüstü uygulaması

import os

block_cipher = None
ROOT = os.path.abspath('.')

a = Analysis(
    [os.path.join('DataEngine', 'desktop_app.py')],
    pathex=[ROOT],
    binaries=[],
    datas=[
        # Frontend klasörünün tamamını bundle et
        (os.path.join('Frontend', 'index.html'),       'Frontend'),
        (os.path.join('Frontend', 'warp.html'),        'Frontend'),
        (os.path.join('Frontend', 'quran_data.json'),  'Frontend'),
        (os.path.join('Frontend', 'three.min.js'),     'Frontend'),
        (os.path.join('Frontend', 'OrbitControls.js'), 'Frontend'),
        (os.path.join('Frontend', 'tailwind.min.js'),  'Frontend'),
        (os.path.join('Frontend', 'besmele.wav'),      'Frontend'),
        # Config dosyası
        (os.path.join('DataEngine', 'config.json'),    '.'),
    ],
    hiddenimports=[
        'webview',
        'webview.platforms.edgechromium',
        'clr_loader',
        'pythonnet',
        'winsound',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='SemantikGalaksi',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,           # Konsol penceresi gösterme
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    # icon='icon.ico',       # İkon dosyanız varsa bu satırı açın
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='SemantikGalaksi',
)
