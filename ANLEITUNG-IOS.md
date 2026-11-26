# iPhone-Version

Die iPhone-Version ist fertig vorbereitet: gleiche App, gleiche Verschlüsselung, Face ID statt Fingerabdruck.
GitHub baut sie auf einem Mac in der Cloud – **du brauchst keinen eigenen Mac**.

| Was | Wo |
|---|---|
| Eigene iPhone-Bausteine (Face ID, Schlüsselbund, Bildschirmschutz, Mitteilungen, Sicherheitsprüfung) | `ios-src/FinanzenNative.swift` |
| Datenschutz-Angaben für Apple (kein Tracking, keine gesammelten Daten) | `ios-src/PrivacyInfo.xcprivacy` |
| iPhone-Projekt erzeugen (Capacitor-Vorlage + eigene Teile, Symbol, Face-ID-Texte) | `tools/ios_prepare.py` |
| Build in der Cloud | `tools/workflows/ios.yml` (einmal installieren, siehe unten) |

## Schritt 1 – Build einschalten (einmalig, 2 Minuten, kostenlos)

Siehe [tools/workflows/README.md](tools/workflows/README.md): die Datei `ios.yml` nach `.github/workflows/` kopieren.
Danach baut GitHub bei jeder Änderung eine iPhone-Version für den Simulator und prüft, dass alles übersetzt.
Dafür braucht es noch kein Apple-Konto.

## Schritt 2 – Apple-Entwicklerkonto (erst wenn du die App auf ein iPhone bringen willst)

1. Auf <https://developer.apple.com/programs/> anmelden (99 USD pro Jahr, als Privatperson möglich).
2. In **App Store Connect › Apps › +** eine neue App anlegen: Name «Finanzen», Bundle-ID `ch.nivaram.finanzen`,
   Sprache Deutsch.
3. In **App Store Connect › Benutzer und Zugriff › Integrationen › App Store Connect API** einen Schlüssel
   mit der Rolle **App Manager** erstellen. Die .p8-Datei wird nur einmal angeboten – sicher aufbewahren.
4. In GitHub unter **Settings › Secrets and variables › Actions** diese Secrets anlegen:

| Secret | Inhalt |
|---|---|
| `APPLE_TEAM_ID` | Team-ID (developer.apple.com › Account › Membership) |
| `ASC_KEY_ID` | Schlüssel-ID des API-Schlüssels |
| `ASC_ISSUER_ID` | Issuer-ID (steht über der Schlüsselliste) |
| `ASC_KEY_P8_BASE64` | Inhalt der .p8-Datei in Base64 (Mac/Linux: `base64 -i AuthKey_XXXX.p8`, Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("AuthKey_XXXX.p8"))`) |

Ab dann signiert GitHub die App automatisch (Apple verwaltet Zertifikat und Profil) und lädt sie zu
**TestFlight** hoch. Auf dem iPhone die App «TestFlight» installieren und die Finanzen-App von dort installieren.

Die .p8-Datei und alle Apple-Zertifikate gehören **nie** ins Projekt – der Build bricht ab, wenn eine solche
Datei im Projekt liegt.

## Schritt 3 – Im App Store veröffentlichen (freiwillig)

Für dich allein reicht TestFlight (bis 90 Tage pro Build, danach einfach neu bauen). Für den App Store:

- **Datenschutz-Angaben** in App Store Connect: «Keine Daten erfasst». Das stimmt, weil alles verschlüsselt
  auf dem Gerät bleibt und die App keinen eigenen Server hat.
- **Datenschutzerklärung (Link)**: `DATENSCHUTZ.md` z. B. über GitHub Pages veröffentlichen.
- **Exportkontrolle**: Die App nutzt nur die Verschlüsselung des Betriebssystems (in Info.plist bereits als
  «ausgenommen» angegeben).
- **Hinweis für die Prüfung durch Apple** (Feld «Notes» in App Review Information), wegen Regel 3.2.1 (viii):

  > This is a personal budgeting app. It does not move money, trade or invest, and it is not a financial
  > service. All data stays encrypted on the device; there is no backend. The optional import from the
  > budgeting service «Wallet by BudgetBakers» uses BudgetBakers' public REST API with the user's own
  > personal API token, in line with its terms. For review: on first launch tap «Leer beginnen» and set any PIN.

  Apple kann Finanz-Apps von Privatpersonen trotzdem ablehnen. Dann bleibt TestFlight oder die PC-Version in Safari.

## Unterschiede zu Android

- **Bildschirmfotos** lassen sich auf dem iPhone nicht verbieten. Die App verdeckt die Beträge im App-Umschalter
  und während einer Bildschirmaufnahme.
- **Updates** kommen über TestFlight bzw. den App Store, nicht über die eigene Update-Funktion.
- **Sicherung**: Die App-Daten sind von der iCloud-Sicherung ausgeschlossen (wie auf Android). Nutze die
  verschlüsselte Sicherung der App oder den Geräte-Abgleich.
