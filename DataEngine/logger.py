"""
SemantikGalaksi -- Merkezi Log Sistemi
=======================================
Uc kategori:
  SYSTEM : Sunucu yasam dongusu, port, config, WebSocket, hatalar
  AUTH   : Giris/cikis, kullanici CRUD, rol degisikligi, sifre
  CRUD   : Dataset, locale, notes, api-key islemleri

Kullanim:
    from logger import log_system, log_auth, log_crud

    log_system.info("Sunucu baslatildi", port=8080)
    log_auth.warning("Basarisiz giris", user="admin", ip="192.168.1.5")
    log_crud.info("Dataset kaydedildi", user="editor1", target="quran_data.json")
"""

import logging
import logging.handlers
import os
import json
import datetime


# --- Log dizini ---
def _get_log_dir():
    """Loglarin saklanacagi dizin. Frozen modda %APPDATA%/SemantikGalaksi/logs"""
    import sys
    if getattr(sys, 'frozen', False):
        appdata = os.environ.get('APPDATA', os.path.expanduser('~'))
        d = os.path.join(appdata, 'SemantikGalaksi', 'logs')
    else:
        d = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
    os.makedirs(d, exist_ok=True)
    return d


LOG_DIR = _get_log_dir()

# --- Yapilandirilmis log formatlayici ---
_LOG_FORMAT = '%(asctime)s | %(name)s | %(levelname)-7s | %(message)s'
_DATE_FORMAT = '%Y-%m-%d %H:%M:%S'


class StructuredAdapter(logging.LoggerAdapter):
    """Anahtar-deger ciftlerini log mesajina ekler.

    Ornek:
        log_system.info("Sunucu baslatildi", port=8080, host="0.0.0.0")
        -> 2025-07-28 14:30:00 | SYSTEM | INFO    | Sunucu baslatildi | port=8080 host=0.0.0.0
    """

    def process(self, msg, kwargs):
        # extra alanlarindan kv ciftlerini cikar
        extra_kv = kwargs.pop('extra_kv', {})
        if extra_kv:
            pairs = ' '.join(f'{k}={v}' for k, v in extra_kv.items())
            msg = f'{msg} | {pairs}'
        return msg, kwargs

    # Kolaylik: log_system.info("mesaj", user="x", ip="y") destegi
    def info(self, msg, *args, **kwargs):
        kv = {k: v for k, v in kwargs.items() if k not in ('exc_info', 'stack_info', 'stacklevel', 'extra')}
        for k in kv:
            kwargs.pop(k)
        kwargs['extra_kv'] = kv
        super().info(msg, *args, **kwargs)

    def warning(self, msg, *args, **kwargs):
        kv = {k: v for k, v in kwargs.items() if k not in ('exc_info', 'stack_info', 'stacklevel', 'extra')}
        for k in kv:
            kwargs.pop(k)
        kwargs['extra_kv'] = kv
        super().warning(msg, *args, **kwargs)

    def error(self, msg, *args, **kwargs):
        kv = {k: v for k, v in kwargs.items() if k not in ('exc_info', 'stack_info', 'stacklevel', 'extra')}
        for k in kv:
            kwargs.pop(k)
        kwargs['extra_kv'] = kv
        super().error(msg, *args, **kwargs)

    def debug(self, msg, *args, **kwargs):
        kv = {k: v for k, v in kwargs.items() if k not in ('exc_info', 'stack_info', 'stacklevel', 'extra')}
        for k in kv:
            kwargs.pop(k)
        kwargs['extra_kv'] = kv
        super().debug(msg, *args, **kwargs)

    def critical(self, msg, *args, **kwargs):
        kv = {k: v for k, v in kwargs.items() if k not in ('exc_info', 'stack_info', 'stacklevel', 'extra')}
        for k in kv:
            kwargs.pop(k)
        kwargs['extra_kv'] = kv
        super().critical(msg, *args, **kwargs)


def _create_logger(name, filename, level=logging.DEBUG):
    """Dosya + konsol handler'li logger olusturur."""
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Tekrar eklemeyi onle
    if logger.handlers:
        return StructuredAdapter(logger, {})

    formatter = logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT)

    # Dosya handler: 5 MB, 5 yedek
    fh = logging.handlers.RotatingFileHandler(
        os.path.join(LOG_DIR, filename),
        maxBytes=5 * 1024 * 1024,
        backupCount=5,
        encoding='utf-8'
    )
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(formatter)
    logger.addHandler(fh)

    # Konsol handler (sadece INFO+)
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    ch.setFormatter(formatter)
    logger.addHandler(ch)

    return StructuredAdapter(logger, {})


# --- Uc ana log kategorisi ---
log_system = _create_logger('SYSTEM', 'system.log')
log_auth = _create_logger('AUTH', 'auth.log')
log_crud = _create_logger('CRUD', 'crud.log')


# --- Log okuma yardimcisi (admin paneli icin) ---
def read_logs(category='all', limit=200, level=None):
    """Log dosyalarindan son satirlari okur. Admin API icin.

    Args:
        category: 'system', 'auth', 'crud' veya 'all'
        limit: maksimum satir sayisi
        level: filtreleme seviyesi (INFO, WARNING, ERROR vb.)

    Returns:
        list[dict]: Her satir icin {timestamp, category, level, message}
    """
    files = {
        'system': 'system.log',
        'auth': 'auth.log',
        'crud': 'crud.log'
    }

    if category == 'all':
        targets = list(files.values())
    elif category in files:
        targets = [files[category]]
    else:
        return []

    entries = []
    for fname in targets:
        fpath = os.path.join(LOG_DIR, fname)
        if not os.path.exists(fpath):
            continue
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            # Son N satir
            for line in lines[-(limit * 2):]:
                line = line.strip()
                if not line:
                    continue
                parts = line.split(' | ', 3)
                if len(parts) < 4:
                    continue
                entry = {
                    'timestamp': parts[0].strip(),
                    'category': parts[1].strip(),
                    'level': parts[2].strip(),
                    'message': parts[3].strip()
                }
                if level and entry['level'] != level:
                    continue
                entries.append(entry)
        except Exception:
            continue

    # Zamana gore sirala, son N
    entries.sort(key=lambda e: e['timestamp'], reverse=True)
    return entries[:limit]
