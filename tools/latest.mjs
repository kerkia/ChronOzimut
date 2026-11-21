// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
// distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

// Writes the update information electron-updater (6.x, GitHub provider) reads from a release: latest.yml for the
// Windows installer, latest-linux.yml for the AppImage. Made from the final files, after any signing, so that the
// SHA-512 is the one of the file the release holds.
//
//   node tools/latest.mjs <file> <out.yml> [--version x.y.z] [--date <ISO>]
//        the version from package.json unless given; the date now unless given
//   node tools/latest.mjs --check <yml> <file>
//        exit 0 when the yml names that file with its size and SHA-512, 1 otherwise
//
// Plain Node, no dependency: the YAML is written and read in the one fixed shape below.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export function sha512(file) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash("sha512");
    fs.createReadStream(file).on("error", reject).on("data", (b) => h.update(b)).on("end", () => resolve(h.digest("base64")));
  });
}

export function yaml({ name, sha, size, version, date }) {
  return [
    `version: ${version}`,
    "files:",
    `  - url: ${name}`,
    `    sha512: ${sha}`,
    `    size: ${size}`,
    `path: ${name}`,
    `sha512: ${sha}`,
    `releaseDate: '${date}'`,
    "",
  ].join("\n");
}

// the few fields this script writes, read back
export function parse(text) {
  const out = { files: [] };
  let item = null;
  for (const line of text.split(/\r?\n/)) {
    let m;
    if ((m = /^  - url: (.+)$/.exec(line))) { item = { url: m[1].trim() }; out.files.push(item); }
    else if (item && (m = /^    (sha512|size): (.+)$/.exec(line))) item[m[1]] = m[1] === "size" ? Number(m[2]) : m[2].trim();
    else if ((m = /^(version|path|sha512|releaseDate): (.+)$/.exec(line))) { out[m[1]] = m[2].trim().replace(/^'(.*)'$/, "$1"); item = null; }
  }
  return out;
}

function fail(msg) { console.error(`latest: ${msg}`); process.exit(1); }

async function main(argv) {
  if (argv[0] === "--check") {
    const [, yml, file] = argv;
    if (!yml || !file) fail("usage: node tools/latest.mjs --check <yml> <file>");
    const info = parse(fs.readFileSync(yml, "utf8"));
    const name = path.basename(file), size = fs.statSync(file).size, sha = await sha512(file);
    const entry = info.files.find((f) => f.url === name);
    const problems = [];
    if (!/^\d+\.\d+\.\d+/.test(info.version || "")) problems.push(`no version (${info.version})`);
    if (!entry) problems.push(`${name} is not among the files`);
    else {
      if (entry.size !== size) problems.push(`size ${entry.size}, the file has ${size}`);
      if (entry.sha512 !== sha) problems.push("files[].sha512 differs from the file's");
    }
    if (info.path !== name) problems.push(`path ${info.path}, expected ${name}`);
    if (info.sha512 !== sha) problems.push("sha512 differs from the file's");
    if (!info.releaseDate || Number.isNaN(Date.parse(info.releaseDate))) problems.push("no releaseDate");
    if (problems.length) fail(`${yml}: ${problems.join("; ")}`);
    console.log(`latest: ${yml} matches ${name} (version ${info.version}, ${size} bytes)`);
    return;
  }
  const opt = (k) => { const i = argv.indexOf(k); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
  const version = opt("--version") || JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
  const date = opt("--date") || new Date().toISOString();
  const [file, out] = argv;
  if (!file || !out) fail("usage: node tools/latest.mjs <file> <out.yml> [--version x.y.z] [--date <ISO>]");
  if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) fail(`not a version: ${version}`);
  const text = yaml({ name: path.basename(file), sha: await sha512(file), size: fs.statSync(file).size, version, date });
  fs.writeFileSync(out, text);
  console.log(`latest: ${out}\n${text}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch((e) => fail(e.message));
