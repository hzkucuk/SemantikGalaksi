# -*- coding: utf-8 -*-
"""
SemantikGalaksi — MSI Installer Build Script
=============================================
Kullanım:
    python setup.py bdist_msi

Bu script cx_Freeze kullanarak Windows MSI installer paketi oluşturur.
Python runtime, tüm bağımlılıklar ve Frontend dosyaları pakete dahil edilir.

Gereksinimler:
    pip install cx_Freeze
"""

import os
import sys
from cx_Freeze import setup, Executable

# ── Proje kök dizini ──────────────────────────────────────────────────
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(ROOT_DIR, "Frontend")
DATAENGINE_DIR = os.path.join(ROOT_DIR, "DataEngine")

# ── Versiyon (tek kaynak: VERSION dosyası) ────────────────────────────
with open(os.path.join(ROOT_DIR, "VERSION"), encoding="utf-8") as _vf:
    APP_VERSION = _vf.read().strip()

# ── Frontend dosyalarını topla ────────────────────────────────────────
include_files = []

# Frontend kök dosyaları
frontend_root_files = [
    "index.html", "warp.html", "quran_data.json", "quran_roots.json",
    "milkyway.jpg", "three.min.js", "OrbitControls.js",
    "tailwind.min.js", "besmele.wav",
]
for f in frontend_root_files:
    src = os.path.join(FRONTEND_DIR, f)
    if os.path.exists(src):
        include_files.append((src, os.path.join("Frontend", f)))

# Frontend/js/ modülleri (20 dosya)
js_dir = os.path.join(FRONTEND_DIR, "js")
if os.path.isdir(js_dir):
    for f in os.listdir(js_dir):
        if f.endswith(".js"):
            include_files.append(
                (os.path.join(js_dir, f), os.path.join("Frontend", "js", f))
            )

# Frontend/datasets/ dizini (boş bile olsa oluştur)
datasets_dir = os.path.join(FRONTEND_DIR, "datasets")
if os.path.isdir(datasets_dir):
    for f in os.listdir(datasets_dir):
        src = os.path.join(datasets_dir, f)
        if os.path.isfile(src):
            include_files.append(
                (src, os.path.join("Frontend", "datasets", f))
            )

# Config dosyası
config_src = os.path.join(DATAENGINE_DIR, "config.json")
if os.path.exists(config_src):
    include_files.append((config_src, "config.json"))

# ── Build seçenekleri ─────────────────────────────────────────────────
build_exe_options = {
    "packages": [
        "webview", "webview.platforms.edgechromium",
        "clr_loader", "pythonnet",
        "requests", "bs4", "dotenv", "aiohttp",
        "json", "hashlib", "http.server", "socketserver",
        "threading", "struct", "base64", "uuid",
        "winsound", "ctypes",
    ],
    "includes": [
        "webview",
    ],
    "excludes": [
        "tkinter", "unittest", "email", "xml.etree",
        "pydoc_data", "distutils", "setuptools",
    ],
    "include_files": include_files,
    "include_msvcr": True,
}

# ── MSI kısayol tanımları ─────────────────────────────────────────────
# MSI shortcut tablosu: (kısayol_adı, dizin, hedef, açıklama)
shortcut_table = [
    (
        "DesktopShortcut",           # Shortcut ID
        "DesktopFolder",             # Directory
        "SemantikGalaksi",           # Name
        "TARGETDIR",                 # Component
        "[TARGETDIR]SemantikGalaksi.exe",  # Target
        None,                        # Arguments
        "Kur'an-ı Kerim Kelime Kök Uzayı — 3D Görselleştirme",  # Description
        None,                        # Hotkey
        None,                        # Icon
        None,                        # IconIndex
        None,                        # ShowCmd
        "TARGETDIR",                 # WkDir
    ),
    (
        "StartMenuShortcut",
        "StartMenuFolder",
        "SemantikGalaksi",
        "TARGETDIR",
        "[TARGETDIR]SemantikGalaksi.exe",
        None,
        "Kur'an-ı Kerim Kelime Kök Uzayı — 3D Görselleştirme",
        None,
        None,
        None,
        None,
        "TARGETDIR",
    ),
]

# Start Menu klasörü için dizin tanımı
directory_table = [
    ("StartMenuFolder", "TARGETDIR", "."),
]

# MSI özel veri tabloları
msi_data = {
    "Shortcut": shortcut_table,
    "Directory": directory_table,
}

# ── MSI seçenekleri ───────────────────────────────────────────────────
bdist_msi_options = {
    "add_to_path": False,
    "data": msi_data,
    "environment_variables": [],
    "upgrade_code": "{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}",
    "install_icon": None,
    "all_users": True,
    "initial_target_dir": r"C:\SemantikGalaksi",
    "summary_data": {
        "author": "SemantikGalaksi",
        "comments": "Kur'an-ı Kerim Kelime Kök Uzayı — 3D uzay görselleştirmesi ile Kur'an keşfi",
        "keywords": "Kuran, Quran, 3D, semantik, kök analizi",
    },
}

# ── Executable tanımı ─────────────────────────────────────────────────
executables = [
    Executable(
        script=os.path.join("DataEngine", "desktop_app.py"),
        base="gui",                                 # Konsol penceresi gösterme
        target_name="SemantikGalaksi.exe",
        shortcut_name="SemantikGalaksi",
        shortcut_dir="StartMenuFolder",
    ),
]

# ── Setup ─────────────────────────────────────────────────────────────
setup(
    name="SemantikGalaksi",
    version=APP_VERSION,
    description="Kur'an-ı Kerim Kelime Kök Uzayı — 3D Görselleştirme",
    long_description=(
        "Kur'an-ı Kerim surelerini ve ayetlerini 3D uzay görselleştirmesi ile keşfedin. "
        "Semantik kök bağlantıları, gerçek Samanyolu yıldız haritası, çok kullanıcılı, "
        "masaüstü + web destekli."
    ),
    author="SemantikGalaksi",
    options={
        "build_exe": build_exe_options,
        "bdist_msi": bdist_msi_options,
    },
    executables=executables,
)
