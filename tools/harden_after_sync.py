#!/usr/bin/env python3
"""Nach «cap sync/copy»: von Capacitor erzeugte Cordova-Freigabe <access origin="*"> entfernen.
Die App nutzt keine Cordova-Plugins und braucht diese Freigabe nicht."""
import pathlib
p = pathlib.Path(__file__).resolve().parent.parent / 'android/app/src/main/res/xml/config.xml'
if p.exists():
    s = p.read_text(encoding='utf-8').replace('<access origin="*" />', '')
    p.write_text(s, encoding='utf-8')
    assert 'origin="*"' not in s
print('config.xml gehärtet')
