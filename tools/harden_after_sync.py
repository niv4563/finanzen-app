#!/usr/bin/env python3
"""Nach «cap sync/copy»: von Capacitor erzeugte Cordova-Freigabe <access origin="*"> entfernen (Android und iPhone).
Die App nutzt keine Cordova-Plugins und braucht diese Freigabe nicht."""
import pathlib
base = pathlib.Path(__file__).resolve().parent.parent
for rel in ['android/app/src/main/res/xml/config.xml', 'ios/App/App/config.xml']:
    p = base / rel
    if p.exists():
        s = p.read_text(encoding='utf-8').replace('<access origin="*" />', '')
        p.write_text(s, encoding='utf-8')
        assert 'origin="*"' not in s
        print(rel, 'gehärtet')
