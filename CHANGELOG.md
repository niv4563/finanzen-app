# Änderungen

Neue Einträge immer oben anfügen. Der Abschnitt der Version erscheint in der App unter «Was ist neu?».

## 1.58.0
- **Konten nach Art:** Sechs Kontoarten statt bisher fünf Gruppen – auf der Startseite, bei «Konten» und bei jedem Konto wählbar:
  - **Gewöhnliche Konten** (Privatkonto, Lohnkonto, Bargeld – auch in Fremdwährung)
  - **Sparkonten** (Sparkonto, Reserve, Notgroschen, Rückstellungen)
  - **Haushaltkonten** (Haushaltkonto und Haushalt-Sparkonto)
  - **Kreditkarten & Kredite** (Kreditkarten, Kredite, Leasing, Ratenkäufe)
  - **Investkonten** (Depot, ETF, Aktien, Fonds, Krypto)
  - **Langfristige Konten** (Säule 3a, Freizügigkeit, Pensionskasse)
  Die Art wird aus dem Namen erkannt. Ändern: Konto antippen › «Name, Farbe & Symbol ändern» › Kontoart.
- **Kreditkarten mit allen Angaben:** Jahreszins, Kreditlimite, Abrechnungstag, «zahlbar bis», Jahresgebühr, Gebühr für Fremdwährung und ob du jeden Monat den ganzen Betrag zahlst. Bei Krediten und Leasing: Zins, Rate pro Monat, Laufzeit und Fälligkeit.
- Unter «Konten» neu die Karte **Kreditkarten & Kredite**: Auslastung der Limite, Zins pro Monat in Franken, nächste Abrechnung und Fälligkeit – und was zusammen an Zins anfällt. Fehlende Angaben werden genannt.
- **Mitteilung 3 Tage vor der Fälligkeit** einer Kreditkartenrechnung oder Kreditrate (abschaltbar pro Konto).
- Berater und «Mein Plan» rechnen mit dem hier eingetragenen Zins. Analyse › Investitionen zeigt Invest- und langfristige Konten.

## 1.57.0
- **Sicherheit auf Bank-Niveau (OWASP MASVS L2):**
  - **Sicherheitsprüfung bei jedem Entsperren:** Die App erkennt ein gerootetes Handy, Werkzeuge, die Apps beobachten oder verändern (Frida, Xposed, Magisk …), einen angehängten Debugger und ob sie selbst die offizielle, unveränderte Version ist. Sie **warnt** deutlich, sperrt aber nie – deine Daten bleiben immer erreichbar.
  - **Zugangsschlüssel für den Geräte-Abgleich:** Warnung, wenn er mehr darf als nötig (z. B. Rechte am App-Projekt, mit denen jemand ein verändertes Update veröffentlichen könnte).
  - Übersicht unter **Einstellungen › Daten & Sicherheit › Sicherheitsprüfung** mit «Jetzt prüfen».
  - PC-Version: lässt sich nicht mehr in fremde Webseiten einbetten (Schutz vor untergeschobenen Klicks).
  - **Automatische Tests:** Bei jedem Build werden mit erfundenen Daten die Verschlüsselung (falsche PIN abgelehnt, nichts im Klartext, nach dem Sperren nichts mehr im Speicher), jede Seite und jeder Knopf geprüft. Ein Fehler wie bei den Berater-Knöpfen stoppt künftig die Veröffentlichung. Die Tests laufen, sobald die neuen Build-Abläufe einmalig eingeschaltet sind (tools/workflows).
  - Neue Beschreibung SICHERHEIT.md: Punkt für Punkt nach dem Prüfstandard der Banken.
- **iPhone-Version vorbereitet:** gleiche App mit Face ID, Geräteschlüssel im Schlüsselbund des iPhones, verdeckten Beträgen im App-Umschalter, Mitteilungen und Sicherheitsprüfung (Jailbreak). Datenschutz-Angaben für Apple: kein Tracking, keine gesammelten Daten. GitHub baut sie in der Cloud auf einem Mac; für TestFlight braucht es ein Apple-Entwicklerkonto (siehe ANLEITUNG-IOS.md).

## 1.56.1
- **Berater: Knöpfe führen ans richtige Ziel.**
  - «Schuldenplan» (in Empfehlungen, auf der Startseite und im Tipp zur Kreditkarte) führte zu «Konten» oder auf dieselbe Seite – dort gibt es keinen Schuldenplan mehr. Jetzt springt er direkt zum Schuldenplan im Berater.
  - Der Tipp zur offenen Kreditkarte heisst neu «Abzahlen planen» und öffnet «Mein Plan».
  - «Krankenkasse jetzt vergleichen» hat neu den Knopf «Franchise-Rechner».
- «Mein Plan» rechnet mit dem Zins, der bei der Kreditkarte hinterlegt ist (sonst 12 %), damit Berater und Plan dasselbe zeigen.

## 1.56.0
- **Neu: «Mein Plan»** (Menü › Geld planen, ganz oben): dein Weg zu schneller Stabilität in sechs Schritten – ohne auf Spass zu verzichten.
  1. **Kreditkarte stoppen:** offener Betrag, Zins pro Monat (12 %), Abzahlbetrag wählen mit «schuldenfrei im …» und Zinskosten, auf Wunsch auch ins Budget. Warnung, wenn die Karte höher ist als das Privatkonto.
  2. **Lohntag-Plan:** Am Lohntag zeigt die Startseite, wie du den Lohn verteilst – Kreditkarte, Notgroschen, Steuern, Säule 3a, Gönn-Topf – und was frei zum Leben bleibt. Zum Abhaken; mit einem Tipp als Daueraufträge anlegen. Mitteilung am Lohntag.
  3. **Notgroschen:** Ziel = 3 Monatsausgaben aus deinen echten Zahlen, mit Fortschritt und Monatsbetrag.
  4. **Steuern:** Schätzung aus deinen bisherigen Steuerzahlungen (oder eigener Betrag), nötige Rückstellung pro Monat im Vergleich zum Budget.
  5. **Schweizer Fristen:** Krankenkasse 30. November (mit Franchise-Rechner 300 / 2500 aus deinen Gesundheitskosten), Säule 3a bis 31. Dezember (eingezahlt und Rest), Prämienverbilligung Aargau bis 31. Dezember, Steuererklärung. Mitteilungen 14 und 2 Tage vorher. **Steuer-Abzüge** (3a, Arbeitsweg, Weiterbildung, Spenden, Krankheitskosten) pro Jahr gesammelt und als Datei zum Drucken oder als PDF.
  6. **Belohnung & Fortschritt:** Meilensteine (Kreditkarte schuldenfrei, Notgroschen voll, 3a voll, Steuern zurückgelegt) erhöhen auf Wunsch den Gönn-Topf. Dazu die Kurve deines Nettovermögens.
- **Erlebnisse planen** (Gönnen): Datum setzen, Countdown und wie viel du pro Monat zurücklegen musst.
- Fristen, die bald ablaufen, erscheinen auch bei den Tipps im Berater und kurz auf der Startseite.
- Alles wird nur auf dem Gerät berechnet. Die App bucht nichts selbst und ändert das Budget nur, wenn du es antippst.

## 1.55.0
- **Tipps aus deinen Zahlen** (Berater › Übersicht, kurz auch unter Analyse › Bericht): Die App wertet deinen letzten Lohnmonat aus und zeigt nur, was zutrifft – jeweils mit Knopf zum Handeln:
  - grösster Ausgabenblock (z. B. «Finanzausgaben: 50 % deiner Ausgaben») → Posten ansehen
  - Kategorien deutlich über deinem Schnitt der Monate davor → Posten ansehen
  - Buchungen ohne Kategorie → Jetzt zuordnen
  - offene Kreditkarte, besonders wenn sie wächst → Schuldenplan
  - zwei Lohneingänge im selben Monat → nicht als dauerhaft einplanen, Lohntag prüfen
  - tiefste Ausgaben seit Monaten → bewusst etwas gönnen
  «Erledigt» blendet einen Tipp für diesen Monat aus. Alles wird nur auf dem Gerät berechnet.
- **Glocke und Mitteilungen:** Kein «Budget überschritten» mehr für Kategorien, die du als «eingehalten» markiert hast.
- **Namen wie in Wallet:** «Essen & Getränke» heisst jetzt «Essen & Trinken».

## 1.54.0
- **Analyse wie Wallet – alle Funktionen:**
  - **Zeitraum wählen:** Benutzerdefiniert (Von–Bis) · Wochen · Monate (ab Lohntag, mit Monatsauswahl pro Jahr) · Jahre. Mit ‹ › blättern.
  - **Filter** (am PC links, auf dem Handy über «Filter»): Mein Filter (speichern und wieder laden), Suchen, Konten, Kategorien, Etiketten, Währungen, Eintragsarten (Ausgabe, Einnahme, Überweisung), Betragsbereich, Überweisungen einbeziehen oder ausschliessen, Buchungsstatus (abgerechnet, vorgemerkt), Zahlungsarten. «Filter zurücksetzen» stellt alles zurück.
  - **Einnahmen & Ausgaben:** ⚙ stellt die Anzahl Zeiträume (3–12), Prozent und «alle Unterkategorien aufklappen» ein. 🔍 oder ein Betrag zeigt die Buchungen dazu.
  - **Cashflow:** Vergleich mit Vormonat und Vorjahr wahlweise für Cashflow, Ausgaben oder Einnahmen.
  - **Erweiterte Diagramme:** Typ (Kontostand, Ausgaben, Einnahmen, Cashflow), Diagrammart (Linie, Balken, Fläche, Kreis), Gruppieren nach (Hauptkategorie, Kategorie, Konto, Etikett, Zahlungsart), Granularität (Tag, Woche, Monat, Jahr). Unter «Meine Diagramme» speichern.
  - **Investitionen:** Vorsorge- und Anlagekonten (z. B. Säule 3a) mit Wert, Einzahlungen und Wertentwicklung der letzten 12 Monate.
