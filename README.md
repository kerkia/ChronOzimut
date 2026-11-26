# Chronoz

Chronoz times orienteering races: entries, start draw, card reading (SPORTident and Emit), results, the referee's
work and the lists to print. It is a desktop application for Windows, macOS and Linux that works without the Internet:
every laptop of the arena runs it, the laptops find each other on the local network and keep the same race, and each one
also serves its pages to the phones and screens around it.

**Status: young.** The engine, the formats and the app are covered by automated tests (about 800 checks, `npm test`) and
have been tried in a browser and between several copies of the app on one computer. They have **not yet** been tried with
real SPORTident or Emit stations, with a real thermal receipt printer, between real laptops on an arena's network, or at a
real race. Try it at a training session, or alongside your usual timing software, before relying on it.

## Features

- Events, courses, classes, clubs and entries, imported from IOF XML 3.0, OE CSV or a MeOS event file, or typed in.
- Start draw by class or course, with club separation and vacant places; start lists.
- SPORTident card reading (SI5 to SI11, SIAC, pCard) over a serial port; Emit 250 reader and MTR4; a simulator for training.
- Cards judged against their course: missing and extra punches, forked courses, score courses, relay legs, mass starts.
- Results by class or by course, split times, relays, pairs and patrols, knockout sprints, several days with totals and a
  chase start.
- The stations of a race: Prepare, Desk, Start, Finish, Monitor, Speaker, Referee, Units, Close. Every change made by hand
  is kept and listed for the referee.
