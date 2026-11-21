// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
// distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

// npm test — every test file of test/ in turn, each in a process of its own; stops at the first that fails.
// `node tools/test.mjs engine hub` runs the named ones only.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "test");
const asked = process.argv.slice(2);
const files = fs.readdirSync(dir).filter((f) => /^t_\w+\.mjs$/.test(f) && (!asked.length || asked.includes(f.slice(2, -4)))).sort();
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(dir, f)], { encoding: "utf8" });
  const last = (r.stdout || "").trim().split("\n").pop() || "";
  if (r.status === 0) console.log(`ok    ${f.padEnd(16)} ${last}`);
  else { failed++; console.log(`FAIL  ${f}\n${(r.stdout || "").trim().split("\n").slice(-12).join("\n")}\n${(r.stderr || "").trim().split("\n").slice(-8).join("\n")}`); }
}
console.log(failed ? `${failed} of ${files.length} test files failed` : `all ${files.length} test files passed`);
process.exit(failed ? 1 : 0);
