// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
// distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

// The hub alone, without the app's window: `node app/dev-hub.mjs [port] [folder]` — for development, and for an
// arena computer that only needs to link the stations (its page is then opened in a browser at http://localhost:<port>/).
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { startHub } from "./hub.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2]) || 8377;
const folder = process.argv[3] || path.join(os.homedir(), "Documents", "Ozimut Chrono");
const hub = await startHub({ port, sirapPort: null, folder, src: path.join(here, "..", "src"), www: path.join(here, "www"), name: os.hostname(), version: "dev", tries: 1 });
console.log(`Ozimut Chrono hub on http://localhost:${hub.port}/ — other computers: ${hub.addresses().map((a) => `http://${a}:${hub.port}/?k=${hub.token}`).join(", ") || "(no network)"}`);
console.log(`Events kept in ${hub.folder}`);
