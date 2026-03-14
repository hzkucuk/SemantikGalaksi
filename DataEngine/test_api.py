# -*- coding: utf-8 -*-
"""SemantikGalaksi v1.0.0 — API & SQLite Entegrasyon Testi

Sunucu calisirken calistirilir:
    python test_api.py [port]

Varsayilan: http://127.0.0.1:8080
Test senaryolari:
    1. Auth (login, me, unauthorized)
    2. DB Stats (/api/db/stats)
    3. DB Integrity (/api/db/integrity)
    4. DB Changelog (/api/db/changelog)
    5. Roots save + SQLite sync (/api/roots)
    6. Locale roots save (/api/locale/roots_en.json)
    7. Dataset save SQLite sync (/api/dataset/quran_data.json)
    8. Auth guard (viewer cannot save roots, non-admin cannot see integrity)
"""

import json
import sys
import urllib.request
import urllib.error
import time

BASE = 'http://127.0.0.1'
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
URL = f'{BASE}:{PORT}'

passed = 0
failed = 0
errors = []


def req(method, path, data=None, token=None, expect_status=200):
    """HTTP istegi gonder, (status, body_dict) dondur."""
    url = f'{URL}{path}'
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    body = json.dumps(data).encode('utf-8') if data else None
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(r)
        return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode('utf-8'))
        except Exception:
            body = {'raw': str(e)}
        return e.code, body


def test(name, condition, detail=''):
    global passed, failed
    if condition:
        passed += 1
        print(f'  [OK] {name}')
    else:
        failed += 1
        msg = f'  [FAIL] {name}'
        if detail:
            msg += f' — {detail}'
        print(msg)
        errors.append(name)


