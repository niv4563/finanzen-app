#!/usr/bin/env python3
"""Prüft das Zertifikat-Pinning der Android-App gegen die echten Server.

Für jeden Dienst, mit dem die App spricht, wird die Zertifikatskette geholt und für jedes
Zertifikat (inkl. Wurzelzertifikat aus dem System) der SPKI-SHA-256-Wert berechnet.
Ist in network_security_config.xml ein <pin-set> eingetragen, muss jede Kette mindestens
einen der Pins enthalten – sonst schlägt der Build fehl, bevor ein Update Verbindungen kaputt macht.

Aufruf: python3 tools/check_pins.py [--report]   (--report: nur anzeigen, nie fehlschlagen)
"""
import base64, glob, hashlib, re, subprocess, sys, pathlib, xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent.parent
CFG = ROOT / 'android/app/src/main/res/xml/network_security_config.xml'
HOSTS = ['api.github.com', 'rest.budgetbakers.com', 'api.frankfurter.dev', 'ntfy.sh']
report = '--report' in sys.argv

def run(cmd, inp=None):
    return subprocess.run(cmd, input=inp, capture_output=True, timeout=30).stdout

def spki(pem):
    pub = run(['openssl', 'x509', '-pubkey', '-noout'], pem.encode())
    der = run(['openssl', 'pkey', '-pubin', '-outform', 'der'], pub)
    return base64.b64encode(hashlib.sha256(der).digest()).decode()

def field(pem, what):
    return run(['openssl', 'x509', '-noout', '-' + what, '-nameopt', 'RFC2253'], pem.encode()).decode().strip().split('=', 1)[-1]

# Wurzelzertifikate des Systems (für das letzte Glied der Kette)
roots = {}
for f in glob.glob('/etc/ssl/certs/*.pem'):
    try:
        pem = open(f).read()
        roots.setdefault(field(pem, 'subject'), pem)
    except Exception:
        pass

pins = set()
if CFG.exists():
    for pin in ET.parse(CFG).getroot().iter('pin'):
        pins.add((pin.text or '').strip())

bad = []
for h in HOSTS:
    out = run(['openssl', 's_client', '-connect', h + ':443', '-servername', h, '-showcerts'], b'').decode('utf-8', 'replace')
    chain = re.findall(r'-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----', out, re.S)
    if not chain:
        print(f'{h}: keine Verbindung'); bad.append(h); continue
    last_issuer = field(chain[-1], 'issuer')
    if last_issuer in roots and field(chain[-1], 'subject') != last_issuer:
        chain.append(roots[last_issuer])
    print(f'\n{h}')
    found = False
    for c in chain:
        s = spki(c); hit = s in pins; found |= hit
        print(f"  {'PIN ' if hit else '    '}{s}  {field(c, 'subject')[:90]}")
    if pins and not found:
        bad.append(h)

if pins:
    print(f'\n{len(pins)} Pins in network_security_config.xml')
if bad and pins and not report:
    print('::error::Zertifikat-Pinning passt nicht zu: ' + ', '.join(bad)); sys.exit(1)
print('Pinning geprüft' if pins else 'Noch kein Pinning eingetragen')
