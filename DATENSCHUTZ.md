# Datenschutzerklärung – Finanzen (Android-App)

Stand: November 2026

**Kurz:** Die App sammelt keine Daten über dich und schickt deine Finanzdaten nirgendwohin.

1. **Deine Finanzdaten** (Budget, Buchungen, Konten, Wünsche) werden nur auf deinem Gerät gespeichert, verschlüsselt mit deiner PIN (AES-256-GCM, Schlüssel aus PBKDF2 mit 310 000 Durchläufen). Niemand ausser dir kann sie lesen – auch nicht der Entwickler.
2. **Keine Konten, keine Werbung, keine Analyse- oder Tracking-Dienste**, keine Drittanbieter-Bibliotheken für Statistik oder Absturzberichte.
3. **Backups von Android/Google** sind für diese App ausgeschaltet. Ein Backup entsteht nur, wenn du selbst «Backup speichern» wählst. Es ist mit deinem Passwort verschlüsselt, du bestimmst, wo es liegt.
4. **Update-Prüfung** (nur bei der Version ausserhalb des Play Store): Die App fragt höchstens alle 12 Stunden bei GitHub (api.github.com) nach, ob eine neue Version da ist. Dabei werden keine Finanzdaten übertragen. GitHub sieht wie bei jedem Webseitenaufruf deine IP-Adresse (Datenschutz von GitHub: https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement).
5. **Berechtigungen:** «Internet» (Update-Prüfung und freiwillige Dienste unten), «fremde Overlays ausblenden» (Schutz vor Klick-Betrug), «Biometrie verwenden» (Fingerabdruck) und «Mitteilungen» (nur wenn du sie einschaltest). Kein Zugriff auf Kontakte, Standort, Kamera, Mikrofon oder Dateien.
6. **Löschen:** In der App unter «Daten & Backup → Alle Daten löschen» oder durch Deinstallieren der App werden alle Daten entfernt.

Kontakt: über die E-Mail-Adresse im Play-Store-Eintrag bzw. im GitHub-Projekt.

## Bankdateien und Fotos (ab Version 1.1)
- Hochgeladene Bankdateien (CSV) werden nur auf dem Gerät gelesen. Gespeichert werden die einzelnen Buchungen – verschlüsselt wie alle anderen Daten. Die Datei selbst wird nicht aufbewahrt.
- Fotos von Rechnungen und Belegen werden nur auf dem Gerät ausgewertet (QR-Code-Leser und Texterkennung sind in der App enthalten, nichts wird aus dem Internet nachgeladen). Die App speichert das Foto nicht; Android legt es kurz im privaten App-Ordner ab, und die App löscht es dort nach spätestens 30 Minuten.
- Die App braucht dafür keine Kamera-Berechtigung: Android öffnet die Kamera-App, und nur das eine Foto kommt zurück.
- PDF-Dokumente (Verträge, Rechnungen; ab Version 1.17) werden ebenfalls nur auf dem Gerät gelesen – mit Mozilla pdf.js, das fest in der App enthalten ist. Das PDF wird nicht gespeichert.

## Fingerabdruck (ab Version 1.3)
- Wenn du «Mit Fingerabdruck entsperren» einschaltest, wird deine PIN mit einem Schlüssel im Sicherheitschip des Handys verschlüsselt. Der Schlüssel verlässt den Chip nie und funktioniert nur nach einem erkannten Fingerabdruck.
- Die App sieht deinen Fingerabdruck nie – Android meldet nur «erkannt» oder «nicht erkannt». Dafür braucht die App die Berechtigung «Biometrie verwenden».
- Kommt im Handy ein neuer Fingerabdruck dazu, wird der Schlüssel automatisch ungültig; dann ist wieder die PIN nötig.

## Wallet-Verbindung und Screenshots (ab Version 1.4)
- Nur wenn du die Wallet-Verbindung einrichtest: Die App holt deine Buchungen direkt bei BudgetBakers (rest.budgetbakers.com) ab – ab Version 1.20 automatisch alle 3 Minuten, solange die App offen ist. Ab Version 1.20 trägt sie zudem Buchungen, die du in der App erfasst, änderst oder löschst, auch in Wallet ein (Betrag, Datum, Konto, Kategorie, Notiz). Das lässt sich auf der Wallet-Seite ausschalten («App → Wallet»). Ab Version 1.28 kann auch die Web-Version direkt mit Wallet sprechen (gleicher Token, verschlüsselt in deinen Daten; im Browser nur im Arbeitsspeicher entschlüsselt). Übernommen werden auch Kategorien und automatische Regeln. Übertragen wird nur an rest.budgetbakers.com. Der API-Token liegt verschlüsselt in deinen App-Daten und im verschlüsselten Backup. Mit «Verbindung trennen» wird er gelöscht.
- Screenshots sind gesperrt. Du kannst sie bei Bedarf für 10 Minuten erlauben; danach und beim Sperren der App ist der Schutz automatisch wieder aktiv.