- Der Wallet-Abgleich übernimmt neu Zahlungsart, Buchungsstatus und Etiketten der Buchungen. Für ältere Buchungen leitet die App die Zahlungsart vom Konto ab.

## 1.53.0
- **Analyse › Bericht – wie bei Wallet:** Neuer erster Reiter in der Analyse mit drei Ansichten:
  - **Einnahmen & Ausgaben:** 6 Monate nebeneinander, pro Hauptkategorie (Essen, Einkaufen, Wohnen, Finanzausgaben …) mit Veränderung in % zum Vormonat – grün heisst besser. Zeile antippen zeigt die Unterkategorien. Dazu der Geldfluss pro Monat und ob die Ausgaben so tief sind wie lange nicht.
  - **Kontostand:** Verlauf der Konten in der Statistik und neu **«Warum der Kontostand sinkt/steigt»**: Stand am Anfang + Einnahmen − Ausgaben ± Überträge auf Konten ausserhalb der Statistik (z. B. Sparkonto) = Stand heute. Darunter alle Konten mit Veränderung, ausgeschlossene grau markiert.
  - **Geldfluss:** Einnahmen und Ausgaben pro Tag, Summe mit Vergleich zum Vormonat und aufsummierter Verlauf gegenüber Vormonat und Vorjahr.
- **Monat ab Lohntag:** Die Analyse rechnet vom Lohntag bis zum Tag davor (z. B. 26.–25. wie in Wallet), damit jeder Lohn in seinem eigenen Monat steht. Der Lohntag wird erkannt und lässt sich ändern. Das Budget bleibt in Kalendermonaten.
- Gezählt werden wie bei Wallet nur Konten, die in der Statistik zählen; Überträge sind weder Einnahme noch Ausgabe.

## 1.52.0
- **Aufgeräumtes Menü:** Statt rund 29 Einträgen gibt es noch 15. Verwandte Seiten sind zu Bereichen mit Reitern oben zusammengelegt:
  - **Budget:** Übersicht · Planen
  - **Kommende Zahlungen:** Alle · Geplant & Lohn · Abos · Jahreskosten · Rechnungen
  - **Gönnen:** Gönn-Topf · Kaufliste · Erlebnisse & Wünsche
  - **Analyse:** Rückblick · Ausgaben · Ausblick & Was wäre wenn
  - **Berater:** Übersicht · Empfehlungen · Frag die App · Ampel-Regeln
  - **Kategorien & Regeln:** Ordnen · Zuordnen · Regeln
  Jeder Bereich öffnet den Reiter, den du zuletzt benutzt hast. Unten auf dem Handy: Start · Buchungen · Budget · Gönnen · Menü.
- **Nichts mehr doppelt:** Spartipps und «Prognose 12 Monate» stehen nicht mehr zusätzlich bei «Frag die App», «So solltest du dein Einkommen verteilen» nicht mehr neben dem Ziel 50 · 30 · 20, «Sicher kommende Abgaben» und die Rückstellung nicht mehr im Budget (jetzt unter Kommende Zahlungen). «Cockpit & Stufen» und «Monatsabschluss» sind im Berater und in «Budget eingehalten?» aufgegangen.
- **Gönn-Topf:** Ein fester Betrag pro Monat nur für dich – ohne schlechtes Gewissen. Was du nicht brauchst, wird mitgenommen. Der Berater schlägt nie vor, ihn zu kürzen. Einrichten unter Gönnen; das Geld kommt aus noch nicht verteiltem Geld, aus dem Puffer oder du kürzt selbst bei Brauch.
- **Was liegt drin?** Die Seite Gönnen zeigt deine Wünsche – Erlebnisse mit Menschen zuerst – und ob sie aus dem Gönn-Topf drinliegen oder in wie vielen Monaten.
- **Monatsrückblick mit dem Positiven:** Was du dir gegönnt hast, was du gespart hast, wie viele Budgets eingehalten wurden und wie nahe Reserve und Ziele sind. In den ersten 10 Tagen eines Monats auf der Startseite (ausblendbar) und immer unter Gönnen.
- **Doppeltes im Budget** (unter Budget › Planen): Die App zeigt, wenn Abos doppelt vom Konto abgezogen werden, wenn Puffer und Reserve dasselbe abdecken, und wie sich Freizeit, Restaurant und Unter Leuten abgrenzen. Ändern nur auf deinen Tipp.

## 1.51.0
- **Budget bleibt wie geplant:** Ab November 2026 ändern effektive Kosten das Budget nicht mehr.
  - Im Budget steht das geplante Einkommen, nicht der erhaltene Lohn. Was effektiv eingegangen ist, steht klein darunter.
  - Jahreskosten und Rückstellung sind pro Monat festgehalten. Kommen neue Jahreskosten dazu (auch automatisch erkannte), zeigt die App einen Hinweis. Ins Budget kommen sie erst, wenn du «Ab … übernehmen» antippst.
  - Kein «Effektiv weicht ab – Betrag prüfen» mehr und kein Vorschlag des Finanz-Beraters, das Budget an die Ausgaben anzupassen.
  - Von Hand ändern geht weiterhin.
- **Budget eingehalten?** Bei jeder Kategorie steht für vergangene Monate und den laufenden Monat, ob das Budget eingehalten ist – automatisch nach Betrag (bei Sparen: genug gespart). Antippen, um selbst zu entscheiden: Eingehalten, Nicht eingehalten oder wieder automatisch.
- Neue Karte «Budget eingehalten?» im Monat mit «x von y Kategorien» und den nicht eingehaltenen. In der Jahresübersicht eine Zeile pro Monat, nicht eingehaltene Beträge sind rot.

## 1.50.0
- **Kategorien sauber eingeordnet:** Neue Regeln nach Bedeutung des Namens – auch für englische Namen, wie Wallet sie liefert. Steuern, Krankenkasse, Versicherungen, Miete, Energie, Telefon und Gebühren sind **Muss**; Lebensmittel, Gesundheit, Kleidung, Mobilität sind **Brauch**; Restaurant, Freizeit, Ferien, Shopping sind **Will**; Sparen und Anlagen sind **Sparen**.
- **Unterkategorien erben:** Eine Unterkategorie ohne eigene Regel übernimmt die Einordnung ihrer Kategorie, diese die ihrer Hauptkategorie – z. B. Steuern › Gemeindesteuer, Staatssteuer, Bundessteuer, Kirchensteuer → alle Muss.
- **Einmal nach dem Update** zeigt die App alle falsch eingeordneten Kategorien zum Anhaken (vorher → nachher). Wallet-Kategorien sind vorgewählt, deine eigenen Budget-Kategorien nur, wenn sie Muss sein sollten.
- **Neue Seite «Kategorien ordnen»** (Menü → Import & Ordnung): Baum Hauptkategorie › Kategorie › Unterkategorie mit Gruppe und Muss · Brauch · Will zum Antippen, dazu «Automatisch einordnen». Was du von Hand setzt, wird nie automatisch geändert.
- Neue Kategorien aus Wallet werden gleich richtig eingeordnet.
- Korrektur: Seit 1.46 konnten Wallet-Unterkategorien fälschlich als «Persönliche Wünsche» gelten und ihre Zuordnung zur übergeordneten Kategorie verlieren. Behoben – die Zuordnung wird beim nächsten Abgleich wieder aus Wallet geholt.

## 1.49.0
- **Abos automatisch erkennen:** Auf der Seite «Abos» zeigt die App, wie viele Vorschläge sie in deinen Buchungen gefunden hat. Ein Tipp auf «Automatisch erkennen» öffnet die Liste zum Anhaken:
  - **Neue Abos** – regelmässig gleicher Betrag beim gleichen Anbieter (z. B. Spotify, Netflix, Handy-Abo). Bekannte Anbieter sind vorgewählt, andere zum Prüfen.
  - **Preis geändert** – die letzten Zahlungen weichen vom erfassten Preis ab; ein Haken übernimmt den neuen Preis.
  - **Nicht mehr gebucht – gekündigt?** – schon länger keine Zahlung mehr; ein Haken markiert das Abo als nicht mehr aktiv.
- **Weitere automatische Erkennung:**
  - **Jahreskosten** (z. B. Motorfahrzeugsteuer, Gebühren, die einmal im Jahr kommen) – auch auf der Seite «Jahreskosten». Übernommen wird mit monatlichem Zurücklegen.
  - **Lohn und regelmässige Einnahmen** – auf der Seite «Geplante Zahlungen». Übernommen als geplante Einnahme für Ausblick und «Bis zum Lohn».
- Was du nicht anhakst, wird nicht nochmals vorgeschlagen. Alles wird auf dem Gerät berechnet.
- Menü: «Abos» und «Jahreskosten» stehen neu unter «Geld planen».

