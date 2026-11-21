# Sicherheit der Android-App

Ehrlich vorweg: Einen offiziellen «Bankentest» oder ein Siegel, das man selbst erteilen kann, gibt es nicht.
Banken lassen ihre Apps nach dem Standard **OWASP MASVS** (Mobile Application Security Verification Standard)
prüfen – meist durch ein externes Prüfunternehmen. Diese App ist nach den Anforderungen von **MASVS L1** gebaut und
erfüllt zusätzlich mehrere Punkte aus **L2**. Ein unabhängiger Penetrationstest ist damit nicht ersetzt.

## Was umgesetzt ist

| Bereich (MASVS) | Massnahme |
|---|---|
| STORAGE – Daten auf dem Gerät | Alle Daten AES-256-GCM verschlüsselt, Schlüssel aus PIN via PBKDF2-SHA-256 (310 000 Runden). PIN ist in der App Pflicht. |
| STORAGE – Backups | `allowBackup=false`, Regeln für Cloud-Backup und Geräteübertragung schliessen alles aus. Nur eigene, verschlüsselte Backups. |
| STORAGE – Bildschirm | `FLAG_SECURE`: keine Screenshots/Aufnahmen, keine Vorschau in «Zuletzt verwendet». |
| AUTH – Sperre | Sperre nach max. 1 Min. im Hintergrund und nach Inaktivität; Wartezeit nach 5 Fehlversuchen, steigend. |
| NETWORK | Nur HTTPS (`cleartextTrafficPermitted=false`), nur System-Zertifikate (keine Benutzer-Zertifikate → Abhör-Proxys funktionieren nicht), ab Android 16 Certificate Transparency erzwungen. |
| PLATFORM – WebView | Inhalte nur aus der App selbst (https://localhost), kein `file://`-Zugriff, kein Mixed Content, keine Popups, Safe Browsing an, Debugging im Release aus. Strenge Content-Security-Policy: kein fremder Code, kein `eval`, Verbindungen nur zu api.github.com. |
| PLATFORM – Overlays | Eingaben werden ignoriert, wenn ein fremdes Fenster darüber liegt; fremde Overlays werden ausgeblendet (Android 12+). |
| PLATFORM – Task-Hijacking | `taskAffinity=""`, Mindestversion Android 10 (StrandHogg-2.0-Fix im System). |
| PLATFORM – Berechtigungen | Nur Internet und Overlay-Schutz. Keine Speicher-, Standort-, Kontakt- oder Installationsrechte. |
| CODE – Updates | Android installiert ein Update nur, wenn es mit demselben Schlüssel signiert ist. Die App akzeptiert Download-Adressen nur aus dem eigenen GitHub-Projekt. Vor einem Daten-Umbau legt sie eine Sicherheitskopie an. |
| CODE – Abhängigkeiten | Exakte Versionen (package-lock.json), `npm audit` im Build, GitHub-Actions auf Commit festgenagelt. |
| CODE – Build | Release nicht debuggbar, Signatur wird im Build gegen den erwarteten Fingerabdruck geprüft, SHA-256-Prüfsummen im Release. |
| Prüfung | Jeder Build: Android Lint, mobsfscan (OWASP-Regeln); Berichte unter «Actions → Artefakte». |

## Bewusst nicht umgesetzt (und warum)

- **Root-/Manipulationserkennung, Play Integrity:** sinnvoll bei Apps, die mit einem Bank-Server reden. Diese App hat keinen Server; die Verschlüsselung schützt die Daten auch auf einem gerooteten Gerät, solange die PIN geheim bleibt. Auf einem kompromittierten Handy ist keine App sicher.
- **Certificate Pinning für GitHub:** GitHub wechselt Zertifikate ohne Vorankündigung; ein Pin würde die Update-Prüfung irgendwann blockieren. Ersatz: Certificate Transparency + Signaturprüfung durch Android.
- **Code-Verschleierung (R8):** schützt Geschäftsgeheimnisse, nicht deine Daten. Der Code ist offen und enthält keine Geheimnisse.

## Hinweise aus dem Sicherheits-Scan (mobsfscan), bewertet

- *Task-Hijacking (singleTask):* abgesichert durch `taskAffinity=""` und Android 10+; `singleInstance` würde das Laden von Backups über die Dateiauswahl stören.
- *DOM-XSS-Stellen (innerHTML):* alle Benutzertexte laufen durch `esc()`; die Content-Security-Policy verhindert zusätzlich jeden eingeschleusten Code.
- *Root-Erkennung, Pinning, SafetyNet:* siehe oben.
