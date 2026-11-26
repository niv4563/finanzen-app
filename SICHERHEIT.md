# Sicherheit der Finanzen-App (Android, iPhone, PC)

Banken lassen ihre Apps nach **OWASP MASVS** (Mobile Application Security Verification Standard) prüfen,
in der strengen Stufe **L2** und meist zusätzlich mit **MASVS-RESILIENCE** (Schutz gegen Manipulation).
Diese Seite zeigt Punkt für Punkt, wie die App diese Anforderungen erfüllt – und was nur ein
unabhängiger Prüfer bestätigen kann.

Grundsatz: **Die App hat keinen eigenen Server.** Deine Daten liegen verschlüsselt auf deinen Geräten
und – wenn du den Geräte-Abgleich nutzt – verschlüsselt in deinem eigenen privaten GitHub-Repository.
Niemand ausser dir hat den Schlüssel.

## MASVS-STORAGE – Daten auf dem Gerät

| Anforderung | Umsetzung |
|---|---|
| Sensible Daten nur verschlüsselt speichern | AES-256-GCM. Schlüssel aus der PIN (PBKDF2-SHA-256, 600 000 Durchläufe) **und** einem 256-Bit-Geräteschlüssel aus dem Sicherheitschip (Android Keystore/StrongBox, iPhone-Schlüsselbund «nur dieses Gerät»). |
| Keine Daten in Backups | Android: `allowBackup=false`, Regeln für Cloud-Backup und Geräteübertragung schliessen alles aus. iPhone: App-Daten von der iCloud-Sicherung ausgeschlossen. Nur eigene, verschlüsselte Sicherungen. |
| Keine Daten in Bildschirmfotos | Android: `FLAG_SECURE` (keine Bildschirmfotos und Aufnahmen, keine Vorschau im App-Umschalter). iPhone: Beträge im App-Umschalter und bei Bildschirmaufnahme verdeckt (iOS erlaubt keiner App, Bildschirmfotos zu verbieten). |
| Keine Daten in Protokollen | Capacitor-Protokolle ausgeschaltet (`loggingBehavior: none`), kein Tracking, keine Analyse-Dienste. |
| Fotos von Belegen | Werden nur zur Erkennung genutzt und nach spätestens 30 Minuten gelöscht. |

## MASVS-CRYPTO – Verschlüsselung

| Anforderung | Umsetzung |
|---|---|
| Bewährte Verfahren, keine Eigenbauten | WebCrypto (AES-GCM, PBKDF2, SHA-256) und die Schlüsselspeicher des Betriebssystems. |
| Zufallszahlen | `crypto.getRandomValues`, `SecureRandom`, `SecRandomCopyBytes`. |
| Schlüssel nie im Code | Keine Schlüssel im Projekt. Der Signatur-Schlüssel liegt nur als GitHub-Secret vor; der Build prüft, dass keine privaten Schlüssel im Projekt liegen. |

## MASVS-AUTH – Anmeldung

| Anforderung | Umsetzung |
|---|---|
| Entsperren | PIN (nur Zahlen) oder Fingerabdruck / Face ID. Biometrie gibt die PIN nur über den Sicherheitschip frei; neue Fingerabdrücke bzw. neues Face ID machen die Freigabe ungültig. |
| Sperre | Sofort beim Verlassen der App (einstellbar) und nach Inaktivität. Nach 5 Fehlversuchen steigende Wartezeit. |
| Beim Sperren | Schlüssel und entschlüsselte Daten werden aus dem Speicher entfernt (automatisch getestet). |

## MASVS-NETWORK – Verbindungen

| Anforderung | Umsetzung |
|---|---|
| Nur verschlüsselt | Android: `cleartextTrafficPermitted=false`. iPhone: App Transport Security ohne Ausnahmen. |
| Nur vertrauenswürdige Zertifikate | Nur System-Zertifikate; vom Benutzer installierte Zertifikate (Abhör-Proxys) werden abgelehnt. Android 16 erzwingt zusätzlich Certificate Transparency. |
| Nur bekannte Gegenstellen | Content-Security-Policy erlaubt nur api.github.com, rest.budgetbakers.com (Wallet), api.frankfurter.dev (Wechselkurse) und ntfy.sh (verschlüsselte Durchreiche beim PC-Verbinden). |
| Zertifikat-Pinning | Vorbereitet: `tools/check_pins.py` liest die echten Zertifikatsketten bei jedem Build. Die Pins werden eingetragen, sobald die Ketten aus dem Build vorliegen (mit Ablaufdatum, damit ein Zertifikatswechsel die App nie aussperrt). |