## 1.48.1
- **Kein Löschen mehr auf dem Sperrbildschirm:** «Alles löschen und neu beginnen» ist dort weg, damit nichts versehentlich verloren geht.
- **Löschen nur noch in den Einstellungen** (Daten & Sicherheit → «Alle Daten löschen»): Gelöscht wird erst, wenn du zur Bestätigung das Wort **LÖSCHEN** eintippst. Vorher lässt sich direkt eine Sicherung speichern.

## 1.48.0
- **Neuer Reiter «Kaufen»:** Deine Kaufliste an einem Ort. Oben Artikel und ungefähren Preis eintippen – fertig. Die App ordnet jeden Artikel ein: **Jetzt kaufbar**, **Bedenkzeit läuft**, **Bald leistbar** (mit Monat und wie viel du pro Monat zur Seite legen müsstest) oder **Noch nicht absehbar** (mit Grund, z. B. erst Schulden abbauen). Leistbar heisst: ohne Schulden, Reserve und Puffer anzutasten.
- **Regelmässige Prüfung und Mitteilung:** Die App prüft die Kaufliste beim Öffnen, beim Zurückkehren, alle 30 Minuten und nach jeder Änderung. Wird etwas leistbar, kommt ein Hinweis und eine Mitteilung aufs Handy. Für erwartete Daten (z. B. «ab März leistbar», Ende der Bedenkzeit) plant die App die Mitteilung schon im Voraus. Eine Zahl am Reiter zeigt, wie viel gerade drinliegt.
- **Preis vergleichen:** Knopf bei jedem Artikel öffnet toppreise.ch mit dem Artikelnamen. Nur auf Knopfdruck – sonst geht nichts ins Internet.
- **Neues Design:** ruhiges Dunkelblau statt Grün, im Dunkelmodus passend. Grössere Knöpfe und Eingabefelder, die sich leichter treffen lassen.
- **Unterleiste auf dem Handy:** Start · Buchungen · Budget · Kaufen · Menü. Das Menü öffnet die ganze Liste.
- **Weniger Text:** Lange Erklärungen sind auf zwei Zeilen gekürzt – antippen zeigt alles. Bei den Buchungen liegen Suche, Konto und Von–Bis hinter «Suchen & Filter», damit die Liste sofort sichtbar ist. «Plan bearbeiten» ist auf dem Handy ruhiger.
- **Neues App-Symbol:** «Fr.» für Schweizer Franken auf Dunkelblau.

## 1.47.0
- **50 · 30 · 20 in jedem Monat:** Die fünf Gruppen bleiben. Zusätzlich zeigt die App den Anteil vom Einkommen für **Bedarf** (Grundbedürfnisse + Fixkosten), **Wünsche** (Persönliche Wünsche + Freizeit) und **Sparen** (Sparen & Vorsorge).
- **Plan bearbeiten (Monat):** Karte «Ziel» mit Balken pro Bereich, Strich beim Ziel, geplant und effektiv in % und CHF, dazu die Abweichung vom Ziel. Grün = im Ziel, orange = knapp daneben, rot = deutlich daneben.
- **Jahresübersicht:** Unter «Differenz» drei Zeilen mit den % für jeden Monat (geplant, bei vergangenen Monaten auch effektiv) und fürs ganze Jahr.
- **Ziel pro Jahr:** Standard 50 · 30 · 20. Für **2027 als Ausnahme 50 · 20 · 30** (30 % Sparen). Ändern mit «Ziel ändern …» – nur für ein Jahr oder für alle Jahre ohne eigene Ausnahme.

## 1.46.0
- **Budget nach deinen Gruppen:** «Plan bearbeiten» und die Jahresübersicht sind jetzt gegliedert in **Grundbedürfnisse · Fixkosten · Sparen & Vorsorge · Persönliche Wünsche · Freizeit**. Jede Gruppe ist aufklappbar, mit Summe und Anteil vom Einkommen. Schuldenabbau (Raten, Kreditkarte) zählt zu den Fixkosten.
- **So verteilt sich dein Einkommen:** Einkommen minus jede Gruppe = noch nicht verteilt bzw. zu viel verplant. In der Jahresübersicht: Einkommen, Differenz, Ausgaben total und darunter die fünf Gruppen.
- **Persönliche Wünsche** ist eine neue Gruppe (z. B. Anschaffungen, Shopping, Geschenke). Kategorien mit passendem Namen wurden einmal automatisch dorthin verschoben. Ändern: bei einer Kategorie «Ändern …» → «Kategorie umbenennen / Gruppe ändern».
- **Alle Gruppen haben wieder ein Budget**, auch Persönliche Wünsche und Freizeit. Die in 1.45.1 zur Seite gelegten Beträge sind wieder da.
- **Muss · Brauch · Will bleibt als Markierung** bei jeder Kategorie: Muss ist fix, muss im Budget stehen und wird nur bewusst geändert (in der Jahresübersicht grau). Brauch und Will passt du direkt an.

## 1.45.1
- **Muss · Brauch · Will direkt im Budget zuweisen:** In «Plan bearbeiten» hat jede Kategorie die Auswahl Muss · Brauch · Will. Ein Tipp verschiebt sie in den passenden Bereich.
- **Muss steht sicher im Budget:** Hat eine Muss-Kategorie im ganzen Jahr keinen Betrag, wird sie rot markiert. Die App schlägt den Betrag aus der regelmässigen Zahlung oder dem Schnitt der letzten Monate vor – einzeln oder alle mit einem Tipp übernehmen. Muss bleibt fix und wird nur bewusst geändert.
- **Brauch je nach Situation:** Betrag direkt anpassen wie bisher.
- **Will ohne Budget:** Will-Kategorien haben kein Budget mehr. Die App zeigt, was nach Muss, Sparen und Brauch für Will frei bleibt und was du davon schon ausgegeben hast. Bisherige Will-Beträge ab diesem Monat werden zur Seite gelegt – stellst du eine Kategorie zurück auf Brauch oder Muss, sind sie wieder da.
- Jahresübersicht: «Frei für Will» pro Monat, Will mit den effektiven Ausgaben.

## 1.45.0
- **Budget neu nach Muss · Sparen · Brauch · Will gegliedert:** «Plan bearbeiten» zeigt jetzt, wie sich dein Einkommen verteilt: Einkommen − Muss (fix) − Sparen = frei für Brauch & Will, davon geplant und was noch nicht verteilt ist – mit Anteil vom Einkommen. Darunter die vier Bereiche, jeweils aufklappbar und nach Betrag sortiert.
- **Muss-Beträge sind fix:** Miete, Versicherungen, Steuern, Abos mit Vertrag, Schulden und die Rückstellung haben kein Eingabefeld mehr. Ändern geht nur bewusst über «Betrag ändern …» mit Rückfrage (z. B. neue Miete). Pro Posten steht, ob er regelmässig gebucht wird, und ein Hinweis, wenn der effektive Betrag deutlich abweicht.
- **Muss wird nicht gesteuert:** Keine Tagesbudgets, Warnungen «überschritten» oder «zu schnell aufgebraucht», Wochengrenzen oder Spartipps mehr für Muss-Kategorien. Gesteuert werden nur Brauch und Will.
- **Jahresübersicht** mit der gleichen Gliederung: Einkommen, davon fix (Muss & Sparen), frei für Brauch & Will, noch nicht verteilt, dann die vier Bereiche.
- Welche Kategorie Muss, Brauch oder Will ist, legst du unter «Muss · Brauch · Will» fest.

## 1.44.2
- **Geräte-Abgleich ohne Verluste:** Bisher gewann beim Abgleich zwischen Handy und PC jeweils das Gerät, das zuletzt gespeichert hatte. Weil das Handy laufend speichert (z. B. neue Kontostände), gingen Änderungen vom PC an Budget, geplanten Zahlungen, Kategorien oder Buchungen manchmal verloren. Jetzt merkt sich jedes Gerät den zuletzt gemeinsamen Stand und vergleicht Feld für Feld: Was nur auf einem Gerät geändert wurde, bleibt erhalten. Nur wenn beide Geräte dasselbe Feld geändert haben, gilt die neuere Änderung.
- Bitte nach dem Update auf beiden Geräten die App einmal öffnen, damit der gemeinsame Stand angelegt wird.

## 1.44.1
- **Geplante Zahlungen ohne Doppeltes aus dem Budget:** Wiederkehrende Kosten, deren Kategorie schon ein Budget hat (z. B. Miete, Krankenkasse), erscheinen nicht mehr als geplante oder bevorstehende Zahlung – sie zählen bereits über das Budget. In der Kategorie-Übersicht stehen sie weiterhin, mit dem Hinweis «im Budget enthalten». Selbst erfasste geplante Zahlungen bleiben unverändert.

