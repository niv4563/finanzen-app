# Build-Abläufe einschalten (einmalig)

GitHub erlaubt nur dir selbst, die Build-Abläufe unter `.github/workflows/` zu ändern. Deshalb liegen die neuen
Fassungen hier. Einmal übernehmen – danach läuft alles automatisch.

| Datei | Was sie neu macht |
|---|---|
| `android.yml` | Automatische Tests (Verschlüsselung, alle Seiten und Knöpfe) **vor** jedem Build – bei einem Fehler wird nichts veröffentlicht. Prüft die Zertifikate der Server für das Pinning. Legt das Ergebnis im Zweig `ci-status` ab. |
| `pages.yml` | Die PC-Version wird nur veröffentlicht, wenn die Tests bestanden sind. |
| `ios.yml` | **Neu:** baut die iPhone-App auf einem Mac von GitHub. Mit Apple-Secrets auch für TestFlight. |

## So geht's (im Browser, ca. 3 Minuten)

Für **android.yml** und **pages.yml** (bestehende Dateien ersetzen):

1. Auf GitHub im Projekt die Datei hier öffnen, z. B. `tools/workflows/android.yml`, und oben rechts auf
   **Copy raw file** (Symbol mit zwei Blättern) klicken.
2. Die Datei `.github/workflows/android.yml` öffnen, auf den **Stift** (Edit) klicken, alles markieren,
   einfügen und **Commit changes** wählen.
3. Gleich mit `pages.yml`.

Für **ios.yml** (neue Datei):

1. `tools/workflows/ios.yml` öffnen und **Copy raw file** klicken.
2. Zum Ordner `.github/workflows` gehen › **Add file › Create new file** › Name `ios.yml` › einfügen › **Commit changes**.

Danach den Reiter **Actions** ansehen: «Android-App», «Web-Version» und «iPhone-App» laufen durch.
