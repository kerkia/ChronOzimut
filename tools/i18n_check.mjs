// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
// distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

// npm run check — the catalogues src/i18n/<lang>.js against each other and against the code. Plain Node, no dependency.
//
// Fails (exit 1, one problem a line) when:
//   - a key of fr.js (the reference) is missing in another language, or another language has a key fr.js lacks;
//   - a key's {placeholders} differ from one language to another;
//   - a plural family is incomplete (`x.one` without `x.other`);
//   - the code names a key that does not exist: t("…") and tn("…") with a literal key in src/**/*.js and app/www/
//     (tn's key is a family: `key.other` must exist);
//   - French typography: in fr.js, « : ; ? ! » after an ordinary space, or « » without no-break spaces inside.
// Warns (no failure) of keys nothing in the code could produce: no literal use, no string literal equal to the key, and no
// run-time key (a template with ${…}) whose constant start is a prefix of it. Keys built at run time are counted, not checked.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["fr", "en", "de", "es"];
const problems = [], warnings = [];

// ---- the catalogues ----
const cat = {};
for (const l of LANGS) {
  const file = path.join(root, "src", "i18n", `${l}.js`);
  try { cat[l] = (await import(pathToFileURL(file).href)).default; } catch (e) { problems.push(`${l}.js: cannot be read (${e.message})`); cat[l] = {}; }
  for (const [k, v] of Object.entries(cat[l])) if (typeof v !== "string") problems.push(`${l}.js: « ${k} » is not a text`);
}
const FR = cat.fr;

for (const l of LANGS.slice(1)) {
  for (const k of Object.keys(FR)) if (!(k in cat[l])) problems.push(`${l}.js: missing « ${k} »`);
  for (const k of Object.keys(cat[l])) if (!(k in FR)) problems.push(`${l}.js: « ${k} » is not in fr.js`);
}

const holes = (s) => [...new Set([...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort().join(",");
for (const k of Object.keys(FR)) {
  const ref = holes(FR[k]);
  for (const l of LANGS.slice(1)) {
    if (!(k in cat[l])) continue;
    const h = holes(cat[l][k]);
    if (h !== ref) problems.push(`${l}.js: « ${k} » has placeholders {${h}}, fr.js {${ref}}`);
  }
}

for (const l of LANGS) {
  for (const k of Object.keys(cat[l])) {
    const m = /^(.+)\.one$/.exec(k);
    if (m && !(`${m[1]}.other` in cat[l])) problems.push(`${l}.js: « ${k} » without « ${m[1]}.other »`);
  }
}

// ---- French typography ----
const NBSP = /[  ]/;
for (const [k, v] of Object.entries(FR)) {
  // what is not prose is left out: placeholders, addresses, tags and their attributes
  const s = v.replace(/\{\w+\}/g, "X").replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, "URL").replace(/<[^>]*>/g, "");
  const bad = [];
  if (/ [:;?!]/.test(s)) bad.push("an ordinary space before « : ; ? ! »");
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "«" && i + 1 < s.length && !NBSP.test(s[i + 1])) { bad.push("« not followed by a no-break space"); break; }
  }
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "»" && i > 0 && !NBSP.test(s[i - 1])) { bad.push("» not preceded by a no-break space"); break; }
  }
  for (const b of bad) problems.push(`fr.js: « ${k} »: ${b}`);
}

// ---- the code ----
function files(dir, out = []) {
  let list = [];
  try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const d of list) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) files(p, out);
    else if (/\.(m?js|cjs|html)$/.test(d.name)) out.push(p);
  }
  return out;
}
const code = [...files(path.join(root, "src")).filter((f) => !f.includes(`${path.sep}i18n${path.sep}`)), ...files(path.join(root, "app", "www"))];

const used = new Set(), prefixes = new Set(), literals = new Set();
let dynamic = 0;
// t("key", …) / tn('key', …) / t(`key`) / t(`prefix.${x}`), not obj.t( nor set( nor at(
const CALL = /(?<![\w$.])(tn?)\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`)/g;
const STRING = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
for (const f of code) {
  const text = fs.readFileSync(f, "utf8"), rel = path.relative(root, f).split(path.sep).join("/");
  for (const m of text.matchAll(CALL)) {
    const fn = m[1], key = m[2] ?? m[3] ?? m[4];
    if (m[4] !== undefined && key.includes("${")) {
      dynamic++;
      const start = key.slice(0, key.indexOf("${"));
      prefixes.add(start);
      continue;
    }
    if (!/^[\w.-]+$/.test(key)) continue;               // not a key (a call of some other t)
    if (fn === "tn") {
      used.add(`${key}.one`); used.add(`${key}.other`);
      if (!(`${key}.other` in FR)) problems.push(`${rel}: tn("${key}") — no « ${key}.other » in fr.js`);
    } else {
      used.add(key);
      if (!(key in FR)) problems.push(`${rel}: t("${key}") — no such key in fr.js`);
    }
  }
  for (const m of text.matchAll(STRING)) {
    const s = m[1] ?? m[2] ?? m[3];
    if (m[3] !== undefined && s.includes("${")) {
      const p = s.slice(0, s.indexOf("${"));
      if (/^[a-z][\w-]*\.[\w.-]*$/i.test(p)) prefixes.add(p);     // only what looks like the start of a key
      continue;
    }
    if (/^[\w-]+(\.[\w-]+)+$/.test(s)) literals.add(s);
  }
}

const reachable = (k) => {
  if (used.has(k) || literals.has(k)) return true;
  const fam = k.replace(/\.(one|other)$/, "");
  if (fam !== k && (literals.has(fam) || used.has(`${fam}.other`))) return true;
  for (const p of prefixes) if (p && k.startsWith(p)) return true;
  return false;
};
const unused = Object.keys(FR).filter((k) => !reachable(k));
for (const k of unused) warnings.push(`unused? « ${k} » (no literal use, no run-time key could produce it)`);

for (const w of warnings) console.log(`warning: ${w}`);
for (const p of problems) console.log(`error: ${p}`);
console.log(`i18n: ${Object.keys(FR).length} keys × ${LANGS.length} languages, ${used.size} named by the code, not checked: ${dynamic} (built at run time), `
  + `${unused.length} unused?, ${problems.length} problem${problems.length === 1 ? "" : "s"}${problems.length ? "" : " — ok"}`);
process.exit(problems.length ? 1 : 0);