## 1.44.0
- **Geplante Zahlungen nur aus echten Wiederholungen:** Bevorstehende und geplante Zahlungen enthalten keine Schätzungen aus dem Budget mehr. Neben deinen eigenen geplanten Zahlungen (auch aus Wallet), Rechnungen und Vormerkungen erscheinen nur Kosten, die in deinen Buchungen der letzten 15 Monate regelmässig vorkamen – monatlich, vierteljährlich, halbjährlich oder jährlich, mit ähnlichem Betrag. Sie lassen sich mit einem Tipp als geplante Zahlung übernehmen (mit dem richtigen Rhythmus). Gilt auch für «Sicher kommende Abgaben».
- **Kategorie-Übersicht:** Ein Tipp auf «Übersicht ›» bei einer Kategorie (Budget, Plan bearbeiten, geplante Zahlungen) zeigt alles an einem Ort: Budget und effektiv für diesen Monat und das Jahr, Verlauf der letzten 12 Monate, geplante und wiederkehrende Zahlungen, Jahreskosten, wo du dafür bezahlst und die letzten Buchungen. Dazu, welche Wallet-Kategorien in dieses Budget zählen.
- **Mehr Verknüpfungen:** Jede geplante Zahlung zeigt, wann sie zuletzt gebucht wurde, und führt zur Kategorie. Im Bearbeiten-Fenster stehen die passenden Buchungen. Eine Buchung zeigt ihre Kategorie mit dem Budgetstand des Monats und ob sie zu einer geplanten Zahlung gehört oder regelmässig wiederkommt.
- **Beträge ausblenden:** Unter Einstellungen → Daten & Sicherheit oder schnell mit dem Auge oben rechts. Alle Frankenbeträge werden verdeckt, Prozente, Kategorien und Daten bleiben sichtbar – zum Besprechen mit anderen. Gilt nur auf diesem Gerät.

## 1.43.0
- **Alle Kategorien auf Deutsch:** Wallet liefert manche Namen englisch (z. B. «Groceries», «Shopping», «Phone, cell phone»). Sie werden jetzt schon beim Empfang übersetzt, auch die Hauptkategorien und die Kategorie in jeder Buchung. Die Zuordnung zu deinem Budget bleibt dabei erhalten. Kategorien, die du selbst umbenannt hast, bleiben unverändert.
- **Automatische Zuordnung:** Für jede Buchung ohne Kategorie sucht die App die beste Kategorie. Sie prüft deine früheren Buchungen beim gleichen Händler (neuere und ähnliche Beträge zählen mehr), deine Regeln, bekannte Schweizer Händler und Dienste (z. B. Migros, SBB, Galaxus, Shell, Swisscom, Krankenkassen) und ähnliche Buchungstexte aus allen alten Einträgen. Sichere Treffer setzt sie selbst und meldet, wie viele es waren. Unsichere erscheinen als Vorschlag mit Begründung.
- **Alte Einträge prüfen:** Buchungen der letzten zwei Jahre, die vom üblichen Muster beim gleichen Händler abweichen, werden zum Prüfen angezeigt – einzeln oder alle mit einem Tipp ändern oder so lassen.
- Was du von Hand zuordnest, wird nie automatisch überschrieben. Die letzte automatische Zuordnung lässt sich rückgängig machen. Ein- und ausschalten unter «Kategorien zuordnen».
- Zuordnungen an Buchungen aus Wallet werden auch in Wallet nachgeführt.
- Alles läuft auf dem Gerät – Händlernamen gehen nicht ins Internet.

## 1.42.0
- **Budgetplanung neu gegliedert:** Einkommen – Differenz – Ausgaben total, jeder Bereich auf- und zuklappbar (auch jede Gruppe). Die Wahl bleibt pro Gerät gespeichert.
- **Nebeneinkommen:** Unter Einkommen mit «+ Nebeneinkommen» eigene Zeilen anlegen (z. B. Nebenjob, Vermietung, Zulagen) – für einen Monat, ab einem Monat oder fürs ganze Jahr. Sie zählen in Differenz, Ausblick und Prognose mit. Der Lohn steht als eigene Zeile darüber.
- **Differenz zwischen Einkommen und Ausgaben:** zeigt, was übrig bleibt oder zu viel verplant ist, dazu den Anteil fürs Sparen und den Schuldenabbau. In der Jahresübersicht als eigene Zeile zwischen Einkommen und Ausgaben.
- **Rückstellung Jahreskosten gleichmässig:** Jede Jahresrechnung wird mit 1/12 pro Monat zurückgelegt. Übersicht mit Betrag pro Jahr und pro Monat, Stand des Rückstellungskontos und Warnung, falls bei einer Fälligkeit Geld fehlt. Wahlweise «Bis zur ersten Fälligkeit ansparen». Häufige Posten (Steuern, Haftpflicht & Hausrat, Motorfahrzeugsteuer …) mit einem Tipp hinzufügen.
- **Jahresbudget:** Einkommen, Gruppen, Ausgaben total und Differenz fürs ganze Jahr, mit Schnitt pro Monat.
- **Sicher kommende Abgaben:** Alle bekannten Zahlungen der nächsten 12 Monate nach Monat – Rechnungen, geplante Zahlungen, Jahreskosten und feste Kosten aus dem Budget, genau oder geschätzt gekennzeichnet.
- «Swisscom» heisst jetzt «Internet und TV».

## 1.41.0
- **Überträge planen:** Unter «Geplante Zahlungen» gibt es neu drei Arten: Ausgabe · Einnahme · **Übertrag** (von Konto → auf Konto), z. B. monatlich CHF 600 aufs Sparkonto oder die Begleichung der Kreditkarte. Überträge zählen nicht als Ausgabe, erscheinen neutral (⇄) und verschieben im Kontotrend das Geld zwischen den Konten. Auch in Wallet geplante Überträge werden so angezeigt.
- **Bestätigtes erscheint nie doppelt:** Ist eine geplante Zahlung schon gebucht (Bank, Wallet oder von Hand – gleicher Betrag ±10 %, ±7 Tage, gleiche Richtung), verschwindet sie bei den bevorstehenden Zahlungen, im Kalender und in der Prognose.
- **Kontotrend genauer:** Der tägliche Konsum wird nach deinem bisherigen Zahlverhalten auf die Konten verteilt (z. B. was du meist mit der Kreditkarte zahlst, belastet die Karte). Feste Kosten bleiben beim Konto, von dem sie abgehen.

## 1.40.0
- **Prognose korrigiert – sie war zu pessimistisch.** Drei Fehler zogen die Kurve nach unten:
  - Feste Kosten wurden doppelt abgezogen: als geplante Zahlung aus Wallet (z. B. Miete) und nochmals als Schätzung aus dem Budget. Jetzt ersetzt die geplante Zahlung die Schätzung.
  - Konsum mit der Kreditkarte wurde gezählt und die Begleichung der Karte vom Konto nochmals; Überträge aufs Sparkonto zählten als Ausgabe.
  - Der Lohn wurde nicht mehr geschätzt, sobald irgendeine kleine Einnahme geplant war.
- **Netto über alle Konten:** Der Ausblick zeigt jetzt Guthaben minus Schulden über alle Konten, die in die Statistik zählen. Überträge zwischen deinen Konten (Sparen, Kreditkarte begleichen, Säule 3a) sind neutral.
- **Einkommen aus deiner Budgetplanung:** Pro Monat zählt das geplante Einkommen aus dem Budget (z. B. aus Excel, inkl. 13. Monatslohn). Ohne Budget der Schnitt der letzten Monate. Schon erhaltener Lohn wird abgezogen.
- Geplante Zahlungen aus Wallet werden mit Art (Ausgabe, Einnahme, Übertrag) und Kategorie übernommen.

## 1.39.2
- **Realistischere Schätzung:** Der tägliche Konsum kommt nur noch aus deinem echten Kaufverhalten. Geplante Kosten (Rechnungen, Daueraufträge, feste Kosten, Jahreskosten) sind schon separat drin und werden nicht nochmals geschätzt.
- **Kein Budget-Rest mehr als Ausgabe:** Was im Budget übrig ist (z. B. Puffer, Ferien, Unter Leuten), wird nicht mehr automatisch als Ausgabe angenommen.
- Wiederkehrende Zahlungen (gleicher Empfänger, ähnlicher Betrag, z. B. Abos) und grosse Einzelkäufe zählen nicht als täglicher Konsum. Ist eine wiederkehrende Zahlung nirgends als Dauerauftrag erfasst, rechnet der Ausblick sie als eigenen Posten am üblichen Tag.
- Das Niveau ist der typische Monat der letzten 12 Monate, an die letzten 3 Monate angepasst – einzelne teure Monate verzerren nicht mehr. Neu oben: «Täglicher Konsum» pro Tag im Schnitt.

## 1.39.1
- **Korrektur: täglicher Gebrauch in der Analyse.** Buchungen aus Wallet tragen Wallet-Kategorien, die über «Zählt ins Budget von» in deine Kategorien fliessen. Die tägliche Schätzung rechnet jetzt pro Budget-Kategorie (z. B. alle Wallet-Lebensmittel unter «Lebensmittel»), damit sie zum Budget passt und nichts doppelt zählt.
- Bei langer Wallet-Geschichte zählen jetzt die **letzten** 4 Jahre (vorher die ältesten).
- Auch Monate ohne Budget bekommen den täglichen Gebrauch in der Prognose.
- Die tägliche Schätzung steht neu auch im Reiter «Ausgaben» der Analyse.

