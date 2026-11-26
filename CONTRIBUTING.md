# Contributing

Thank you for helping. Chronoz is young, and reports from real races and real hardware are the most useful
contributions of all.

## Reporting a bug

Open an issue at <https://github.com/kerkia/Chronoz/issues> and give:

- the app's version (Help › « About Chronoz ») and the system (Windows, macOS or Linux, and its version);
- what you did, what you expected, what happened — step by step;
- the hardware involved, if any: the card reader (SPORTident station model and firmware, Emit reader), the card family,
  the printer;
- a file that shows the problem, when there is one (an IOF XML, a CSV, an event's journal).

**Never put real runners' data in an issue**: the repository is public. Replace names, clubs, licence and card numbers with
invented ones before attaching a file, and say so.

## Proposing a change

Open a pull request. Before you do:

- `npm test` and `npm run check` pass.
- **Every text of the screens is in the four catalogues** — `src/i18n/fr.js` (the reference: a key exists there first),
  `en.js`, `de.js`, `es.js` — in the same change, with the same `{placeholders}`. No text is written in the code. French
  typography as in `fr.js`: a no-break space before « : ; ? ! » and inside « ». `npm run check` checks all of it.
- **No code from GPL or AGPL projects**, MeOS among them: their files and protocols may be read and written, from their
  documentation and published facts, never their code. Cite your sources in `docs/` (see `docs/meos.md`, `docs/emit.md`).
  Code from projects under permissive licences (MIT, BSD, Apache-2.0) is fine when its notice is kept and listed in
  `THIRD-PARTY-NOTICES.md`.
- Tests use **invented names only**, never real results or personal data, and no secrets.
- A new file starts with the MPL header:

  ```js
  // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
  // distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
  ```

`CLAUDE.md` holds the project's rules in more detail, and `docs/design.md` the engine's contract.

## Sign-off and licence

Contributions are accepted under the Mozilla Public License 2.0. Sign each commit off to certify the
[Developer Certificate of Origin](https://developercertificate.org/) — that you wrote the change or have the right to submit
it under this licence:

```
git commit -s
```

which adds a line `Signed-off-by: Your Name <you@example.com>`.

The MPL is a file-level copyleft: the files of this project stay open wherever they go, while the larger works that use
them may be under other terms. The author uses these files that way inside ozimut.com, a closed-source site, as the
licence allows; your contribution may reach it too.

## Code of conduct

Be kind and patient. Assume good faith, criticise ideas and code rather than people, and remember that many here are
volunteers of their club giving their weekends to a race. Harassment or contempt of anyone is not welcome, and the
maintainer may remove comments or contributors that behave so.
