# Finanzen als Android-App – Anleitung

Die App wird nicht auf deinem PC gebaut, sondern kostenlos in der Cloud von **GitHub**.
Du brauchst keine Programmier-Software. Einmalige Einrichtung: noch ca. 10 Minuten.

**Was du bekommst:** eine echte Android-App (Android 10 bis 16, Zielversion Android 16 / API 36 – das verlangt der
Play Store seit 31.08.2026), die sich selbst meldet, wenn es eine neue Version gibt.

---

## Teil A – Einmalig einrichten (am Handy möglich)

### 1.–3. GitHub-Konto, Projekt, Dateien ✓
Erledigt: Konto `niv4563`, öffentliches Projekt `finanzen-app`, alle Dateien hochgeladen.
Das Projekt enthält **keine** persönlichen Daten. Der Build bricht ab, falls doch einmal eine Datendatei
(z. B. `Finanzen_Daten.json`, Excel, Schlüssel) hineingerät.

### 4. Signatur-Schlüssel hinterlegen (Secrets)
Der Schlüssel beweist Android, dass ein Update wirklich von dir stammt.
Öffne `GITHUB-SECRETS.txt` (separate Datei, **nicht** ins Projekt hochladen).
Im Projekt: **Settings → Secrets and variables → Actions → New repository secret** – fünfmal, je Name und Wert
genau wie in der Datei:
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_CERT_SHA256`

Danach: Inhalt von `GITHUB-SECRETS.txt` **und** die Datei `finanzen-release.jks` in deinen Passwort-Manager
(z. B. Bitwarden, 1Password, KeePass) – dann beide Dateien und das ZIP aus dem Download-Ordner löschen.
> ⚠️ Geht der Schlüssel verloren, kann die installierte App keine Updates mehr annehmen (dann: Backup → neu installieren).

### 5. Erste Version bauen
Sobald die Secrets eingetragen sind: **Actions** → links «Android-App» → **Run workflow** → bei «version» `1.0.0`
eintragen → **Run workflow**. (Ohne Secrets macht GitHub nur einen Test-Build und veröffentlicht nichts.)
Nach ca. 10–15 Minuten erscheint ein grüner Haken. Unter **Releases** (rechte Seite der Projektseite) liegt jetzt
`Finanzen-1.0.0.apk`.

Rotes Kreuz? Auf den Lauf klicken → roter Schritt zeigt den Grund (meist ein Tippfehler in einem Secret).
Den Text kannst du mir schicken.

---

## Teil B – Auf dem Handy installieren

1. Auf dem Handy die Release-Seite öffnen: `github.com/niv4563/finanzen-app/releases` → `Finanzen-1.0.0.apk` antippen.
2. Android fragt: «Installation aus dieser Quelle zulassen?» → für Chrome **zulassen**.
3. Google Play Protect prüft die App («App scannen») → **Installieren**.
   (Play Protect kennt deine App nicht – das ist normal bei eigenen Apps.)
4. App öffnen → **PIN festlegen** (Pflicht, mind. 6 Ziffern).
5. Danach die Erlaubnis wieder entziehen: Einstellungen → Apps → Chrome → «Unbekannte Apps installieren» → aus.
   Für ein Update kurz einschalten, danach wieder aus.

### Daten von der Browser-Version übernehmen
1. Browser-Version (Finanzen.html) → **Daten & Backup → Backup speichern (verschlüsselt)** → Passwort wählen.
2. Datei aufs Handy bringen (Mail an dich, Google Drive, USB).
3. In der App: **Mehr → Daten & Backup → Backup laden …** → Datei wählen → Passwort eingeben.

> Hinweis 2027: Google verlangt dann auch ausserhalb des Play Store registrierte Entwickler. Für private Apps gibt es
> ein **kostenloses Konto «Limited distribution»** (bis 20 Geräte, ohne Ausweis) in der *Android Developer Console*.
> Dort einmal den App-Namen `ch.nivaram.finanzen` und den Fingerabdruck `ANDROID_CERT_SHA256` registrieren.
> In der Schweiz gilt das noch nicht – du kannst es tun, sobald es verlangt wird.

---

## Teil C – Updates (so kommen künftige Änderungen in die App)

**Ablauf, wenn ich (Claude) etwas an der App ändere:**
1. Ich lade die geänderten Dateien direkt in dein Projekt und ergänze `CHANGELOG.md`
   (oder du machst es selbst: Ordner `web` → **Add file → Upload files**).
2. Steht oben in `CHANGELOG.md` eine neue Versionsnummer (z. B. `## 1.0.1`), baut und veröffentlicht GitHub
   die neue Version **automatisch**. (Von Hand: **Actions → Android-App → Run workflow** → Version eintragen,
   immer höher als die letzte.)
3. Fertig. Die App auf dem Handy meldet sich innerhalb von 12 Stunden mit **«Neue Version verfügbar»**
   (sofort: *Mehr → Daten & Backup → Nach Updates suchen*). «Jetzt aktualisieren» lädt die neue Version,
   Android installiert sie **über** die alte – deine Daten bleiben.

**Sicherheitsnetz bei Updates:**
- Android installiert ein Update nur, wenn es mit deinem Schlüssel signiert ist. Eine gefälschte App wird abgelehnt.
- Die App lädt Updates nur aus deinem eigenen GitHub-Projekt.
- Der Build prüft, ob die Version neuer ist und ob mit dem richtigen Schlüssel signiert wurde.
- Vor jedem Daten-Umbau speichert die App den alten Stand. Rückweg: *Daten & Backup → Stand vor Update … wiederherstellen*.

---

## Teil D – Google Play Store (optional, später)

Realistisch prüfen, bevor du es angehst:
- Einmalig **USD 25** für das Entwicklerkonto, Identitätsprüfung mit Ausweis.
- Neue private Entwicklerkonten müssen die App erst **14 Tage mit mindestens 12 Testern** in einem geschlossenen Test
  laufen lassen, bevor sie öffentlich werden darf.
- Benötigt werden: Datenschutzerklärung (liegt bei: `DATENSCHUTZ.md`, als Link auf GitHub), Formular «Datensicherheit»
  (Antwort: *keine Daten erhoben, keine Daten geteilt, Daten verschlüsselt*), Screenshots, Beschreibung.
- Die Datei dafür baut GitHub bereits mit: `Finanzen-x.y.z-play.aab` im Release (ohne eigene Update-Funktion –
  im Play Store aktualisiert der Store).
- Wichtig: Die Play-Version und die direkt installierte Version tragen verschiedene Signaturen
  (Google signiert neu). Auf einem Handy also **entweder** Play **oder** direkt – Wechsel nur über Backup.

Für die private Nutzung ist der direkte Weg (Teil B) vollkommen ausreichend.

---

## Was bei jedem Build automatisch geprüft wird
- Keine persönlichen Daten oder Schlüssel im Projekt
- Bibliotheken ohne bekannte Sicherheitslücken (`npm audit`)
- Programmcode fehlerfrei (Syntax-Prüfung, Android Lint)
- Sicherheits-Scan nach OWASP-Regeln (mobsfscan)
- Richtige Signatur, Prüfsummen im Release

Berichte: Actions → Lauf anklicken → unten «Artifacts». Details zur Sicherheit: `SICHERHEIT-ANDROID.md`.
