# Third-party notices

Ozimut Chrono is Copyright © 2026 Yann Le Helloco and is distributed under the Mozilla Public License 2.0 (`LICENSE`).
It contains, or is distributed with, the work of others listed below.

## SPORTident support, ported from three MIT-licensed projects

The SPORTident protocol codec, the card layouts, the readout flow and test data in `src/si/` (tested by `test/t_si.mjs`)
were ported from:

1. **sportident.js** — <https://github.com/allestuetsmerweh/sportident.js> — Copyright (c) 2018 Simon Hatt
2. **lool-ing/sportident** — <https://github.com/lool-ing/sportident> — Copyright (c) 2026 Jonas Hagberg and the LooL
   contributors (itself ported in large part from sportident.js)
3. **GecoSI** — <https://github.com/sdenier/GecoSI> — Copyright (c) 2013 Simon Denier

What was taken from each, and the licence they share, are in
[`src/si/LICENSE-sportident.txt`](src/si/LICENSE-sportident.txt), which is packaged with the app. The licence:

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Bundled in the desktop app

The installers and programs contain Electron and the runtime dependencies of `package.json` with their own
dependencies (`npm ls --omit=dev --all`). Each package's licence file is inside the app, in its `node_modules` folder.

| Package | Version | Licence (SPDX) | Copyright |
|---|---|---|---|
| electron | 45.3.4 | MIT | Copyright (c) Electron contributors; Copyright (c) 2013-2020 GitHub Inc. |
| electron-updater | 6.8.11 | MIT | Copyright (c) 2015 Loopline Systems |
| builder-util-runtime | 9.7.0 | MIT | Copyright (c) 2015 Loopline Systems |
| debug | 4.4.3 | MIT | Copyright (c) 2014-2017 TJ Holowaychuk; Copyright (c) 2018-2021 Josh Junon |
| ms | 2.1.3 | MIT | Copyright (c) 2020 Vercel, Inc. |
| sax | 1.6.1 | BlueOak-1.0.0 | Its contributors (author Isaac Z. Schlueter; the Blue Oak licence names no single holder) |
| fs-extra | 10.1.0 | MIT | Copyright (c) 2011-2017 JP Richardson |
| graceful-fs | 4.2.12 | BlueOak-1.0.0 | Its contributors (the Blue Oak licence names no single holder) |
| jsonfile | 6.2.1 | MIT | Copyright (c) 2012-2015, JP Richardson |
| universalify | 2.0.1 | MIT | Copyright (c) 2017, Ryan Zimmerman |
| js-yaml | 4.3.2 | MIT | Copyright (C) 2011-2015 by Vitaly Puzrin |
| argparse | 2.0.1 | Python-2.0 | Copyright (c) 2001-2020 Python Software Foundation (a port of Python's argparse) |
| lazy-val | 1.0.5 | MIT | Vladimir Krivosheev (no licence file in the package; MIT per its package.json) |
| lodash.escaperegexp | 4.1.2 | MIT | Copyright jQuery Foundation and other contributors |
| lodash.isequal | 4.5.0 | MIT | Copyright JS Foundation and other contributors |
| semver | 7.7.4 | ISC | Copyright (c) Isaac Z. Schlueter and Contributors |
| tiny-typed-emitter | 2.1.0 | MIT | Copyright (c) 2020 Zurab Benashvili (binier) |
| ws | 8.23.0 | MIT | Copyright (c) 2011 Einar Otto Stangvik; Copyright (c) 2013 Arnout Kazemier and contributors; Copyright (c) 2016 Luigi Pinca and contributors |

**Electron** includes Chromium, Node.js and many other projects. Their notices are shipped with the app, in the file
`LICENSES.chromium.html` beside the program, with Electron's own licence file.

Build tools (electron-builder) are used to make the installers and are not part of the app.

## Fonts

None bundled: the app uses the system's own fonts.

## Formats and protocols

Implemented from public documentation and published facts; **no code was taken** from the software that defines or uses
them:

- **MeOS** (Affero GPL): its source was read only for names, units and numbers of its event file, its MOP protocol and its
  SIRAP input. No code, comment or structure of it is in this repository. See `docs/meos.md`.
- **Emit** (EPT cards, the 250 reader, the MTR4, the eScan): from Emit's published manuals and from facts described
  online, among them notes in a GPL-3 library read for facts only. See `docs/emit.md`, which lists every source.
- **IOF XML 3.0**: the International Orienteering Federation's data standard.

## The look

The colour tokens and themes of `src/css/base.css` come from ozimut.com, by the same author.
