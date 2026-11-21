// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
// distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

// Writes a release's notes to stdout: the subjects of the commits since the previous v* tag (all of them for the first
// release), then the fixed lines on updating and signing.
//
//   node tools/release-notes.mjs <tag> [--signed-win] [--signed-mac]
//
// Needs the repository's history and tags (actions/checkout with fetch-depth: 0). The « Not signed yet » sentence is
// left out once both Windows and macOS are signed; with one of them signed it names the other only.

import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const tag = args.find((a) => !a.startsWith("--"));
const signedWin = args.includes("--signed-win"), signedMac = args.includes("--signed-mac");
if (!tag) { console.error("usage: node tools/release-notes.mjs <tag> [--signed-win] [--signed-mac]"); process.exit(1); }

const git = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim();

// the latest v* tag other than this one, reachable from HEAD
let previous = "";
for (const t of git("tag", "--list", "v*", "--merged", "HEAD", "--sort=-v:refname").split("\n").filter(Boolean)) {
  if (t !== tag) { previous = t; break; }
}
const range = previous ? [`${previous}..HEAD`] : ["HEAD"];
const subjects = git("log", "--no-merges", "--format=%s", ...range).split("\n").filter(Boolean);

const lines = [];
lines.push(previous ? `Changes since ${previous}:` : "Changes:", "");
for (const s of subjects.length ? subjects : ["(no change in the code)"]) lines.push(`- ${s}`);
lines.push("");
let footer = "Windows: Ozimut-Chrono-Setup.exe installs and keeps itself up to date; the portable program and the macOS app tell you when a new version exists.";
if (!signedWin && !signedMac) footer += " Not signed yet: Windows SmartScreen and macOS Gatekeeper will warn.";
else if (!signedWin) footer += " The Windows files are not signed yet: Windows SmartScreen will warn.";
else if (!signedMac) footer += " The macOS app is not signed yet: macOS Gatekeeper will warn.";
lines.push(footer);
process.stdout.write(lines.join("\n") + "\n");