## 1.39.0
- **Tägliche Schätzung aus deinem Verhalten** (Analyse → Ausblick): Für Lebensmittel, Restaurant, Kleidung, Freizeit und alle anderen veränderlichen Kategorien lernt die App aus allen bisherigen Buchungen, wie viel du pro Monat ausgibst (die letzten 6 Monate zählen mehr, einzelne grosse Käufe werden gedämpft), ob der Monat in früheren Jahren teurer war (z. B. Dezember) und an welchen Wochentagen du dafür Geld ausgibst.
- Daraus entsteht für **jeden Tag des Monats eine geschätzte Ausgabe** – mit den grössten Kategorien pro Tag, z. B. «Sa 28. Nov.: Lebensmittel 120 · Restaurant 24».
- Oben: bisher ausgegeben (und ob mehr oder weniger als geschätzt), geschätzt bis Monatsende mit Bandbreite, erwartet für den ganzen Monat im Vergleich zum Budget und Betrag pro Tag.
- Verlauf pro Tag: effektive Ausgaben als Balken, Schätzung gestrichelt – so siehst du, wie gut die Schätzung trifft. Dazu eine Übersicht nach Kategorie.
- **Genauere Prognose:** Der Ausblick verteilt Alltag & Freizeit nicht mehr gleichmässig, sondern nach deinem Verhalten. Kategorien ohne eigene Buchungen rechnen weiter mit dem Budget.

