#!/usr/bin/env python3
"""Erstellt das iPhone-Projekt (ios/) aus der Capacitor-Vorlage und baut die eigenen Teile ein.

Im Projekt liegen nur die eigenen Dateien (ios-src/). Die Vorlage erzeugt Capacitor beim Build neu –
so bleibt sie immer passend zur Capacitor-Version und es liegen keine Binärdateien im Projekt.
Aufruf (nach «npm install» und dem Bau von www/):  python3 tools/ios_prepare.py
"""
import pathlib, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
IOS = ROOT / 'ios'
APP = IOS / 'App' / 'App'

if not (IOS / 'App' / 'App.xcodeproj').exists():
    subprocess.run(['npx', 'cap', 'add', 'ios'], cwd=ROOT, check=True)

for f in (ROOT / 'ios-src').iterdir():
    shutil.copy(f, APP / f.name)

def patch(rel, old, new):
    p = IOS / rel; s = p.read_text(encoding='utf-8')
    if new in s: return
    assert s.count(old) == 1, f'{rel}: Stelle nicht gefunden: {old[:60]}'
    p.write_text(s.replace(old, new), encoding='utf-8')

# Eigener Haupt-Bildschirm (registriert Face ID, Schlüsselbund, Bildschirmschutz, Mitteilungen, Sicherheitsprüfung)
patch('App/App/SceneDelegate.swift', 'window?.rootViewController = CAPBridgeViewController()',
      'window?.rootViewController = MainViewController()   // registriert die eigenen Bausteine (FinanzenNative.swift)')
# App-Daten nicht in die iCloud-Sicherung
patch('App/App/AppDelegate.swift', '        // Override point for customization after application launch.\n        return true',
      '        // Daten der App nicht in die iCloud-Sicherung (wie allowBackup=false auf Android)\n        BackupExclusion.apply()\n        return true')

# Xcode-Projekt: FinanzenNative.swift (Quellcode) und PrivacyInfo.xcprivacy (Datenschutz-Angaben) aufnehmen
X = 'App/App.xcodeproj/project.pbxproj'
patch(X, '/* SceneDelegate.swift */; };\n/* End PBXBuildFile section */',
      '/* SceneDelegate.swift */; };\n'
      '\t\tF1A5C0012F00000100AB0001 /* FinanzenNative.swift in Sources */ = {isa = PBXBuildFile; fileRef = F1A5C0022F00000100AB0001 /* FinanzenNative.swift */; };\n'
      '\t\tF1A5C0032F00000100AB0001 /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = F1A5C0042F00000100AB0001 /* PrivacyInfo.xcprivacy */; };\n'
      '/* End PBXBuildFile section */')
patch(X, 'path = SceneDelegate.swift; sourceTree = "<group>"; };\n',
      'path = SceneDelegate.swift; sourceTree = "<group>"; };\n'
      '\t\tF1A5C0022F00000100AB0001 /* FinanzenNative.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = FinanzenNative.swift; sourceTree = "<group>"; };\n'
      '\t\tF1A5C0042F00000100AB0001 /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };\n')
patch(X, '\t\t\t\t9582B6822FE993A50072D4E8 /* SceneDelegate.swift */,\n',
      '\t\t\t\t9582B6822FE993A50072D4E8 /* SceneDelegate.swift */,\n'
      '\t\t\t\tF1A5C0022F00000100AB0001 /* FinanzenNative.swift */,\n'
      '\t\t\t\tF1A5C0042F00000100AB0001 /* PrivacyInfo.xcprivacy */,\n')
patch(X, '/* SceneDelegate.swift in Sources */,\n',
      '/* SceneDelegate.swift in Sources */,\n\t\t\t\tF1A5C0012F00000100AB0001 /* FinanzenNative.swift in Sources */,\n')
patch(X, '/* config.xml in Resources */,\n',
      '/* config.xml in Resources */,\n\t\t\t\tF1A5C0032F00000100AB0001 /* PrivacyInfo.xcprivacy in Resources */,\n')

# Info.plist: Sprache, Face ID, Kamera, Verschlüsselung (nur Betriebssystem), Link «finanzen://», nur HTTPS
P = 'App/App/Info.plist'
patch(P, '<key>CFBundleDevelopmentRegion</key>\n\t<string>en</string>', '<key>CFBundleDevelopmentRegion</key>\n\t<string>de-CH</string>')
patch(P, '<array>\n\t\t<string>armv7</string>\n\t</array>',
      '<array>\n\t\t<string>arm64</string>\n\t</array>\n'
      '\t<key>NSFaceIDUsageDescription</key>\n\t<string>Mit Face ID öffnest du deine Finanzen, ohne die PIN einzutippen. Die App sieht dein Gesicht nie, nur «erkannt» oder «nicht erkannt».</string>\n'
      '\t<key>NSCameraUsageDescription</key>\n\t<string>Die Kamera wird nur zum Scannen von QR-Rechnungen und des Anmelde-QR-Codes am PC gebraucht. Es werden keine Fotos gespeichert.</string>\n'
      '\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>\n'
      '\t<key>CFBundleURLTypes</key>\n\t<array>\n\t\t<dict>\n\t\t\t<key>CFBundleURLName</key>\n\t\t\t<string>ch.nivaram.finanzen.verbinden</string>\n'
      '\t\t\t<key>CFBundleURLSchemes</key>\n\t\t\t<array>\n\t\t\t\t<string>finanzen</string>\n\t\t\t</array>\n\t\t</dict>\n\t</array>\n'
      '\t<key>NSAppTransportSecurity</key>\n\t<dict>\n\t\t<key>NSAllowsArbitraryLoads</key>\n\t\t<false/>\n\t</dict>')

import plistlib
plistlib.loads((APP / 'Info.plist').read_bytes()); plistlib.loads((APP / 'PrivacyInfo.xcprivacy').read_bytes())
subprocess.run([sys.executable, str(ROOT / 'tools' / 'ios_assets.py')], check=True)
print('iPhone-Projekt vorbereitet')
