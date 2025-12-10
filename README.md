# Sonnenhof App

Eine moderne, modulare Verwaltungsoberfläche zur Unterstützung der Abläufe auf dem Sonnenhof.

Kurzbeschreibung
-----------------
Die Sonnenhof App ist die All‑in‑One Lösung zur Digitalisierung des Sonnenhofs in Rudelstetten (bei Nördlingen). Sie bildet Funktionen zur Verwaltung von Märkten, Ständen, Mitarbeitenden, Bestellungen und weiteren Hofprozessen ab.

Über den Sonnenhof
------------------
Der Sonnenhof ist ein Familienbetrieb, der bereits in der zweiten Generation geführt wird. Die Hofgeschichte reicht zurück bis zur neuen Hofstelle 1969. Die heutigen Betreiber haben den Betrieb weiterentwickelt: Bau eines modernen Schlacht- und Zerlegebetriebs mit EU‑Zulassung, Direktvermarktung ab Hof und Belieferung von Wochenmärkten (z. B. München). Schwerpunkte sind Spargelanbau und Schweinehaltung; viele Produkte werden direkt an Endverbraucher verkauft.

Webseite: https://bauernshop.de

Inhaltsverzeichnis
------------------
- [Features](#features)
- [Projektstruktur](#projektstruktur)
- [Voraussetzungen](#voraussetzungen)
- [Schnellstart](#schnellstart)
- [Build & Deployment](#build--deployment)
- [Tests](#tests)
- [Entwicklung & Contribution](#entwicklung--contribution)
- [Lizenz](#lizenz)
- [Kontakt](#kontakt)

Features
--------
- Verwaltung von Märkten, Ständen und Produkten
- Benutzer- und Berechtigungsverwaltung
- Bestell- und Auftragsverwaltung
- Integration von PDF-Exporten und weiteren Diensten
- Modularer Aufbau, geeignet für Lazy‑Loading

Projektstruktur (Kurz)
----------------------
- `src/` — Quellcode und statische Assets
- `src/main.ts`, `src/index.html`, `src/styles.scss` — Einstieg und globale Styles
- `src/app/` — Hauptapplikation, Routen und Konfiguration
- `src/app/core/` — Kernservices, Guards, Direktiven, Modelle (`services/`, `guards/`, `models/`)
- `src/app/modules/` — Feature‑Module (z. B. `butchery`, `farming`, `office`, `landing-page`, `login`, `settings`)
- `src/assets/` — Icons, Bilder, statische Dateien
- `src/environments/` — Umgebungs-spezifische Einstellungen (`environment.ts`, `environment.prod.ts`)

> Hinweis: Die Struktur ist modular; Features können getrennt entwickelt und lazy‑loaded werden.

Voraussetzungen
--------------
- Node.js (LTS empfohlen)
- npm (oder pnpm / yarn)
- Optional: global installiertes Angular CLI (`npm i -g @angular/cli`)

Schnellstart
------------
1. Abhängigkeiten installieren:

```powershell
npm install
```

2. Entwicklungsserver starten:

```powershell
npm start
# oder direkt
ng serve --open
```

3. Anwendung öffnen: http://localhost:4200/

Build & Deployment
------------------
Produktion bauen:

```powershell
npm run build
# oder mit Angular CLI
ng build --configuration production
```

Das Ergebnis befindet sich im Ordner `dist/` und kann auf einem statischen Webserver oder in einem Container bereitgestellt werden. Bei Bedarf `baseHref` oder `deployUrl` anpassen.

Tests
-----
- Unit-Tests (Karma/Jasmine):

```powershell
npm test
```

- E2E-Tests (sofern konfiguriert):

```powershell
npm run e2e
```

Entwicklung & Contribution
--------------------------
- Branching: Arbeit in Feature-Branches vom `development` Branch
- PRs: aussagekräftige Beschreibung, Tests hinzufügen, lokal testen
- Generieren von Komponenten/Modulen:

```powershell
ng generate component <name>
ng generate module <name> --route <route> --module app
```

Lizenz
------
Dieses Repository enthält die Datei `LICENSE-CC-BY-NC-SA`. Prüfen Sie diese Lizenz vor kommerzieller Nutzung.

Kontakt
-------
Für Fragen oder Fehlerberichte öffne bitte ein Issue im Repository oder kontaktiere das Projektteam.