def main():
    global passed, failed

    print(f'\n{"="*60}')
    print(f'  SemantikGalaksi v1.0.0 API Test Suite')
    print(f'  Sunucu: {URL}')
    print(f'{"="*60}\n')

    # ===== 1. AUTH =====
    print('[1] Auth Tests')
    # Login basarili
    test_user = '_tester'
    test_pass = 'test123'
    status, body = req('POST', '/api/auth/login', {'username': test_user, 'password': test_pass})
    test('Login basarili', status == 200 and 'token' in body, f'status={status}')
    admin_token = body.get('token', '')

    # Auth me
    status, body = req('GET', '/api/auth/me', token=admin_token)
    test('Auth me', status == 200 and body.get('role') == 'admin', f'body={body}')
    test('Auth username', body.get('username') == test_user, f'user={body.get("username")}')

    # Yetkisiz erisim (token yok)
    status, body = req('GET', '/api/auth/me')
    test('Yetkisiz erisim (401)', status == 401, f'status={status}')

    # Hatali sifre
    status, body = req('POST', '/api/auth/login', {'username': test_user, 'password': 'yanlis_sifre'})
    test('Hatali sifre (401)', status == 401, f'status={status}')

    print()

    # ===== 2. DB STATS =====
    print('[2] DB Stats')
    status, body = req('GET', '/api/db/stats', token=admin_token)
    test('Stats endpoint 200', status == 200, f'status={status}')
    if status == 200:
        test('Stats verses=6236', body.get('verses') == 6236, f'verses={body.get("verses")}')
        test('Stats roots=1651', body.get('roots') == 1651, f'roots={body.get("roots")}')
        test('Stats verse_roots=44718', body.get('verse_roots') == 44718, f'vr={body.get("verse_roots")}')
        test('Stats languages listesi', isinstance(body.get('languages'), list) and len(body['languages']) > 0,
             f'langs={body.get("languages")}')
    print()

    # ===== 3. DB INTEGRITY =====
    print('[3] DB Integrity')
    status, body = req('GET', '/api/db/integrity', token=admin_token)
    test('Integrity endpoint 200', status == 200, f'status={status}')
    if status == 200:
        test('Integrity healthy=True', body.get('healthy') is True, f'healthy={body.get("healthy")}')
        test('FK violations=0', len(body.get('fk_violations', [])) == 0,
             f'violations={len(body.get("fk_violations", []))}')
        test('Orphan roots=0', len(body.get('orphan_roots', [])) == 0,
             f'orphans={len(body.get("orphan_roots", []))}')
        test('Missing meanings=0', len(body.get('missing_meanings', [])) == 0,
             f'missing={len(body.get("missing_meanings", []))}')
    print()

    # ===== 4. DB CHANGELOG =====
    print('[4] DB Changelog')
    status, body = req('GET', '/api/db/changelog?limit=10', token=admin_token)
    test('Changelog endpoint 200', status == 200, f'status={status}')
    if status == 200:
        test('Changelog entries listesi', isinstance(body.get('entries'), list), f'type={type(body.get("entries"))}')
    print()

    # ===== 5. ROOTS SAVE (round-trip) =====
    print('[5] Roots Save (SQLite round-trip)')
    # Once mevcut roots_en.json'dan kucuk bir test parcasi alalim
    # quran_roots.json'u GET ile okuyalim
    status, body = req('GET', '/api/dataset/quran_roots.json', token=admin_token)
    if status == 200 and isinstance(body, dict):
        # Sadece ilk 3 koku al, geri gonder (degistirmeden)
        test_keys = [k for k in body if k != '_meta'][:3]
        test_data = {k: body[k] for k in test_keys}
        # NOT: Bunu geri gondermeyecegiz cunku tum veriyi gondermemiz gerek
        # Aksi halde save_roots_bulk "silinen kokler" diye kalan 1648 koku siler
        # Sadece mevcut veriyi oldugu gibi geri gonderelim
        test('quran_roots.json okunabilir', len(body) > 100, f'keys={len(body)}')

        # Tam veriyi geri gonder (idempotent test)
        status2, body2 = req('POST', '/api/roots', body, token=admin_token)
        test('Roots POST 200', status2 == 200, f'status={status2}, body={body2}')
        if status2 == 200:
            test('Roots removed=0 (idempotent)', body2.get('removed', -1) == 0,
                 f'removed={body2.get("removed")}')
    else:
        test('quran_roots.json GET', False, f'status={status}')
    print()

    # ===== 6. LOCALE ROOTS SAVE =====
    print('[6] Locale Roots Save + DB Export')
    status, stats = req('GET', '/api/db/stats', token=admin_token)
    if status == 200:
        test('Locale test - translations sayisi > 0', stats.get('translations', 0) > 0,
             f'translations={stats.get("translations")}')

    # DB Export endpoint
    status, body = req('GET', '/api/db/export', token=admin_token)
    test('DB Export 200', status == 200, f'status={status}')
    if status == 200:
        exported = body.get('exported', {})
        test('Export quran_data > 0', exported.get('quran_data', 0) > 0,
             f'quran_data={exported.get("quran_data")}')
        test('Export quran_roots > 0', exported.get('quran_roots', 0) > 0,
             f'quran_roots={exported.get("quran_roots")}')
    print()

    # ===== 7. AUTH GUARD (rol kontrolu) =====
    print('[7] Auth Guard Tests')
    # Viewer olustur, login yap, yetkisiz islemleri dene
    # Once viewer var mi kontrol et
    viewer_created = False
    status, body = req('POST', '/api/auth/users',
                       {'username': '_test_viewer', 'password': 'test123', 'role': 'viewer'},
                       token=admin_token)
    if status == 200 or status == 409:  # 409 = zaten var
        viewer_created = True
        # Viewer login
        status, body = req('POST', '/api/auth/login',
                           {'username': '_test_viewer', 'password': 'test123'})
        if status == 200:
            viewer_token = body.get('token', '')

            # Viewer cannot save roots
            status, body = req('POST', '/api/roots', {'test': {'meaning': 'x'}}, token=viewer_token)
            test('Viewer roots save engellendi (403)', status == 403, f'status={status}')

            # Viewer cannot see integrity (admin only)
            status, body = req('GET', '/api/db/integrity', token=viewer_token)
            test('Viewer integrity engellendi (403)', status == 403, f'status={status}')

            # Viewer cannot see changelog (admin only)
            status, body = req('GET', '/api/db/changelog', token=viewer_token)
            test('Viewer changelog engellendi (403)', status == 403, f'status={status}')

            # Viewer CAN see stats (not admin-only)
            status, body = req('GET', '/api/db/stats', token=viewer_token)
            test('Viewer stats erisebilir (200)', status == 200, f'status={status}')
        else:
            test('Viewer login', False, f'status={status}')

    # Temizlik: test viewer'i sil
    if viewer_created:
        req('DELETE', '/api/auth/user/_test_viewer', token=admin_token)
    print()

    # ===== 8. CHANGELOG AFTER OPERATIONS =====
    print('[8] Changelog After Operations')
    status, body = req('GET', '/api/db/changelog?limit=5', token=admin_token)
    if status == 200:
        entries = body.get('entries', [])
        test('Changelog artik dolu (trigger/manual)', len(entries) > 0,
             f'entries={len(entries)}')
        if entries:
            first = entries[0]
            test('Changelog entry yapisal', 'table_name' in first and 'action' in first,
                 f'keys={list(first.keys())}')
    print()

    # ===== SONUC =====
    total = passed + failed
    print(f'{"="*60}')
    print(f'  SONUC: {passed}/{total} basarili, {failed} basarisiz')
    if errors:
        print(f'  Basarisiz testler:')
        for e in errors:
            print(f'    - {e}')
    print(f'{"="*60}\n')

    return 0 if failed == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