## 1.38.0
- **Excel-Budget ab jetzt:** Beim Einlesen ist «Ab jetzt» vorgewählt (z. B. November 2026 bis Dezember 2027). Mit einem Tipp wählst du auch «Nur Vergangenheit» oder «Ganze Datei».
- Zeilen, die im gewählten Zeitraum keine Beträge haben, legen keine neuen Kategorien mehr an.
- **Geplante Kontostände aus Excel:** Die Tabelle «Kontostand» (Privatkonto, Sparkonto, Kreditkarte, Haushaltkonto …) wird automatisch dem passenden Konto zugeordnet und übernommen. Zeilen mit vielen Fehlern (z. B. #REF!) werden ausgelassen.
- **Kontotrend in die Zukunft** (Analyse → Ausblick): pro Konto die letzten 6 Monate durchgezogen, die Zukunft gestrichelt. Die Zukunft startet beim echten heutigen Stand und folgt den geplanten Veränderungen aus Excel. Ohne Plan rechnet das Hauptkonto mit der Prognose (Rechnungen, Daueraufträge, Lohn, Budget).

## 1.37.0
- **Budget aus Excel mit Von–Bis:** Beim Einlesen wählst du jetzt auch, **bis** zu welchem Monat das Budget gilt (z. B. Juni 2025 bis Oktober 2026). Ab dem Monat danach bleibt deine neuere Planung unverändert.
- **Auch Blätter, die nicht im Januar beginnen** (z. B. 2025 ab Juni), werden erkannt.
- **Nur die Budgettabelle zählt:** Kontroll- und Kontostandtabellen weiter unten im Blatt (Regelprüfung, Differenz, Einzahlung, Zins …) werden übersprungen.
- **Zuordnung automatisch:** Excel-Zeilen werden selbst den Kategorien zugeordnet – über frühere Zuordnungen, bekannte Begriffe und ähnliche Namen. Was neu ist, wird als Kategorie in der passenden Gruppe angelegt (aus der Spalte «Übergeordnet»). Die Zuordnung siehst du vor dem Speichern und kannst sie ändern; die App merkt sie sich für das nächste Mal.

## 1.36.0
- **Ausblick in der Analyse: Zukunft gestrichelt.** Ein Verlauf zeigt, was bisher war (durchgezogen) und was kommt (gestrichelt) – wählbar für 30 Tage, 3 oder 12 Monate.
- **Die Prognose rechnet mit allem, was bekannt ist:** offene und angewiesene Rechnungen, Vormerkungen, Daueraufträge, geplante Zahlungen und Lohn. Fehlt der Lohn als Dauerauftrag, wird er aus den letzten Monaten geschätzt. Dazu feste Kosten und Jahreskosten aus dem Budget sowie der Rest des Budgets für Alltag & Freizeit, über die Tage verteilt.
- **Gescannte Rechnung ersetzt die Schätzung:** Passt eine Rechnung zu geplanten Kosten (gleiche Kategorie oder gleicher Name, gleicher Monat), rechnet die Prognose mit dem genauen Betrag und lässt die Schätzung weg. Du bekommst eine kurze Meldung mit der Differenz. Rechnungen in Alltag & Freizeit werden vom restlichen Budget abgezogen.
- Neu: «Genau bekannt» zeigt, wie viel Prozent der erwarteten Ausgaben feststehen. Dazu der tiefste erwartete Stand und eine Übersicht Monat für Monat.
- Jede Zeile zeigt, ob der Betrag genau ist oder geschätzt (gestrichelt, kursiv).
- **Kontostandtrend:** Reicht der gewählte Zeitraum in die Zukunft (z. B. ganzer Monat), wird der Rest gestrichelt als Prognose gezeigt.

## 1.35.0
- **Budget nach Monat · Quartal · Jahr:** Oben wählen, mit ‹ › blättern. Am PC startet die Ansicht mit dem ganzen Jahr, auf dem Handy mit dem Monat. Die Wahl bleibt pro Gerät gespeichert.
- **Vergangene Monate: budgetiert und effektiv.** Pro Kategorie siehst du, was budgetiert war, was wirklich ausgegeben wurde und wie viel du darunter oder darüber liegst. Im laufenden Monat steht, was noch übrig ist (pro Tag). Kommende Monate erscheinen nur gestrichelt als «geplant».
- **«Monate einzeln»:** Tabelle mit jedem Monat (oben effektiv, darunter budgetiert, kommende Monate gestrichelt) – ideal am PC fürs ganze Jahr.
- Monate ohne Buchungen (vor dem Start der App) zählen nicht mehr als «unter Budget».
- **Finanz-Berater: Aufgaben, die wirklich wirken.** Die Aufgaben stehen jetzt für die ganze Woche fest und werden an deinen echten Buchungen geprüft: Ausgabengrenze eingehalten, Übertrag auf die Kreditkarte oder aufs Sparkonto erfolgt, Säule 3a eingezahlt, Rechnung bezahlt. Verfehlte Aufgaben erscheinen rot.
- Neu: Aufgaben aus deinem Budget – wird eine Kategorie diesen Monat zu schnell aufgebraucht, bekommst du eine Wochengrenze, damit das Budget bis Monatsende reicht.
- Am Montag wird die letzte Woche ausgewertet («Letzte Woche: 2 von 3 geschafft»).
- Korrekturen: «Lohn erfassen» erscheint nicht mehr, wenn dein Lohn ohnehin jeden Monat eingeht. Abgehakte Aufgaben gehen beim Abgleich zwischen Handy und PC nicht mehr verloren.

## 1.34.2
- **Korrektur am PC:** Beim Eintippen eines Datums in Von–Bis wurde die Seite nach der ersten Ziffer neu aufgebaut, und das Feld verlor die Eingabe. Jetzt wird erst neu aufgebaut, wenn du das Feld verlässt. Auf dem Handy (Datumsauswahl) gilt der Zeitraum sofort.

## 1.34.1
- **Von–Bis zeigt immer den betrachteten Zeitraum:** Bei Buchungen und in der Analyse stehen die Datumsfelder immer da und passen sich an Woche · Monat · Jahr und ‹ › an. Ein Datum ändern = neuer Zeitraum, ohne weiteren Knopf.

## 1.34.0
- **Geplantes wird nur angedeutet, nie abgebucht.** Abgezogen wird nur, was wirklich abgerechnet ist: Abbuchungen von der Bank bzw. aus Wallet und eigene Buchungen bis heute.
- **Rechnungen:** «Bezahlt» bucht nichts mehr, die Rechnung gilt als «angewiesen» und wird gestrichelt angezeigt. Sobald die Abbuchung kommt (gleicher Betrag), steht sie auf «bezahlt» – ohne doppelte Buchung.
- **Fotografierte Belege und Buchungen mit Datum in der Zukunft** werden «vorgemerkt»: gestrichelt oben bei den Buchungen, nicht im Kontostand, nicht an Wallet. Kommt die echte Abbuchung, verschwindet die Vormerkung von selbst. Bei Barzahlung: Vormerkung antippen → «Jetzt buchen».
- **Bevorstehende Zahlungen** (Budget, Daueraufträge, Rechnungen, Jahreskosten) sind gestrichelt und die Beträge in Klammern.
- **Eigener Zeitraum ohne Knopf:** Von–Bis gilt automatisch, sobald beide Daten gewählt sind – kein «Übernehmen» mehr.

## 1.33.1
- **Budget aus Excel ab einem Monat:** Auf der Seite Budgets (und unter Daten & Sicherheit) «Excel-Datei wählen». Mehrere Jahresblätter (z. B. 2026 und 2027) in einem Schritt, gültig erst ab dem gewählten Monat (z. B. ab November 2026). Frühere Monate bleiben unverändert. Die Zuordnung Excel-Zeile → Kategorie siehst du vor dem Speichern.
- Eigener Zeitraum: ungültige Daten werden abgefangen; ganze Monate blättern um ganze Monate.

## 1.33.0
- **Eigener Zeitraum (Von–Bis) funktioniert jetzt:** Von und Bis wählen, dann «Übernehmen». Vorher wurde schon nach dem ersten Datum neu aufgebaut, sodass das Feld den Fokus verlor. Ein «Von» nach dem «Bis» wird automatisch getauscht.
- **Auch bei den Buchungen:** neben Woche · Monat · Jahr neu «Zeitraum» mit Von–Bis.
- Mit ‹ › blättert ein eigener Zeitraum um die gleiche Länge, ganze Monate um ganze Monate.
- Der gewählte Zeitraum bleibt gespeichert. Während ein Datumsfeld offen ist, wird die Seite nicht im Hintergrund neu aufgebaut.
- Sprache: «keine Sicherung» statt «kein Sicherung».

## 1.32.2
- **Korrektur «Maximum call stack size exceeded»:** Bei vielen Buchungen brach das Verschlüsseln grosser Datenmengen ab (beim Speichern, beim Scannen und bei der Monatssicherung). Jetzt werden auch sehr grosse Datenmengen stückweise verarbeitet.
- **Beim Scannen wird immer alles übertragen:** Das Handy schickt dem PC die Verbindung und zusätzlich alle Daten. Klappt der Geräte-Abgleich nicht (z. B. weil der Zugang abgelaufen ist), verbindet sich der PC trotzdem – keine Meldung «abgelaufen» mehr.

## 1.32.1
- **PC verbinden geht jetzt immer nur mit dem QR-Code – ohne Einrichtung und ohne Umweg über andere Einstellungen.** Ist auf dem Handy kein Geräte-Abgleich eingerichtet, schickt das Handy deine Daten beim Scannen direkt und verschlüsselt an den PC.
- Am PC kommen Buchungen danach direkt über Wallet. Änderungen, die nur in der App gespeichert sind (z. B. Budgets), bleiben in diesem Fall bis Mitternacht am PC.

## 1.32.0
- **PC verbinden nur noch per QR-Code – ohne Code abtippen, auch beim ersten Mal.** Am PC «Mit Handy anmelden» klicken. Den QR-Code mit der **gewöhnlichen Kamera** des Handys scannen und den Link antippen: Die Finanzen-App öffnet sich, ein Fingerabdruck – fertig. Das geht auch, wenn die App gesperrt ist (ein Fingerabdruck entsperrt und verbindet). Alternativ in der App: Einstellungen → «PC verbinden».
- **Prüfzeichen:** Der PC zeigt vier Zeichen, die gleichen stehen im Fingerabdruck-Fenster. So verbindest du sicher deinen eigenen PC.
- **Öffnen nur mit Fingerabdruck:** Die PIN wird nicht mehr angeboten. Nur wenn Android den Fingerabdruck-Schlüssel ungültig macht (z. B. weil ein neuer Finger im Handy eingerichtet wurde), erscheint die PIN als Notweg – sonst wären deine Daten verloren.
- **Monatliche Sicherung auf dem Handy:** Einmal pro Monat legt die App eine verschlüsselte Sicherung unter Dokumente › Finanzen ab (die letzten 24 Monate). Unter Daten & Sicherheit lässt sich jeder Monat wiederherstellen.
- Der Verbindungscode wird nirgends mehr als Text gezeigt oder abgefragt.

## 1.31.1
- **Neu im Menü unter Einstellungen: «PC verbinden».** Eigene Seite mit kurzer Anleitung und grossem Knopf «QR-Code am PC scannen».

## 1.31.0
- **Entscheidungen bleiben:** Was du einmal wählst – Reiter, Zeiträume, Filter, Ansichten, «Später» bei einer neuen Version –, bleibt gespeichert und wird beim Öffnen nicht neu gefragt. Gilt auf Handy und PC.
- **Stärkste sinnvolle Verschlüsselung auf dem Handy:** AES-256-GCM mit einem Schlüssel aus deiner PIN (600 000 Durchläufe statt 310 000) **plus** einem 256-Bit-Geräteschlüssel aus dem Sicherheitschip. Selbst wer die Datei vom Handy kopiert, kann sie anderswo nicht öffnen – auch nicht durch Ausprobieren aller PINs. Deine Daten werden beim nächsten Entsperren automatisch umgestellt.
- **Beim Öffnen sofort aktuell:** Die App gleicht beim Öffnen und beim Zurückkehren sofort mit Wallet ab und überträgt den Stand, damit der PC gleich die neuesten Zahlen hat.

## 1.30.0
- **Umgekehrt: Der PC zeigt den QR-Code, das Handy scannt ihn.** Am PC auf der Finanzen-Seite «Mit Handy anmelden» klicken. Auf dem Handy Einstellungen → Daten & Sicherheit → «PC anmelden (QR-Code scannen)», die Kamera auf den Bildschirm halten und bestätigen. Nach wenigen Sekunden ist der PC bis Mitternacht verbunden.
- Der Code wird auf dem Handy verschlüsselt, sodass nur genau dieser PC ihn öffnen kann. Die App fragt beim ersten Scannen nach der Kamera-Erlaubnis.
- Der bisherige Weg (Handy zeigt den Code, PC-Kamera liest ihn) bleibt als Alternative.
- **Nur noch deutsche Begriffe:** z. B. Abgleich statt Sync, Sicherung statt Backup, Zugangsschlüssel statt Token, Geldfluss statt Cashflow, Etiketten statt Labels, Finanz-Berater statt Coach, PC-Version statt Web-Version.

## 1.29.0
- **Web mit QR-Code anmelden:** Auf dem Handy Einstellungen → Daten & Sicherheit → Geräte-Sync → «Web anmelden (QR)». In der Web-Version «Mit Handy-QR anmelden» klicken und den Code vor die Kamera des PCs halten. Kein Code abtippen, keine PIN.
- Die Web-Version bleibt **bis Mitternacht verbunden** – auch nach Neuladen oder Sperren. Danach meldet sie sich selbst ab und löscht ihre Kopie der Daten im Browser.
- Der QR-Code geht nie übers Internet; die Daten bleiben Ende-zu-Ende verschlüsselt.

## 1.28.0
- **Web-Version auch ohne Handy:** Die Web-Version gleicht selbst mit Wallet ab – Konten, Stände, Buchungen, Kategorien. Eigene Buchungen trägt sie direkt in Wallet ein. Sind Handy und Web gleichzeitig offen, fragt nur eines Wallet ab, das andere bekommt alles über den Geräte-Sync. Keine Doppelten: jede Buchung trägt nur das Gerät ein, auf dem sie erfasst wurde.
- **Alle Kategorien wie in Wallet:** Hauptkategorien, Kategorien und deine eigenen Unterkategorien (z. B. Wohnen › Energie, Nebenkosten › Gas) – auch ohne Buchungen. Buchungen aus Wallet stehen in der gleichen Kategorie wie in Wallet. Neue Kategorien kommen automatisch.
- **Budget bleibt:** Jede Wallet-Kategorie zählt ins Budget der Kategorie, in der ihre Buchungen bisher lagen (änderbar: Kategorie antippen → «Zählt ins Budget von»).
- **Automatische Regeln aus Wallet** werden übernommen und nachgeführt (Stichwörter, Ausgabe/Einnahme, Kategorie oder Überweisung, Konto).
- **Ausgabe · Einnahme · Übertrag:** Neue Buchung wie in Wallet mit drei Arten. Übertrag von Konto auf Konto zählt nicht als Ausgabe und geht als Überweisung an Wallet.

## 1.27.0
- **Ruhigere Startseite:** Saldo oben, darunter alle Konten als übersichtliche Liste mit vollem Namen (statt bunter Kacheln), gruppiert nach Bedeutung. Konten, die nicht zählen, sind grau.
- **Weniger Karten:** Standardmässig nur Bevorstehende Zahlungen, Letzte Einträge, Ausgabenstruktur und Finanz-Coach. Weitere Karten unten über «Startseite anpassen» ein- oder ausschalten.
- **Menü neu geordnet:** oben das Tägliche (Startseite, Buchungen, Konten, Analyse, Kalender), dann «Geld planen», «Import & Ordnung». Selteneres liegt unter «Weitere» (eingeklappt).
- Kleinere Knöpfe, einheitliche Abstände und Schriftgrössen.

## 1.26.1
- **Korrektur: fehlende Konten.** Wallet liefert die Kontenliste seitenweise, die App las bisher nur die erste Seite. Konten auf weiteren Seiten – z. B. das Sparkonto – fehlten. Jetzt kommen alle Konten.

## 1.26.0
- **Du bestimmst, welche Konten zählen:** Auf der Seite «Konten» hat jedes Konto einen Schalter «zählt im Saldo». Deine Wahl bleibt – der Abgleich überschreibt sie nicht mehr.
- **Saldo** zählt alle Konten, die du eingeschaltet hast (auch Konten, die es nur in der App gibt).
- **Kein Konto mehr unter falschem Namen:** Konten heissen wie in Wallet (ausser du hast eines selbst umbenannt). War ein Konto falsch zugeordnet, sieht man es jetzt sofort.
- Einstellungen → Wallet-Verbindung zeigt die Zuordnung aller Konten und meldet fehlende – mit «Fehlende Konten neu anlegen».

## 1.25.0
- **Abgleich in Sekunden:** Solange die App offen ist, prüft sie alle 20 Sekunden die Kontostände. Ändert sich etwas, holt sie sofort die neuen Buchungen – Stände und Buchungen sind innert Sekunden gleich.
- Eigene Buchungen werden nach 1 Sekunde übertragen, die Stände danach sofort neu geholt.
- Die Statuszeile zeigt, vor wie vielen Sekunden zuletzt abgeglichen wurde.

## 1.24.0
- **Wallet nur noch in den Einstellungen:** Startseite, Konten, Plus-Menü, Hinweise und Meldungen erwähnen Wallet nicht mehr – die Verbindung arbeitet unsichtbar im Hintergrund.
- «Wallet-Verbindung» steht jetzt im Menü unter **Einstellungen**, zusammen mit den Einmal-Werkzeugen (Kategorien und Regeln übernehmen).
- Die Kachel «Konten wie in Wallet» entfällt – neue Konten kommen automatisch.

## 1.23.0
- **Nichts mehr bestätigen:** Der Wallet-Abgleich läuft still im Hintergrund – keine «OK»-Meldung nach jedem Abgleich, keine Abfrage für neue Konten mehr.
- **Sofort aktuell:** Nach dem Entsperren werden Wallet und Web direkt abgeglichen.
- **Konten nach Bedeutung gruppiert:** Zahlungskonten & Bargeld, Sparen & Haushalt, Karten, Fremdwährung, Vorsorge & Anlagen. Gruppe pro Konto änderbar (Konto antippen → Aussehen).
- Korrektur: Konten mit «PostFinance» im Namen wurden fälschlich als Kredit erkannt.

## 1.22.0
- **Jedes Wallet-Konto einzeln:** Wenn früher mehrere Wallet-Konten auf demselben App-Konto landeten (z. B. Bargeld CHF, EUR, USD) oder auf «nicht übernehmen» standen, bekommt jetzt jedes sein eigenes Konto in der richtigen Währung. Die Buchungen werden nachgeholt und richtig zugeordnet.
- **Geplante Zahlungen aus Wallet** erscheinen bei «Bevorstehende geplante Zahlungen», im Kalender und im Ausblick.
- Weniger Anfragen an Wallet pro Abgleich.

## 1.21.0
- **Kontostände genau wie in Wallet:** Bei jedem Abgleich (alle 3 Minuten) übernimmt die App die echten Stände aller Wallet-Konten – auch Kreditkarte, Fremdwährung (EUR, CAD, USD) und Säule 3a. Kein Nachrechnen, keine Differenz mehr.
- **Konten automatisch eröffnet:** Neue Wallet-Konten werden selbst angelegt – mit Name, Währung, Farbe und Kontoart. Reihenfolge, Farbe und «in Statistik» bleiben mit Wallet gleich.
- **Saldo oben** wie in Wallet und eine **Statuszeile**: «Synchron mit Wallet · vor 2 Min.» oder deutlich «Nicht synchron», wenn die Web-Version noch nicht mit dem Handy verbunden ist.
- Währungszeichen wie in Wallet (CA$, $), lange Beträge passen in die Kacheln.

## 1.20.0
- **Wallet automatisch in beide Richtungen:** Kein «Jetzt abgleichen» mehr nötig. Neue Wallet-Buchungen kommen alle 3 Minuten (und beim Öffnen) von selbst in die App.
- **Nur noch einmal erfassen:** Was du hier (oder in der Web-Version) erfasst, änderst oder löschst, trägt das Handy automatisch auch in Wallet ein – mit Konto, Kategorie und Notiz. Keine Doppelten beim Zurückholen.
- Gilt für Buchungen ab heute. Ausschalten unter Mehr → Wallet-Verbindung («App → Wallet»).

## 1.19.0
- **Geräte-Sync live:** Handy und Web sind innert Sekunden auf dem gleichen Stand. Änderungen werden nach 1 Sekunde hochgeladen, geöffnete Geräte holen sie innert 5 Sekunden – mit kurzer Meldung «Aktualisiert».
- Übertragen wird weiterhin nur die verschlüsselte Datei in deinem privaten GitHub-Repository.

## 1.18.0
- **Sperrbildschirm nur mit Fingerabdruck:** Beim Öffnen erscheint direkt die Fingerabdruck-Abfrage – kein PIN-Feld, keine Tastatur.
- Klappt der Fingerabdruck nicht oder brichst du ab, erscheint die PIN mit Zahlen-Tastatur. Auch über «Mit PIN entsperren» jederzeit möglich.
- Neue PINs bestehen nur aus Zahlen.

## 1.17.0
- **Verträge und Rechnungen hochladen** (Plus-Knopf → «Rechnung, Vertrag oder Beleg»): Foto **oder PDF**, z. B. direkt aus dem E-Mail.
- Die App erkennt selbst, ob es eine **einmalige Rechnung**, ein **Abo**, eine **wiederkehrende Zahlung** (Prämie, Miete, Nebenkosten) oder **Raten** sind – samt Rhythmus (monatlich, vierteljährlich, jährlich …), Betrag, Fälligkeit, Laufzeit und Kündigungsfrist. Sie sagt dir auch, warum (z. B. «CHF 49.90 pro Monat» im Text, schon 5× bezahlt).
- Ein Tipp genügt: Einmalige Rechnungen kommen zu den offenen Rechnungen, Abos und wiederkehrende Zahlungen werden zum Dauerauftrag. Gibt es den Dauerauftrag schon, wird nur der Betrag aktualisiert.
- Die Glocke erinnert dich 30 Tage vor Ablauf der Kündigungsfrist.
- QR-Rechnungen werden auch in PDFs exakt gelesen. Alles passiert auf dem Gerät.

## 1.16.0
- **Sofort sperren:** Wenn du die App verlässt (wegwischen, andere App öffnen, Bildschirm aus), sperrt sie sich sofort. Beim Zurückkommen entsperrst du mit dem Fingerabdruck. Alles ist bereits verschlüsselt gespeichert.
- Ausnahmen, damit nichts verloren geht: Foto aufnehmen, Datei auswählen, Teilen und die Fingerabdruck-Abfrage.
- Einstellbar unter Einstellungen → Daten & Sicherheit → «Sperren, wenn ich die App verlasse».

## 1.15.0
- **Finanz-Coach** (Menü → Finanz-Coach): rechnet aus deinen echten Zahlen, was dich finanziell am meisten weiterbringt – klar und direkt.
  - **Lage-Check:** Punktzahl 0–100 aus 5 Säulen: Monat im Plus, Notgroschen, Schulden, Sparquote, Säule 3a.
  - **Dein Weg:** Stufenplan von «jeden Monat im Plus» über Notgroschen und Schuldenabbau bis zu Säule 3a und grossen Zielen. Der aktuelle Schritt ist markiert.
  - **Wochenaufgaben:** jede Woche bis zu 4 konkrete Aufgaben (z. B. Ausgabengrenze für eine Kategorie, Extra-Zahlung auf die Kreditkarte) zum Abhaken, mit Fortschritt und Serie.
  - **Schuldenplan:** höchster Zins zuerst, mit Datum «schuldenfrei» und Zinsen bis dahin. Zeigt, was jede zusätzliche CHF 100 bringt.
  - **Sparpotenzial:** wo du konkret sparen kannst und wie sich die Sparquote verändert. «Automatisch sparen» als Dauerauftrag mit einem Tipp.
  - **Säule 3a:** Einzahlungen dieses Jahr, Rest bis zum Maximum (CHF 7'258), geschätzte Steuerersparnis und Erinnerung am 15.12.
  - **Grosse Ziele:** zeigt, ob ein Ziel realistisch ist, wie viel pro Monat nötig ist und wann es erreichbar wäre.
- Spartipps schlagen keine Kürzungen bei Gesundheit, Versicherungen, Steuern oder Miete mehr vor.

## 1.14.0
- **Finanz-Assistent** (Menü → Finanz-Assistent): rechnet direkt auf dem Handy, ohne KI-Dienst im Internet.
  - **Prognose Monatsende:** Was du bis Ende Monat voraussichtlich ausgibst, was übrig bleibt und welche Budgets kippen.
  - **Prognose 12 Monate:** Erwarteter Kontostand mit Bandbreite «Vorsichtig» bis «Gut», inkl. Saison (Steuern, Ferien).
  - **Kaufverhalten:** teuerster Wochentag, Wochenende, Kleinbeträge, Monatsanfang vs. Ende, Muss · Brauch · Will, wo du am meisten kaufst, was gestiegen oder gesunken ist, Preiserhöhungen bei wiederkehrenden Zahlungen.
  - **Spartipps** aus deinen eigenen Zahlen.
  - **KI-Zuordnung:** Schlägt für Buchungen ohne Kategorie die passende vor – gelernt aus deinen bisherigen Buchungen.
  - **Frag die App:** z. B. «Wie viel habe ich im Oktober für Restaurant ausgegeben?» oder «Wie viel bleibt bis Monatsende?».
  - Kurzer Blick auf der Startseite.
- **Labels:** Buchungen mit eigenen Labels versehen (z. B. ferien-2026, geschenk) und unter Menü → Labels zusammen anschauen.
- **Buchung aufteilen:** Einen Einkauf auf mehrere Kategorien verteilen (Buchung antippen → «Auf mehrere Kategorien aufteilen»). Der Kontostand bleibt gleich.
- **Mitteilungen aufs Handy** (bei der Glocke einschalten): fällige Rechnungen, geplante Zahlungen, Warnung bei Minus, Monatsrückblick. Standard ohne Namen und Beträge.
- **Konto-Aussehen:** Name, Farbe, Symbol und Kontoart ändern (Konto-Kachel antippen → «Name, Farbe & Symbol ändern»).
- **Web-Version:** Entsperren mit Fingerabdruck, Gesichtserkennung oder Windows Hello.

## 1.13.0
- **Daueraufträge & Lohn** (Menü → Geplante Zahlungen): Miete, Krankenkasse, Abos und deinen Lohn mit Rhythmus erfassen. Kommt die Zahlung per Bank-Import, gilt sie automatisch als erledigt.
- **Abo-Erkennung:** Die App findet wiederkehrende Zahlungen in deinen Buchungen und schlägt sie mit «Übernehmen» als Dauerauftrag vor.
- **Glocke mit Hinweisen** oben rechts: fällige Rechnungen, Budget überschritten oder zu schnell aufgebraucht, ungewöhnlich hohe Ausgaben, Konto droht ins Minus, fehlende Daueraufträge.
- **«Bis zum Lohn»** auf der Startseite: wie viel pro Tag bis zum nächsten Lohn frei bleibt.
- **Kalender** (Menü): Ausgaben und Einnahmen pro Tag, geplante Zahlungen als Punkt.
- **Schnell erfassen:** Häufige eigene Buchungen erscheinen als Vorlagen im Plus-Menü.
- Ausblick zählt jetzt auch Lohn und Einnahmen mit.

## 1.12.0
- Vermögen in CHF (Startseite und Statistik → Saldo): alle Konten mit Stand, Kurs und Wert in CHF. Oben Saldo (wie bei Wallet nur Konten «in Statistik»), Guthaben total, Schulden und Netto.
- Fremdwährungen (EUR, USD, CAD …) werden zum Tageskurs der Europäischen Zentralbank in CHF umgerechnet und zählen mit. Eigener Kurs pro Währung möglich (Kurs antippen).
- Umrechner: Betrag eingeben, Währung wählen – sofort in CHF und zurück.
- Konten-Datei: Beim Übernehmen der Wallet-Konten können jetzt auch Stand, Farbe, «in Statistik» und Kontoart mitkommen.

## 1.11.0
- Woche · Monat · Jahr: Buchungen und Statistik lassen sich wochenweise (Mo–So), monatsweise oder jahresweise anschauen und mit ‹ › blättern. Die gleitenden Zeiträume (7T, 30T, 12W, 6M, 1J) bleiben.
- Kategorien wie in Wallet (Menü → Import): Die App liest deine Wallet-Kategorien aus den Wallet-Buchungen, ordnet sie den Wallet-Hauptkategorien zu (Essen & Getränke, Wohnen, Finanzausgaben …) und legt sie an. Passt eine bestehende Kategorie, wird sie umbenannt – dein Budget bleibt erhalten. Alle Wallet-Buchungen werden neu zugeordnet.
- Ausgabenstruktur wahlweise nach Kategorien oder nach Hauptkategorien wie bei Wallet.
- Automatische Regeln aus deinen Wallet-Buchungen (Menü → Import oder Automatische Regeln): Händler, die in Wallet immer gleich zugeordnet waren, werden zu Regeln für deine Bankdateien.

## 1.10.0
- Konten wie in Wallet übernehmen (Startseite → Kachel «Konten wie in Wallet», oder Seite Konten): Anzahl, Namen, Reihenfolge, Farben, Kontoart und Währung.
- Quelle: deine Wallet-Verbindung (mit Farben und Reihenfolge) oder ein Wallet-Export (CSV). Die App schlägt vor, welches Wallet-Konto zu welchem bestehenden Konto gehört – du kannst alles anpassen, mit ▲▼ sortieren und Konten ohne Buchungen (z. B. Bargeld USD) hinzufügen.
- Nichts wird gelöscht: Konten, die es nur in dieser App gibt (z. B. für die Planung), kommen ans Ende.
- Konten in Fremdwährung (EUR, USD …) zeigen ihren Stand in der eigenen Währung. Konten «nicht in Statistik» erscheinen grau wie bei Wallet und zählen nicht in Summen und Anzeigen.
- Neue Wallet-Importe landen automatisch auf dem zugeordneten Konto.

## 1.9.0
- Startseite wie die Wallet-App: oben Reiter «Konten» und «Budgets & Ziele», Konten als kompakte Kacheln mit Symbol (3 pro Reihe), Schnellzugriffe (Ausgaben, Geplante Zahlungen, Budgets, Ziele, Konten).
- Übersicht mit Anzeigen wie im Wallet-Dashboard: Verfügbar, Cashflow, Ausblick 7 Tage, Ausgaben, Kredit und Schuld.
- Auf der Startseite: Ausgabenstruktur der letzten 30 Tage, letzte Einträge mit Datum, Kontostand-Trend und bevorstehende geplante Zahlungen (offene Rechnungen, feste Kosten am üblichen Tag, Jahreskosten).
- Statistik wie in der Wallet-App: Reiter Saldo, Ausblick, Cashflow, Ausgaben und Kredit. Unten eine Leiste für den Zeitraum (7T, 30T, 12W, 6M, 1J, blättern oder eigene Daten) sowie Konten und Filter.
- Neu: Kontostand nach Konten, erwarteter Kontostand der nächsten 30 Tage, Schulden mit ungefähren Zinsen pro Monat.

## 1.8.1
- Schriftgrössen überarbeitet: ruhiger und einheitlich. Grosse Beträge, Überschriften, Kacheln, Listen und Knöpfe sind kleiner, damit mehr auf den Bildschirm passt.

## 1.8.0
- Neue Seite «Analyse» wie bei Wallet (Menü → Analyse): Zeitraum wählbar (7 Tage, 30 Tage, Monat, 3 Monate, Jahr) und mit den Pfeilen blättern.
- Kennzahlen mit Vergleich zum vorherigen Zeitraum: Einnahmen, Ausgaben, Cashflow, Sparquote, Ø Ausgaben pro Tag.
- Kontostandtrend, Periodenvergleich (aktuell, vorheriger Zeitraum, vor einem Jahr – für Cashflow, Ausgaben oder Einnahmen), Cashflow-Trend und Ausgabenstruktur. Antippen zeigt die Werte des Tages.
- Muss · Brauch · Will: Jede Kategorie ist eingeteilt (änderbar unter Budgets & Ziele → Muss · Brauch · Will). Die Karte «Art der Ausgaben» zeigt, wie viel du wofür ausgibst.
- Nutzung der Kreditlimits, Top-Händler und letzte Einträge.
- Bericht: Einnahmen und Ausgaben pro Kategorie, gruppiert nach Muss, Brauch und Will, mit Vergleich zum vorherigen Zeitraum.
- Filter wie bei Wallet: Suche, Konto, Kategorie, Muss/Brauch/Will, Betrag von–bis, Überträge ein- oder ausschliessen.

## 1.7.0
- Fingerabdruck schaltet sich automatisch ein: Nach dem Festlegen oder Eingeben der PIN fragt Android einmal nach dem Finger – danach öffnest du die App nur noch mit dem Finger. Ausschalten weiterhin in den Einstellungen.
- Buchungen wie bei Wallet: Symbol pro Kategorie, Kategorie fett, Händler darunter, Konto rechts, Ausgaben rot und Einnahmen grün, Tage mit «Heute» und «Gestern».
- Oben auf der Buchungsseite: Ausgaben, Einnahmen und Saldo des Monats; Suche und Kontofilter in einer Zeile.
- Runder Plus-Knopf öffnet wie bei Wallet ein Auswahlblatt: Buchung erfassen, Rechnung fotografieren, Bankdatei hochladen. Die grossen Knopf-Reihen sind weg.
- Einheitliche, gut antippbare Knöpfe und Eingabefelder; doppelte Seitenüberschriften auf dem Handy entfernt.

## 1.6.0
- Neu: Geräte-Sync. Handy, Tablet und PC haben den gleichen Stand. Beim Öffnen holt die App die neuesten Daten, Änderungen werden nach wenigen Sekunden gespeichert.
- Ablage nur als verschlüsselte Datei (AES-256) in deinem eigenen privaten GitHub-Repository. Der Schlüssel liegt nur auf deinen Geräten. Öffentliche Repositories werden abgelehnt.
- Einrichten: Menü → Einstellungen → Daten & Sicherheit → Geräte-Sync. Weitere Geräte verbinden sich mit dem Verbindungscode (auch direkt auf dem Startbildschirm).
- Fingerabdruck: Nach dem Entsperren mit PIN bietet die App jetzt direkt an, künftig mit dem Fingerabdruck zu öffnen. Fehler werden genau angezeigt.

## 1.5.0
- Wallet-Export (CSV): Die Wallet-Kategorien werden jetzt automatisch den Kategorien der App zugeordnet (z. B. Restaurant, Lebensmittel, Öffentliche Verkehrsmittel → Arbeitsweg, Einkommen, Überträge).
- Besserer Text bei Wallet-Buchungen (Bankbeschreibung statt nur «Buchung»), Fremdwährungen werden in CHF übernommen.
- Neue Seite «Kategorien zuordnen» (Menü → Import): eine Zeile pro Wallet-Kategorie bzw. Händler, jede Wahl wird sofort gespeichert. Knopf «Automatisch zuordnen» für schon importierte Buchungen.
- Datei nochmals hochladen ist sicher: Es entsteht nichts doppelt, schon importierte Buchungen werden nachträglich zugeordnet. Buchungen, die schon aus einer PostFinance-Datei da sind, werden aus Wallet nicht nochmals übernommen.

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
