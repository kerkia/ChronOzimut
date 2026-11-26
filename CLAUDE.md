# Chronoz — notes for coding sessions

Chronoz times orienteering races: entries, start draw, SPORTident/Emit card reading, results, referee, lists. An
Electron desktop app; every copy runs a hub that serves its pages to the phones and screens of the arena and links by
itself to the other laptops holding the same event, with no Internet. Public repository, Mozilla Public License 2.0.
Author and copyright holder: Yann Le Helloco (GitHub `kerkia`). Code, comments and commit messages in English.

**Read `docs/design.md` first**: the engine's contract (the state, the operations of the log, what a reader gives, what the
formats exchange, sync, the hub, the peers). `docs/meos.md` and `docs/emit.md` list the format facts relied on and their
sources. The user documentation is `src/doc/app.<lang>.js` (Help › Documentation): reuse its vocabulary.

## Layout

- `src/` — pure ES modules, **no build step**; they run in a page, in the app and under Node.
  - Engine: `log.js` (the log of operations, hybrid clock, folded into the state), `model.js`, `judge.js`, `view.js`,
    `draw.js`, `times.js`, `sync.js`, `store.js` (IndexedDB, the `.chronoz` file), `knockout.js`, `series.js`, `xml.js`;
    `rules/` (fr, ca, iof — nothing country-specific in the engine), `io/` (IOF XML, OE CSV, MeOS XML, MOP, SIRAP), `si/`,
    `emit/`, `print/`. No DOM and no UI text in the engine.
  - `ui/` the screens; `lib/` (`i18n.js`, `html.js`, `ask.js`); `i18n/<lang>.js` the catalogues; `doc/` the user guide;
    `css/base.css` (the app's own page: tokens, themes, shared parts) and `css/chrono.css` (the screens; a host site loads
    only this one); `img/`.
- `app/` — `main.mjs` (Electron main process: window, menu, printing, serial port choice, settings), `hub.mjs` (plain Node:
  HTTP + WebSocket on 8377, one journal `<event>.chronoz.jsonl` per event, SIRAP on TCP 10000), `peers.mjs` (UDP discovery
  on 8379, links between hubs, the event code's proof), `ports.mjs`, `update.mjs`, `strings.mjs` (menu texts), `preload.cjs`
  (`window.chronoApp`), `www/index.html` + `doc.html`, `dev-hub.mjs`, `smoke.mjs`.
- `test/t_*.mjs` — plain Node, ~800 checks. `tools/` — `test.mjs`, `i18n_check.mjs`, `latest.mjs`, `release-notes.mjs`.

## Rules

- **No build step**, no bundler, no framework. `src/` imports nothing from outside `src/` (and nothing from a CDN).
- **Never any (A)GPL code**, MeOS's above all. Compatible with MeOS, never derived from it: its files and protocols are
  implemented from documentation and facts (names, units, numbers), cited in `docs/`. Permissive code (MIT, BSD) only with
  its notice kept and listed in `THIRD-PARTY-NOTICES.md` (as `src/si/LICENSE-sportident.txt`).
- **Texts in four languages in the same commit**: `src/i18n/fr.js` is the reference (a key exists there first), then
  `en.js`, `de.js`, `es.js` — same keys, same `{placeholders}`, read with `t(key, vars)` / `tn(key, n)` (plural keys
  `x.one` / `x.other`). Never UI text in the code, never a French fallback for another language. French typography: a
  no-break space (U+00A0) before « : ; ? ! » and inside « ». `npm run check` (`tools/i18n_check.mjs`) must pass. The user
  guide `src/doc/app.<lang>.js` follows `app.fr.js`, same sections. `app/strings.mjs` holds the menus' texts.
- **No browser `alert()` / `confirm()`**: `src/lib/ask.js` (`confirmBox`, `alertBox`).
- **The repository is public**: invented names only in tests and examples; never results, personal data, card dumps of real
  people, or secrets.
- **MPL header** on every new file:
  `// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not`
  `// distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.`
- **The look**: `base.css`'s tokens are ozimut.com's five themes (light, clearing, forest, undergrowth, dark), the control
  flag's orange for the main action. **Laptop first**: the window never scrolls as a whole, a thin frame, compact rows.
  Phones only for the pages the hub serves them (start, speaker, monitor, referee…).
- **Nothing sent to the Internet by itself** but the update check (see `PRIVACY.md`); keep it so, and update `PRIVACY.md`
  when that changes.
- The log is the truth: state is folded from operations; a card's own content is never changed (a correction replaces it
  and is noted). Stations converge whatever the order operations arrive in.

## Testing

- `npm test` — every `test/t_*.mjs` in its own process (`node tools/test.mjs hub peers` for some only).
- `npm run check` — the catalogues.
- `npm run smoke` — the real app started hidden, its page checked (`--doc` for the documentation window).
- In a browser: `npm run hub` (`app/dev-hub.mjs [port] [folder]`), then a headless browser on `http://localhost:8377/`;
  check the console for errors. A rehearsal (Prepare › Equipment) works on a copy of the log with made-up cards.

## Releases

Bump `version` in `package.json` and push to `main`: `.github/workflows/release.yml` builds Windows, macOS and Linux, runs
the tests and the smoke test on each, and publishes the release `v<version>` (marked latest) with `latest.yml` /
`latest-linux.yml` for electron-updater (made by `tools/latest.mjs`) and `chrono-app.json`. A push that does not bump the
version publishes nothing. Unsigned for now; SignPath (Windows) and Apple Developer ID are wired in the workflow, waiting
for their secrets.

## ozimut.com

ozimut.com (closed source, same author) vendors a **copy** of `src/` as the « Chrono » tab of its events. Never import
anything from ozimut.com here. The optional connector to ozimut.com's API lives in `src/ui/net.js` (the copy of the event
on ozimut.com, live results) and `src/ui/close.js` (publishing results); it is used only when the event was set up from
ozimut.com's tab. The hub accepts calls from `https://ozimut.com` pages opened on the same computer.

## Never tried on real equipment

No real SPORTident or Emit station, no thermal receipt printer, no real MeOS, no file accepted by a federation yet, no link
between real laptops on an arena's network, no real race. Emit's eScan/eScan2: status and passings only (the card's layout
is in Emit's confidential specification). Say so plainly wherever it matters; `docs/emit.md` lists what a first test on
hardware should check.