- Finish receipts printed without a dialog (ESC/POS or a page), result and start lists, a list designer, invoices by club.
- Radio punches from relays that speak SIRAP (TCP port 10000).
- Exports: IOF XML 3.0, OE CSV (the layout federations such as France's use), MeOS's event file, a results page.
- Four languages: English, French, German, Spanish. Rules by country: France, Canada, and a neutral IOF set.

## Download

The latest release: <https://github.com/kerkia/Chronoz/releases/latest>. Direct links to its files:

| System | File |
|---|---|
| Windows, installed (recommended; per user, no administrator rights) | [Chronoz-Setup.exe](https://github.com/kerkia/Chronoz/releases/latest/download/Chronoz-Setup.exe) |
| Windows, portable (one program, nothing installed) | [Chronoz-Portable.exe](https://github.com/kerkia/Chronoz/releases/latest/download/Chronoz-Portable.exe) |
| macOS (one disk image for Apple silicon and Intel) | [Chronoz.dmg](https://github.com/kerkia/Chronoz/releases/latest/download/Chronoz.dmg) |
| Linux (64-bit) | [Chronoz.AppImage](https://github.com/kerkia/Chronoz/releases/latest/download/Chronoz.AppImage) |

**The releases are not signed yet**, so the system is wary of the app at its first launch:

- **Windows** shows « Windows protected your PC »: choose « More info », then « Run anyway ».
- **macOS** first refuses to open it. On recent versions: System Settings › Privacy & Security, then « Open Anyway »; on
  older ones, right-click the app, « Open », then confirm.
- **Linux**: make the file executable (`chmod +x Chronoz.AppImage`, or Properties › Permissions), then run it.

## At the arena

- **Every laptop runs the app.** Each one keeps a full copy of the race and its own journal; none is the master.
- **They find each other** on the local network (a Wi-Fi access point or a plain router is enough; no Internet needed).
  Every few seconds each app announces which events it holds; two apps holding the same event link to each other by
  themselves, and links may pass through any of them. A laptop that restarts catches up on its own.
- **The event code.** Each event has a six-character code, shown in Prepare › Connections. On each other laptop it is typed
  once (home screen › « On the network » › the event › its code); after that the laptop links by itself at every launch.
  The code is never sent on the network: an app proves it knows it.
- **Phones and screens** (speaker, results, start, referee) install nothing: their browser opens the address of any laptop,
  given in Prepare › Connections and in Help › « About Chronoz » (`http://<laptop>:8377/?k=<key>`).
- **A network that blocks the announcements** (public or school Wi-Fi): Prepare › Connections › « A computer does not show
  up? » links two apps by address and key.
- **With the Internet**, the « Chrono » tab of an event on [ozimut.com](https://ozimut.com) offers the same screens in a
  browser, its stations kept in step through a copy on ozimut.com.

Card readers and receipt printers need the app on the computer they are plugged into: a browser lets only a page of the
computer itself (or a secure site) talk to a serial port.

The full user guide is in the app: Help › Documentation (F1).

## Updates

The app keeps itself up to date without getting in a race's way (`app/update.mjs`):

- At start, then every six hours, it asks GitHub whether a newer release exists. Without the Internet nothing happens.
- The **installed Windows app** and the **Linux AppImage** download the new version in the background (its SHA-512 checked
  against the release's `latest.yml`) and install it **when the app is closed**. « Restart now » is offered, never forced.
- The **macOS app** and the **Windows portable program** only say that a new version exists and where to download it.
- Help › « Keep Chronoz up to date » switches the checks off.
- Laptops linked at an arena show a warning in Prepare › Connections, and in the top bar, when their versions differ.

## Uninstalling

- **Windows, installed**: Settings › Apps › « Chronoz » › Uninstall, or the uninstaller in the Start menu.
- **Windows, portable**: delete the program file.
- **macOS**: drag « Chronoz » from Applications to the Bin.
- **Linux**: delete the AppImage.

The events and the settings are kept on purpose; delete them by hand if you wish:

- **The events**: the folder `Documents/Chronoz` (one journal `<event>.chronoz.jsonl` per event, and `hub.json`),
  unless `settings.json` names another folder.
- **The settings and the window's own storage** (`settings.json`, and the browser storage of the app's page, which includes
  the card numbers remembered by Close): the per-user application-data folder « Chronoz » —
  `%APPDATA%\Chronoz` on Windows, `~/Library/Application Support/Chronoz` on macOS, `~/.config/Chronoz`
  on Linux.
- **Downloaded updates** (installed Windows app, AppImage): the cache folder « chronoz-updater » —
  `%LOCALAPPDATA%\chronoz-updater` on Windows, `~/.cache/chronoz-updater` on Linux.

## Building from source

Node 24 (what the release workflow uses), then:

```
npm ci            # Electron, electron-builder, electron-updater, ws
npm start         # the app, from the source
npm test          # every test of test/ (plain Node, about 800 checks)
npm run check     # the four language catalogues against each other and against the code
npm run smoke     # the app started for real, hidden, and its page checked
npm run dist      # installers for the current system, in dist/
```

`npm run hub` (`node app/dev-hub.mjs [port] [folder]`) runs the hub alone, without the window: open
`http://localhost:8377/` in a browser.

## Repository layout

| Path | What |
|---|---|
| `src/` | Pure ES modules, no build step; they run in a page, in the app and under Node |
| `src/*.js` | The engine: `log.js` (the log of operations every station appends to), `model.js`, `judge.js` (a card against its course), `view.js` (results and lists), `draw.js` (start draw), `times.js`, `sync.js` (stations exchange what they lack), `store.js`, `knockout.js`, `series.js`, `xml.js` |
| `src/rules/` | Rules by country (France, Canada, IOF) |
| `src/io/` | Formats: IOF XML 3.0, OE CSV, MeOS's event file, MOP, SIRAP |
| `src/si/`, `src/emit/` | SPORTident and Emit: protocol, cards, reader, simulator |
| `src/print/` | Receipts (ESC/POS or HTML), lists, the list designer, invoices |
| `src/ui/` | The screens |
| `src/lib/` | `i18n.js` (texts), `html.js`, `ask.js` (the page's own confirm and alert boxes) |
| `src/i18n/<lang>.js` | The texts: `fr` (the reference), `en`, `de`, `es` |
| `src/doc/app.<lang>.js` | The user documentation (Help › Documentation) |
| `src/css/` | `base.css` (the app's own page: colours, themes, shared parts), `chrono.css` (the screens; a host site loads only this one) |
| `src/img/` | Icons and logo |
| `app/` | The Electron app: `main.mjs` (main process), `hub.mjs` (HTTP and WebSocket on port 8377, the journals, the SIRAP listener), `peers.mjs` (discovery on UDP 8379 and links between laptops), `ports.mjs` (which serial port), `update.mjs`, `strings.mjs` (the menus' texts), `preload.cjs`, `www/` (the page and the documentation's page), `dev-hub.mjs`, `smoke.mjs` |
| `test/t_*.mjs` | The tests, plain Node |
| `docs/` | `design.md` (the engine's contract), `meos.md`, `emit.md` (the format facts relied on, with their sources) |
| `tools/` | `test.mjs`, `i18n_check.mjs`, `latest.mjs` and `release-notes.mjs` (used by the release workflow) |

## Compatibility

Chronoz reads and writes the files and protocols other timing software uses — IOF XML 3.0, OE CSV, MeOS's event file
(`.meosxml`), MOP (MeOS Online Protocol) and SIRAP — **without any MeOS code**: MeOS is under the Affero GPL and its source
was read only for names, units and numbers. `docs/meos.md` and `docs/emit.md` list every fact relied on and where it comes
from, and what has not been checked against the real software or hardware.

## Code signing policy

This applies once the project's application to SignPath Foundation is accepted; releases are not signed yet.

Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by [SignPath Foundation](https://signpath.org)

- Committers and reviewers: [kerkia](https://github.com/kerkia)
- Approvers: [kerkia](https://github.com/kerkia)

The binaries are built from this repository's source by GitHub Actions (`.github/workflows/release.yml`), and each
release's signing request is approved by hand.

Privacy policy: see [PRIVACY.md](PRIVACY.md). This program will not transfer any information to other networked systems
unless specifically requested by the user or the person installing or operating it.

## Relationship with ozimut.com

Chronoz is an independent application: it needs no account and no Internet. [ozimut.com](https://ozimut.com), an
orienteering site by the same author (closed source), embeds a copy of this repository's `src/` as the « Chrono » tab of
its events. The app connects to ozimut.com only when its user asks for it, from that tab: a copy of the event kept on
ozimut.com, results published to ozimut.com, live results.

## Licence

[Mozilla Public License 2.0](LICENSE). You may use, change and redistribute the code, also inside larger works under other
licences; the files of this project that you distribute, changed or not, stay under the MPL with their source available.

## Trademark

« Ozimut », « Chronoz » and the logo are not covered by the licence: see [TRADEMARK.md](TRADEMARK.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits

SPORTident support was ported from three MIT-licensed projects; the app bundles Electron and a few libraries. See
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