## MASVS-PLATFORM – Zusammenspiel mit dem Betriebssystem

| Anforderung | Umsetzung |
|---|---|
| WebView gehärtet | Inhalte nur aus der App selbst, kein `file://`, kein Mixed Content, keine Popups, Safe Browsing, Debugging im Release aus (Android) bzw. `isInspectable=false` (iPhone). Strenge Content-Security-Policy ohne `eval`. |
| Overlays / Tapjacking | Android: Eingaben werden ignoriert, wenn ein fremdes Fenster darüber liegt; fremde Overlays ausgeblendet. |
| Task-Hijacking | `taskAffinity=""`, Mindestversion Android 10. |
| Berechtigungen | Nur Internet, Biometrie, Mitteilungen, Kamera (QR-Code). Kein Standort, keine Kontakte, kein Speicherzugriff. |
| Eingebettet in fremde Seiten (PC) | Die PC-Version verweigert die Anzeige in einem fremden Rahmen (Clickjacking). |

## MASVS-CODE – Programmcode und Updates

| Anforderung | Umsetzung |
|---|---|
| Aktuelle Plattform | Android: Ziel API 36 (Android 16), Mindestens Android 10. iPhone: ab iOS 15. |
| Updates nur echt | Android installiert ein Update nur mit demselben Signatur-Schlüssel; die App lädt Updates nur aus dem eigenen GitHub-Projekt. Im Release stehen SHA-256-Prüfsummen und der Zertifikats-Fingerabdruck. |
| Abhängigkeiten | Feste Versionen, `npm audit` bei jedem Build, alle GitHub Actions auf einen Commit festgenagelt. |
| Automatische Tests | `tests/e2e_test.py` prüft bei jedem Build mit erfundenen Daten: Verschlüsselung (falsche PIN abgelehnt, nichts im Klartext, nach dem Sperren nichts im Speicher), jede Seite und jeden Knopf. Fehler stoppen den Build und die Veröffentlichung der PC-Version. (Aktiv, sobald die Abläufe aus `tools/workflows/` eingeschaltet sind.) |
| Statische Prüfung | Android Lint und mobsfscan (OWASP-Regeln) bei jedem Build. |

## MASVS-RESILIENCE – Schutz gegen Manipulation

| Anforderung | Umsetzung |
|---|---|
| Root / Jailbreak erkennen | Bei jedem Entsperren: su-Dateien, Magisk, KernelSU, APatch, Test-Schlüssel (Android); Cydia, Sileo, rootless-Jailbreak, Schreiben ausserhalb der App (iPhone). |
| Hooking erkennen | Frida, Xposed/LSPosed, Substrate, Zygisk (Android); Frida, Substrate, Substitute, ElleKit, `DYLD_INSERT_LIBRARIES` (iPhone). |
| Debugger erkennen | `Debug.isDebuggerConnected` (Android), `P_TRACED` (iPhone). |
| Echtheit der App | Die Android-App vergleicht ihre eigene Signatur mit dem offiziellen Zertifikat. Aus dem Play Store bzw. App Store prüft das der Store. |
| Reaktion | Deutliche Warnung beim Entsperren und unter Einstellungen › Daten & Sicherheit › Sicherheitsprüfung. **Bewusst keine Sperre**, damit du nie von deinen eigenen Daten ausgesperrt wirst. |
| Zugangsschlüssel | Die App warnt, wenn der GitHub-Zugangsschlüssel für den Abgleich mehr darf als nötig (klassischer Token oder Rechte am App-Projekt). |

## Was nur ein unabhängiger Prüfer bestätigen kann

- **Penetrationstest** durch ein externes Prüfunternehmen (bei Banken üblich, kostet je nach Umfang mehrere tausend Franken).
  Alles Nötige liegt offen im Projekt; der Quellcode enthält keine Geheimnisse.
- **Code-Verschleierung (R8/Obfuscation):** bewusst nicht eingeschaltet. Sie schützt Geschäftsgeheimnisse, nicht
  deine Daten – die App-Logik liegt ohnehin offen. Ein Prüfer bewertet das als «Hinweis», nicht als Lücke.

## Sicherheitslücke gefunden?

Siehe [SECURITY.md](SECURITY.md).