## Geräte-Sync (ab Version 1.6)
- Freiwillig. Ohne Einrichtung verlassen deine Daten das Gerät nicht.
- Die App legt nur eine Datei «finanzen.enc.json» in **deinem eigenen privaten** GitHub-Repository ab. Inhalt: komprimiert und mit AES-256-GCM verschlüsselt. Der Schlüssel (32 Zufallsbytes) wird auf dem Gerät erzeugt und nie an GitHub geschickt.
- GitHub sieht nur unlesbare Daten, Zeitpunkt und Grösse. Ohne Verbindungscode kann niemand die Daten lesen – auch GitHub und der Entwickler nicht.
- Der Verbindungscode enthält Repository, Zugangs-Token und Schlüssel. Er wird in der App verschlüsselt gespeichert (mit deiner PIN). Behandle ihn wie ein Passwort.
- Der Token sollte nur für dieses eine Repository und nur «Contents» gelten. So kann er nichts anderes in deinem GitHub-Konto ändern.
- Die App spricht dafür nur mit api.github.com (in der Sicherheitsregel der App fest eingetragen).
- Anmeldung der Web-Version per QR-Code (ab Version 1.29): Das Handy zeigt den Verbindungscode als QR-Code, die Web-Version liest ihn mit der Kamera des PCs – nur lokal, nichts geht dafür übers Internet. Das Kamerabild wird nicht gespeichert. Die Web-Version bleibt bis Mitternacht verbunden (ein zufälliger Tages-Schlüssel ersetzt die PIN) und löscht danach ihre Kopie der Daten im Browser.


## Wechselkurse (ab Version 1.12)
- Nur wenn du Konten in Fremdwährung hast: Die App holt höchstens alle 12 Stunden die Referenzkurse der Europäischen Zentralbank bei api.frankfurter.dev.
- Gesendet werden nur die Währungskürzel (z. B. «EUR,USD»), keine Beträge, keine Kontonamen, keine anderen Daten. Der Dienst sieht wie jede Webseite deine IP-Adresse.
- Du kannst für jede Währung einen eigenen Kurs eintragen; dann wird dieser verwendet.

## Finanz-Assistent (ab Version 1.14)
- Prognosen, Kaufverhalten, Spartipps, KI-Zuordnung und «Frag die App» werden vollständig auf deinem Gerät berechnet. Es wird kein KI-Dienst im Internet verwendet, und es werden dafür keine Daten verschickt.
- Die KI-Zuordnung lernt nur aus deinen eigenen, bereits zugeordneten Buchungen. Das gelernte Modell wird nicht gespeichert, sondern bei Bedarf neu berechnet.

## Mitteilungen (ab Version 1.14)
- Freiwillig. Erst wenn du sie bei der Glocke einschaltest, fragt Android nach der Berechtigung «Mitteilungen».
- Die App plant die Mitteilungen selbst mit dem Android-Wecker. Es gibt keinen Push-Server und keine Verbindung ins Internet dafür.
- Standard: Die Mitteilung zeigt keine Namen und Beträge (z. B. «Heute ist eine Zahlung fällig»). Auf dem Sperrbildschirm zeigt Android immer nur «Finanzen – Neuer Hinweis».

## Fingerabdruck / Windows Hello im Browser (ab Version 1.14)
- Freiwillig, nur in der Web-Version. Die PIN wird mit einem Schlüssel verschlüsselt, den nur der Passkey deines Geräts (Sicherheitschip) nach Fingerabdruck, Gesichtserkennung oder Windows Hello herausgibt (WebAuthn mit PRF).
- Gespeichert wird nur die verschlüsselte PIN im Browser. Ohne den Passkey auf genau diesem Gerät ist sie wertlos. Bei einer neuen PIN wird sie gelöscht.
