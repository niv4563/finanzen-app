#!/usr/bin/env python3
"""Baut den Web-Teil der Android-App nach www/.
Aufruf: python3 tools/build_www.py web <version> <kanal: direct|play> [<github owner/repo>] [<build-nr>]
Kopiert NUR die App-Dateien – niemals persönliche Daten (z. B. Finanzen_Daten.json)."""
import json, re, shutil, sys, pathlib
src, version, channel = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
repo = sys.argv[4] if len(sys.argv) > 4 else ''
build = sys.argv[5] if len(sys.argv) > 5 else ''
assert re.fullmatch(r'\d+\.\d+\.\d+', version), 'Version muss so aussehen: 1.2.3'
assert channel in ('direct', 'play')
assert repo == '' or re.fullmatch(r'[\w.-]+/[\w.-]+', repo)
out = pathlib.Path(__file__).resolve().parent.parent / 'www'
shutil.rmtree(out, ignore_errors=True); out.mkdir()
shutil.copy(src / 'app.css', out / 'app.css')
# app.js wird aus web/js/01.js, 02.js, … zusammengesetzt (kleinere Dateien = einfacher zu prüfen und zu aktualisieren)
parts = sorted((src / 'js').glob('[0-9][0-9].js'))
assert parts, 'web/js/*.js fehlt'
(out / 'app.js').write_text(''.join(p.read_text(encoding='utf-8') for p in parts), encoding='utf-8')
info = {'version': version, 'channel': channel, 'repo': repo, 'build': build}
(out / 'build-info.js').write_text('window.APP_BUILD = Object.freeze(' + json.dumps(info) + ');\n', encoding='utf-8')
html = (src / 'index.html').read_text(encoding='utf-8')
csp = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; "
       "connect-src 'self' https://api.github.com; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'none'")
html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="' + csp + '">\n<meta name="referrer" content="no-referrer">')
html = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>\n?', '', html)
html = html.replace('<script src="app.js" defer></script>', '<script src="build-info.js"></script>\n<script src="app.js" defer></script>')
assert 'build-info.js' in html and 'Content-Security-Policy' in html
(out / 'index.html').write_text(html, encoding='utf-8')
leaks = [p.name for p in out.iterdir() if p.suffix == '.json']
assert not leaks, f'Persönliche Daten dürfen nicht in die App: {leaks}'
print(f'www gebaut: Version {version}, Kanal {channel}, Repo {repo or "-"}')
