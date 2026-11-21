# Änderungen

Neue Einträge immer oben anfügen. Der Abschnitt der Version erscheint in der App unter «Was ist neu?».

## 1.4.3
- Wichtige Korrektur: Die Verbindung zu den Android-Funktionen war fehlerhaft. Jetzt funktionieren Wallet-Verbindung, Fingerabdruck, Zurück-Taste, Sperre beim Verlassen der App, Backup teilen und Screenshots erlauben.

## 1.4.2
- Wallet-Verbindung robuster: Token wird automatisch bereinigt (z. B. «Bearer …», Leerzeichen), genaue Fehlermeldungen mit Fehlercode, automatische Wiederholung, wenn Wallet die Daten noch vorbereitet.
- Neu auf der Wallet-Seite: «Verbindung testen» und «Token ändern».

## 1.4.1
- Galaxy S24 und neuere Handys: Nichts liegt mehr unter der Statusleiste oben oder der Navigationsleiste unten. Symbole der Leisten passend hell/dunkel.
- Neue Versionen werden bei jedem Öffnen der App gesucht (statt nur alle 12 Stunden). Die installierte Version steht oben im Menü.
- Hinweis «Wallet verbinden» auf der Startseite.

## 1.4.0
- Menü links wie bei Wallet: über ☰ oben links, Gruppen einklappbar (Geplante Zahlungen, Budgets & Ziele, Konten, Planung, Import, Einstellungen). Auf dem PC lässt sich das Menü schmal stellen.
- Seitentitel oben in der grünen Leiste.
- Automatische Regeln wie bei Wallet: «Text enthält …», nur Ausgabe/Einnahme, Konto, Betrag von–bis → Kategorie, Übertrag oder ignorieren. Reihenfolge änderbar, auf alte Buchungen anwendbar.
- Wallet-Verbindung: Buchungen direkt aus Wallet by BudgetBakers übernehmen – einmalig alles oder automatisch beim Öffnen. Was schon per Bankdatei da ist, wird nicht doppelt übernommen.
- Screenshots lassen sich für 10 Minuten erlauben (Einstellungen → Daten & Sicherheit).

## 1.3.0
- Entsperren mit Fingerabdruck (Daten & Sicherheit → «Mit Fingerabdruck entsperren»). Die PIN liegt dafür verschlüsselt im Sicherheitschip des Handys.
- Neue Seite «Budget» wie bei Wallet: pro Kategorie ausgegeben, geplant und «noch übrig», dazu Betrag pro Tag.
- Neue Seite «Statistik»: Einnahmen und Ausgaben pro Monat, Ausgaben nach Kategorie, Zeitraum wählbar.
- Richtige Symbole in der Navigation statt Schriftzeichen; «Mehr» neu geordnet.
- Breite Tabellen lassen sich auf dem Handy seitlich schieben, die erste Spalte bleibt stehen.
- Überträge zwischen eigenen Konten werden überall lesbar angezeigt.

## 1.2.1
- App-Sperre einstellbar: Wenn du die App kurz verlässt, musst du die PIN nicht mehr jedes Mal eingeben. Standard: erst nach 30 Minuten. Wählbar von 1 Minute bis «erst wenn die App neu startet» (Daten & Backup → App-Sperre).
- Sperre bei Nichtbenutzung (App offen) ebenfalls bis 1 Stunde oder «nie» einstellbar.

## 1.2.0
- Neues Aussehen im Stil von Wallet: farbige Kontenkacheln, grüne Kopfzeile, runder Plus-Knopf.
- Startseite mit Kontostand-Verlauf der letzten 30 Tage (antippen zeigt den Stand des Tages), Ausgaben-Ring nach Bereich, letzten Buchungen und Budgets.
- Buchungen zeigen pro Tag die Summe.
- Unten in der Leiste neu «Statistik»; «Wünsche» findest du unter «Mehr».

## 1.1.0
- Neue Startseite wie bei Wallet: Kontostände, letzte Buchungen nach Tag, Monatsbudget und offene Rechnungen auf einen Blick.
- Bankdateien hochladen: CSV von PostFinance (Privatkonto, Sparkonto, Kreditkarte), Wallet und anderen Banken – unverändert, so wie von der Bank geladen. Mehrere Dateien auf einmal.
- Schon vorhandene Buchungen werden erkannt und übersprungen. Überträge zwischen eigenen Konten und Kreditkarten-Zahlungen zählen nicht doppelt.
- Kategorien werden automatisch vergeben und die App lernt pro Händler dazu.
- Rechnungen fotografieren: QR-Rechnungen werden exakt gelesen, Kassenzettel per Texterkennung – alles auf dem Gerät, Fotos werden nicht gespeichert.
- Offene Rechnungen mit Fälligkeit und Warnung, wenn das Konto nicht reicht. Beim Bank-Import werden bezahlte Rechnungen automatisch erkannt.
- Budget aus der Excel-Planung übernehmen (z. B. 2027).

## 1.0.0
- Erste Android-Version der Finanzen-App
- Daten nur auf dem Handy, verschlüsselt mit deiner PIN (AES-256)
- Sperrt sich automatisch, wenn die App 1 Minute im Hintergrund war
- Keine Screenshots, keine Vorschau in «Zuletzt verwendet»
- Backup verschlüsselt speichern und teilen (z. B. Google Drive, Mail)
- Topf «Unter Leuten», Wünsche mit Kategorien und Rangfolge
- Update-Funktion: Die App meldet neue Versionen selbst
