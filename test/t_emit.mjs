// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
// distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

// node test/t_emit.mjs — Emit: the 250 reader's and the MTR4's bytes (codec, stream decoder), the text messages
// of the eScan's family, the reader, the simulator.
// No hardware, and no captured data: the facts of docs/emit.md only. Every 250 frame and MTR4 message here is made in this
// file for invented cards, units and times — built byte by byte from the documented layout, its check bytes computed from
// the documented rules (one head check also worked out by hand, below) —, then decoded and checked against the values put
// in, and encoded again by the code's own encoders to the same bytes; the encoders are then checked on random cards.
// The text messages are the two examples Emit prints in its eClock+ manual, chapter 11 (emit.no, eClock-ver.-1.02-eng.pdf),
// with a tab between their items as the manual says, and the serial number the eScan2 manual shows on its display.
import { XOR_250, LEN_250, LEN_MTR_CARD, LEN_MTR_STATUS, SERIAL, CODE, isReaderCode, Decoder, encodeCard250, decodeCard250, encodeMtrCard,
  encodeMtrStatus, decodeMtr, mtrCommand, readMtrCommand, punchesOf, raceSpan, cardText, stampOf, SERIAL_ESCAN, serialOf, USB, USB_ESCAN, unitOfUsb, MAX_TEXT,
  decodeText, encodeText, encodeTextStatus, encodeTextTag, clockText } from "../src/emit/protocol.js";
import { openReader, kindOfPort } from "../src/emit/reader.js";
import { simReader } from "../src/emit/sim.js";

let fails = 0, n = 0;
const ok = (cond, what) => { n++; if (!cond) fails++; console.log(cond ? "ok  " : "FAIL", what); };
const eq = (a, b, what) => { const x = JSON.stringify(a), y = JSON.stringify(b); ok(x === y, x === y ? what : `${what}: ${x} != ${y}`); };
const rep = (values, times) => Array.from({ length: times }, () => values).flat();
const bytes = (...parts) => Uint8Array.from(parts.flat());
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const sum = (b, from, to) => b.slice(from, to).reduce((s, x) => s + x, 0) & 255;
const cat = (...arrays) => bytes(...arrays.map((a) => Array.from(a)));
const tick = () => new Promise((r) => setTimeout(r, 0));
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const chunks = (b, rnd, max = 40) => { const out = []; for (let i = 0; i < b.length;) { const k = 1 + Math.floor(rnd() * max); out.push(b.slice(i, i + k)); i += k; } return out; };
const feed = (dec, parts) => parts.flatMap((p) => dec.push(p));
const P = (list) => list.map(([code, t]) => ({ code, t }));

// ---- frames built here, byte by byte, from the layout of docs/emit.md (independent of protocol.js's encoders)
const le = (v, n) => Array.from({ length: n }, (_, i) => Math.floor(v / 256 ** i) % 256);          // LSB first
const negSum = (list) => (256 - (list.reduce((a, x) => a + x, 0) % 256)) % 256;                    // what makes a sum 0 mod 256
const placeBytes = (list) => { const b = list.flatMap(([code, t]) => [code, ...le(t, 2)]); return [...b, ...rep([0], 150 - b.length)]; };
const textBytes = (chars, tail = []) => { const b = [...Array.from(chars, (c) => c.charCodeAt(0)), ...tail]; return [...b, ...rep([0x20], 56 - b.length)]; };
/** A 250's frame: FF FF · card (3) · 0 · week · year · 0 · head check · 50 places · 56 text · check; every byte XOR 0xDF. */
function hand250({ card, week, year, places, text }) {
  const head = [...le(card, 3), 0, week, year, 0];
  const plain = [0xff, 0xff, ...head, negSum(head), ...placeBytes(places), ...text];
  return bytes([...plain, negSum(plain)].map((x) => x ^ 0xdf));
}
/** An MTR4's « M »: FF×4 · 230 · 'M' · unit (2) · y m d h m s · ms (2) · package (4) · card (3) · week · year · head check · places · text · check · 0. */
function handMtrCard({ unit, stamp: [y, mo, d, h, mi, sec], pack, card, week, year, places, text }) {
  const head = [...le(card, 3), week, year];
  const m = [255, 255, 255, 255, 230, 0x4d, ...le(unit, 2), y % 100, mo, d, h, mi, sec, 0, 0, ...le(pack, 4), ...head, negSum(head), ...placeBytes(places), ...text];
  return bytes([...m, m.reduce((a, x) => a + x, 0) % 256, 0]);
}
/** An MTR4's « S »: FF×4 · 55 · 'S' · unit (2) · y m d h m s · ms (2) · battery · last package (4) · oldest (4) · 8 sessions (4 each) · check · 0. */
function handMtrStatus({ unit, stamp: [y, mo, d, h, mi, sec], battery, recent, oldest, sessions }) {
  const m = [255, 255, 255, 255, 55, 0x53, ...le(unit, 2), y % 100, mo, d, h, mi, sec, 0, 0, battery, ...le(recent, 4), ...le(oldest, 4), ...sessions.flatMap((v) => le(v, 4))];
  return bytes([...m, m.reduce((a, x) => a + x, 0) % 256, 0]);
}
// an invented card: card 305419 (0x04A90B), made in week 41 of 2026; a race, then readings whose times do not follow on
const CARD = 305419, RACE = [[0, 0], [31, 142], [45, 388], [52, 611], [38, 905], [61, 1130], [47, 1422], [59, 1687], [100, 1904],
  [250, 1931], [250, 5120], [250, 2210], [250, 3]];
const TEXT_250 = textBytes(cardText({ name: "EMIT EPT SYS VER 2", disp: "", s: 4, p: 2, l: 9 }));
const TEXT_FF00 = textBytes("Emit EPT V5.02", rep([0xff, 0x00], 21));        // a text that ends with FF 00 FF 00… after its name
const STAMP_S = [2026, 11, 21, 8, 15, 42], STAMP_M = [2026, 11, 21, 9, 47, 5];
const SESSIONS = [3000000101, 3000000077, 3000000040, 3000000012, 3000000001, 0, 0, 0];
const HAND_STATUS = handMtrStatus({ unit: 2718, stamp: STAMP_S, battery: 0, recent: 3000000123, oldest: 3000000001, sessions: SESSIONS });
const HAND_MTR_CARD = handMtrCard({ unit: 2718, stamp: STAMP_M, pack: 3000000124, card: CARD, week: 41, year: 26, places: [...RACE, [250, 12]], text: TEXT_FF00 });
const HAND_250 = hand250({ card: CARD, week: 41, year: 26, places: RACE, text: TEXT_250 });

console.log("-- check bytes");
eq([CARD % 256, (CARD >> 8) % 256, CARD >> 16], [11, 169, 4], "card 305419 = 0x04A90B: 11, 169, 4, LSB first");
eq((11 + 169 + 4 + 0 + 41 + 26 + 0 + 5) % 256, 0, "by hand: head 11 169 4 0 41 26 0, check byte 5 (251 + 5 = 256)");
eq([HAND_250[9] ^ 0xdf, HAND_MTR_CARD[25]], [5, 5], "the frames built here carry that head check, 5, in the 250 frame and in the MTR message");
eq(63 + 180 * 256 + 150 * 65536, 9876543, "another card, by hand: 63 180 150 LSB first is 9876543");
eq([63, 180, 150, 52, 99, 224].reduce((a, x) => a + x, 0) % 256, 0, "… made in week 52 of '99: its MTR head check is 224 (544 + 224 = 768)");
eq(encodeMtrCard({ id: 1, stamp: { y: 2026, mo: 1, d: 1, h: 0, mi: 0, s: 0 }, card: 9876543, week: 52, year: 99, punches: [] })[25], 224, "… which the encoder writes too");
const w = encodeCard250({ card: CARD, week: 41, year: 26, punches: [] });
eq([w.length, w[0], w[1], XOR_250], [217, 0x20, 0x20, 0xdf], "250: 217 bytes, FF FF travels as two spaces (XOR 0xDF)");
eq(Array.from(w.slice(2, 10), (x) => x ^ 0xdf), [11, 169, 4, 0, 41, 26, 0, 5], "250: the encoder's head is the one worked out by hand");
eq(sum(Array.from(w, (x) => x ^ 0xdf), 0, 217), 0, "250: the 217 bytes sum to 0 mod 256");
const m0 = encodeMtrCard({ id: 7, stamp: { y: 2026, mo: 11, d: 17, h: 10, mi: 0, s: 0 }, pack: 1, card: CARD, week: 41, year: 26, punches: [] });
eq([m0.length, m0[4], m0[5], m0[25], m0[233]], [234, 230, 0x4d, 5, 0], "MTR card: 234 bytes, size 230, « M », head check 5, a 0 to end");
eq(m0[232], sum(m0, 0, 232), "MTR card: check byte = sum of all before it, preamble included");
eq([HAND_250.length, HAND_MTR_CARD.length, HAND_STATUS.length], [217, 234, 59], "the frames built here have the documented lengths");

console.log("-- an MTR4 status built here");
eq([HAND_STATUS.length, LEN_MTR_STATUS], [59, 59], "59 bytes");
const rs = decodeMtr(HAND_STATUS);
eq([rs.kind, rs.type, rs.id, rs.date, rs.clock, rs.lowBattery], ["mtr", "status", 2718, "2026-11-21", 8 * 3600 + 15 * 60 + 42, false], "its number, day, clock, battery");
eq([rs.recent, rs.oldest, rs.sessions], [3000000123, 3000000001, SESSIONS], "package numbers, LSB first");
ok(same(encodeMtrStatus(rs), HAND_STATUS), "encoded again: the same 59 bytes");
const lowBat = Uint8Array.from(HAND_STATUS); lowBat[16] = 1; lowBat[57] = (lowBat[57] + 1) & 255;
eq([decodeMtr(lowBat).lowBattery, decodeMtr(HAND_STATUS.map((x, i) => (i === 16 ? 1 : x))).code], [true, "checksum"], "battery byte 1: low; changed without its check byte: refused");

console.log("-- an MTR4 card message built here");
eq([HAND_MTR_CARD.length, LEN_MTR_CARD], [234, 234], "234 bytes");
const rc = decodeMtr(HAND_MTR_CARD);
eq([rc.kind, rc.type, rc.id, rc.date, rc.readAt, rc.pack], ["mtr", "card", 2718, "2026-11-21", 9 * 3600 + 47 * 60 + 5, 3000000124], "unit, day, clock at the read, package (the status's last + 1)");
eq([rc.card, rc.week, rc.year, rc.headOk, rc.text, rc.counters], [CARD, 41, 26, true, "Emit EPT V5.02", null], "card, production, head check, text up to the FF 00 pattern, no counters");
eq(rc.punches, P([...RACE, [250, 12]]), "its 14 places");
ok(same(encodeMtrCard(rc), HAND_MTR_CARD), "encoded again: the same 234 bytes");
eq(raceSpan(rc.punches), { zero: 0, finish: 8, reader: 9, live: false }, "Emit's rule: start 0, last control 100 at 1904 s, first reading at 1931 s, read again since");
const badHeadM = Uint8Array.from(HAND_MTR_CARD); badHeadM[20] ^= 1; badHeadM[232] = sum(badHeadM, 0, 232);
eq([decodeMtr(badHeadM).kind, decodeMtr(badHeadM).headOk], ["mtr", false], "a card number damaged on the card, the message's own check redone: head check failed");

console.log("-- a 250 frame built here (the same card, an earlier reading)");
eq([HAND_250.length, LEN_250], [217, 217], "217 bytes");
const r2 = decodeCard250(HAND_250);
eq([r2.kind, r2.card, r2.week, r2.year, r2.text, r2.counters], ["card250", CARD, 41, 26, cardText({ name: "EMIT EPT SYS VER 2", disp: "", s: 4, p: 2, l: 9 }).trimEnd(), { s: 4, p: 2, l: 9 }],
  "card, production, text and its counters S P L");
eq(r2.punches, P(RACE), "its 13 places: the MTR's less one reading");
ok(same(encodeCard250(r2), HAND_250), "encoded again: the same 217 bytes");

console.log("-- another invented card");
const codes = [0, 41, 57, 44, 63, 70, 33, 41, 58, 99, 66, 100, 250, 250];
const times = [0, 71, 290, 455, 604, 812, 1015, 1270, 1388, 1388, 1561, 1702, 1716, 402];
const pk = { card: 412233, week: 7, year: 19, punches: codes.map((code, i) => ({ code, t: times[i] })), text: cardText({ name: "EMIT EPT SYS VER 2", disp: "", s: 12, p: 3, l: 40 }) };
const dk = decodeCard250(encodeCard250(pk));
eq([dk.card, dk.week, dk.year, dk.punches, dk.counters], [pk.card, 7, 19, pk.punches, { s: 12, p: 3, l: 40 }], "encoded and decoded: number, production, 14 places (a 99 mark among them), counters S P L");
eq(dk.text.slice(0, 18), "EMIT EPT SYS VER 2", "its name");
const sp = raceSpan(dk.punches);
eq([sp, dk.punches[sp.finish]], [{ zero: 0, finish: 11, reader: 12, live: false }, { code: 100, t: 1702 }], "Emit's rule: the race ends at 100 (1702 s), read at 1716 s, read again later");
eq(raceSpan(P([[0, 0], [31, 60], [100, 300], [250, 312]])), { zero: 0, finish: 2, reader: 3, live: true }, "a first read: its reading punch is the last");
eq(raceSpan(P([[0, 0], [31, 60], [250, 80], [0, 0], [32, 50], [100, 90], [251, 99], [250, 4]])), { zero: 3, finish: 5, reader: 6, live: false }, "two races on a card: the last start, the first reading after it");
eq(raceSpan(P([[31, 60], [32, 90]])), { zero: -1, finish: 1, reader: -1, live: false }, "no start, no reading");
eq([isReaderCode(249), isReaderCode(250), isReaderCode(253), isReaderCode(254), CODE.START, CODE.LOW_BATTERY], [false, true, true, false, 0, 99], "codes: 250-253 read, 0 starts, 99 marks a low battery");
eq(punchesOf([[0, 0], [31, 5], [0, 0], [32, 9], [0, 0], [0, 0]]), P([[0, 0], [31, 5], [0, 0], [32, 9]]), "empty places dropped at the end only");

console.log("-- round trips");
const rnd = rng(20261117);
let good = true;
for (let k = 0; k < 200; k++) {
  const np = Math.floor(rnd() * 51), punches = [];
  for (let i = 0; i < np; i++) punches.push({ code: i === np - 1 ? 1 + Math.floor(rnd() * 255) : Math.floor(rnd() * 256), t: Math.floor(rnd() * 65536) });
  const spec = { card: Math.floor(rnd() * 0x1000000), week: 1 + Math.floor(rnd() * 53), year: Math.floor(rnd() * 100), punches,
    text: cardText({ name: `CARD ${k}`, s: Math.floor(rnd() * 9999), p: Math.floor(rnd() * 9999), l: Math.floor(rnd() * 9999) }) };
  const a = decodeCard250(encodeCard250(spec));
  const stamp = { y: 1990 + Math.floor(rnd() * 64), mo: 1 + Math.floor(rnd() * 12), d: 1 + Math.floor(rnd() * 28), h: Math.floor(rnd() * 24), mi: Math.floor(rnd() * 60), s: Math.floor(rnd() * 60) };
  const b = decodeMtr(encodeMtrCard({ ...spec, id: Math.floor(rnd() * 65536), stamp, pack: Math.floor(rnd() * 4294967296) }));
  for (const x of [a, b]) if (JSON.stringify([x.card, x.week, x.year, x.punches, x.text]) !== JSON.stringify([spec.card, spec.week, spec.year, spec.punches, spec.text.trimEnd()])) good = false;
  if (JSON.stringify(b.stamp) !== JSON.stringify(stamp) || !b.headOk || b.readAt !== stamp.h * 3600 + stamp.mi * 60 + stamp.s) good = false;
}
ok(good, "200 random cards through both encoders and back (0-50 places, every code, times to 65535, years 1990-2053)");
const st0 = { id: 4711, stamp: { y: 2026, mo: 11, d: 17, h: 9, mi: 58, s: 7 }, lowBattery: true, recent: 2040, oldest: 1, sessions: [2001, 1500, 3, 0, 0, 0, 0, 0] };
const st1 = decodeMtr(encodeMtrStatus(st0));
eq([st1.id, st1.stamp, st1.lowBattery, st1.recent, st1.oldest, st1.sessions], [4711, st0.stamp, true, 2040, 1, st0.sessions], "a status through the encoder and back");
let threw = "";
try { encodeCard250({ card: 1, punches: Array.from({ length: 51 }, () => ({ code: 31, t: 1 })) }); } catch (e) { threw = e.code; }
eq(threw, "slots", "51 places refused");
eq(decodeCard250(HAND_250.slice(0, 200)).code, "length", "a short frame is no frame");

console.log("-- MTR commands");
eq(Array.from(mtrCommand("setClock", { y: 2027, mo: 3, d: 14, h: 15, mi: 9, s: 26 })), [47, 83, 67, 27, 3, 14, 15, 9, 26], "/SC + year (two digits), month, day, hour, minute, second; no terminator");
eq(Array.from(mtrCommand("status")), [47, 83, 84], "/ST");
eq(Array.from(mtrCommand("spoolFrom", 3000000123)), [47, 83, 66, 123, 94, 208, 178], "/SB + package number, LSB first (3000000123 = 0xB2D05E7B)");
eq(Array.from(mtrCommand("getOne", 258)), [47, 71, 66, 2, 1, 0, 0], "/GB + package number");
eq([mtrCommand("spoolAll"), mtrCommand("newSession"), mtrCommand("clear")].map((b) => String.fromCharCode(...b)), ["/SA", "/NS", "/CL"], "/SA, /NS, /CL");
eq(readMtrCommand(mtrCommand("spoolFrom", 77)), { name: "spoolFrom", arg: 77, size: 7 }, "a command read back");
eq([readMtrCommand(bytes([47, 83])), readMtrCommand(bytes([47, 83, 67, 26, 11])), readMtrCommand(bytes([47, 88, 88])), readMtrCommand(bytes([1, 2, 3]))], [undefined, undefined, null, null], "half a command waits, an unknown one is none");

console.log("-- the stream decoder");
const A = encodeCard250({ card: 111111, week: 10, year: 20, punches: P([[0, 0], [31, 100], [32, 200], [100, 300], [250, 310]]), text: cardText({ s: 1, p: 2, l: 3 }) });
const B = encodeCard250({ card: 222222, week: 11, year: 21, punches: P([[0, 0], [41, 90], [250, 95]]), text: cardText() });
const stamp = { y: 2026, mo: 11, d: 17, h: 10, mi: 42, s: 7 };
const M = encodeMtrCard({ id: 9, stamp, pack: 5, card: 333333, week: 12, year: 22, punches: P([[0, 0], [51, 70], [250, 77]]), text: cardText() });
const S = encodeMtrStatus({ id: 9, stamp, recent: 5, oldest: 1, sessions: [1] });
const kinds = (items) => items.map((x) => (x.kind === "error" ? `error:${x.code}` : x.kind === "mtr" ? `mtr:${x.type}:${x.card ?? x.id}` : `card250:${x.card}`));
eq(kinds(feed(new Decoder({ kind: "250" }), Array.from(cat(A, B, A), (x) => bytes([x])))), ["card250:111111", "card250:222222", "card250:111111"], "250: three frames, one byte at a time");
eq(kinds(feed(new Decoder({ kind: "mtr4" }), chunks(cat(S, M, M, S), rnd))), ["mtr:status:9", "mtr:card:333333", "mtr:card:333333", "mtr:status:9"], "MTR: status and cards in chunks of any size");
const bad = Uint8Array.from(A); bad[50] ^= 0x10;
eq(kinds(feed(new Decoder({ kind: "250" }), chunks(cat(bad, A, B), rnd))), ["error:checksum", "card250:111111", "card250:222222"], "250: a damaged frame costs that frame only, said once");
const badHead = Uint8Array.from(A); badHead[3] ^= 0x01;
eq(feed(new Decoder({ kind: "250" }), [badHead])[0], { kind: "error", code: "checksum", sys: "250", part: "head" }, "250: a wrong card number is told from a wrong transfer");
eq(kinds(feed(new Decoder({ kind: "250" }), chunks(cat(A.slice(0, 120), A, bytes([1, 2, 3, 0x20, 0x20, 9]), B), rnd))), ["error:checksum", "card250:111111", "error:sync", "card250:222222"], "250: a frame cut short, then noise between frames");
eq(kinds(feed(new Decoder({ kind: "250" }), chunks(cat(A.slice(1), B), rnd))), ["error:sync", "card250:222222"], "250: a frame missing its first byte");
const badM = Uint8Array.from(M); badM[100] ^= 0x80;
eq(kinds(feed(new Decoder({ kind: "mtr4" }), chunks(cat(bytes([255, 255, 255, 255, 255]), badM, bytes([7, 255, 255]), M, S), rnd))), ["error:sync", "mtr:card:333333", "mtr:status:9"], "MTR: extra FF, a damaged message, noise: in step again at the next preamble");
const auto1 = new Decoder();
eq([kinds(feed(auto1, chunks(cat(bytes([0, 255, 255, 255, 255, 1]), A, B), rnd))), auto1.kind], [["error:sync", "card250:111111", "card250:222222"], "250"], "auto: a 250 found (its text's spaces travel as FF FF FF FF…: no MTR preamble)");
const auto2 = new Decoder();
eq([kinds(feed(auto2, chunks(cat(S, M), rnd))), auto2.kind], [["mtr:status:9", "mtr:card:333333"], "mtr4"], "auto: an MTR found");
eq(kinds(feed(new Decoder(), chunks(cat(HAND_STATUS, HAND_MTR_CARD), rnd, 9))), ["mtr:status:2718", "mtr:card:305419"], "auto: the hand-built MTR4 messages in small chunks");
eq(kinds(feed(new Decoder(), chunks(cat(HAND_250, HAND_250), rnd, 9))), ["card250:305419", "card250:305419"], "auto: the hand-built 250 frame, twice, in small chunks");
const half = new Decoder({ kind: "250" });
eq([feed(half, [A.slice(0, 100)]).length, half.pending, half.reset(), half.pending, kinds(feed(half, [B]))], [0, 100, 100, 0, ["card250:222222"]], "half a frame waits; reset forgets it");

console.log("-- reader and simulator: a 250");
{
  let clock = 1_700_000_000_000;
  const cards = [], states = [], errors = [];
  const sim = simReader({ kind: "250", chunk: (b) => chunks(b, rnd, 23), repeat: 3 });
  const reader = openReader(sim.transport, { kind: "250", now: () => clock, onCard: (r) => cards.push(r), onState: (s) => states.push(s.state), onError: (e) => errors.push(e) });
  await tick();
  eq([sim.opened.baud, sim.opened.baudRate, sim.opened.stopBits, sim.opened.dataBits, sim.opened.parity], [9600, 9600, 2, 8, "none"], "opens at 9600 baud, 8 bits, no parity, 2 stop bits");
  eq([sim.written.length, typeof reader.setTime], [0, "undefined"], "sends nothing to a 250 and offers no clock");
  const course = P([[0, 0], [31, 95], [32, 250], [33, 410], [100, 600]]);
  sim.insert({ card: 501234, punches: course, week: 12, year: 17 });
  eq(cards.length, 1, "a card sent three times is one read");
  eq(Object.keys(cards[0]), ["sys", "card", "family", "start", "finish", "check", "clear", "punches", "rel", "at", "src", "week", "year", "text", "counters"], "the read's fields, design.md's first");
  eq([cards[0].sys, cards[0].card, cards[0].family, cards[0].start, cards[0].finish, cards[0].check, cards[0].clear, cards[0].rel, cards[0].at, cards[0].src],
    ["emit", 501234, "emit", null, null, null, null, true, clock, "250"], "sys, card, family, no start/finish/check/clear, rel, at");
  eq(cards[0].punches, [...course, { code: 250, t: 605 }], "punches: the card's places in order, raw, the reader's own punch last");
  eq(reader.info().on, 501234, "info: the card lying on the reader");
  clock += 400; sim.insert({ card: 501234, punches: course }, { tick: 1 });
  eq(cards.length, 1, "still lying there, its last time moving on: no new read");
  clock += 300; sim.insert({ card: 777, punches: P([[0, 0], [45, 30]]) }, { corrupt: 0 });
  eq([cards.length, cards[1]?.card, errors.map((e) => e.code)], [2, 777, ["checksum"]], "another card, its first frame damaged: one error, then the read from the repeat");
  ok(errors[0] instanceof Error && errors[0].message === "checksum" && errors[0].part === "sum", "errors are Errors with a code");
  clock += 500; sim.insert({ card: 888, punches: P([[0, 0]]) }, { corrupt: "all", repeat: 2 });
  eq([cards.length, errors.length], [2, 2], "every frame damaged: no read, one more error");
  clock += 5000; sim.insert({ card: 777, punches: P([[0, 0], [45, 30]]) });
  eq([cards.length, cards[2]?.card, cards[2]?.at], [3, 777, clock], "the same card put down again after the gap: a new read");
  clock += 3000; sim.insert({ card: 999, punches: P([[0, 0], [46, 12]]) }, { cut: 150, repeat: 1 });
  clock += 3000; sim.insert({ card: 1000, punches: P([[0, 0], [47, 15]]), raw: true }, { repeat: 1 });
  eq([cards.length, cards[3]?.card, cards[3]?.punches, errors.map((e) => e.code).slice(2)], [4, 1000, P([[0, 0], [47, 15]]), ["truncated"]], "a frame cut short and silence: dropped; the next card reads (raw: no reader punch added)");
  sim.noise(bytes([0x55, 0xaa, 0x20]));
  eq(errors.map((e) => e.code).slice(3), ["sync"], "noise is said once");
  eq([reader.info().kind, reader.info().cards, reader.info().open, states.slice(0, 3)], ["250", 4, true, ["open", "ready", "card"]], "info and states");
  await reader.close();
  eq([sim.closed, reader.info().open, states[states.length - 1]], [true, false, "closed"], "closed");
}

console.log("-- reader and simulator: an MTR4");
{
  let clock = new Date(2026, 10, 17, 10, 30, 0).getTime();
  const cards = [], states = [], errors = [];
  const sim = simReader({ kind: "mtr4", id: 4321, chunk: 17, now: () => clock });
  const reader = openReader(sim.transport, { kind: "mtr4", now: () => clock, onCard: (r) => cards.push(r), onState: (s) => states.push(s), onError: (e) => errors.push(e) });
  await tick();
  eq([sim.opened.baud, sim.opened.stopBits, sim.commands.map((c) => c.name)], [9600, 1, ["status"]], "opens at 9600 baud, 1 stop bit, and asks /ST");
  const s0 = states.find((s) => s.state === "status");
  eq([s0?.id, s0?.clock, s0?.skew, s0?.lowBattery, s0?.recent, reader.info().mtr?.id], [4321, 37800, 0, false, 0, 4321], "its status: number, clock, no skew, battery, nothing stored");
  clock += 65_000;
  sim.insert({ card: 240919, punches: P([[0, 0], [31, 103], [100, 240]]) });
  eq([cards.length, cards[0]?.card, cards[0]?.readAt, cards[0]?.readDate, cards[0]?.mtr, cards[0]?.src, cards[0]?.rel], [1, 240919, 37865, "2026-11-17", { id: 4321, pack: 1 }, "mtr4", true], "a card: the unit's clock at the read, its day, its package number");
  eq(cards[0].punches, P([[0, 0], [31, 103], [100, 240], [250, 245]]), "punches as on the card");
  sim.insert({ card: 240920, punches: P([[0, 0], [31, 99]]) }, { corrupt: 0 });
  eq([cards.length, errors.map((e) => e.code)], [1, ["checksum"]], "a damaged message: an error, no read");
  await reader.spool(1); await tick();
  eq([cards.length, cards[1]?.card, cards[1]?.mtr.pack, sim.commands[1]], [2, 240920, 2, { name: "spoolFrom", arg: 1, size: 7 }], "/SB 1: the lost read comes from the unit's memory, the first is not given twice");
  await reader.spool(); await tick();
  eq([cards.length, sim.commands[2].name], [2, "spoolAll"], "/SA: nothing new");
  await reader.setTime(new Date(2026, 10, 17, 12, 0, 0)); await tick();
  const s1 = states.filter((s) => s.state === "status").pop();
  eq([sim.commands.slice(3).map((c) => c.name), sim.commands[3].arg, s1.clock, s1.skew], [["setClock", "status"], { y: 2026, mo: 11, d: 17, h: 12, mi: 0, s: 0 }, 43200, 43200 - 37865], "setTime: /SC then /ST, the clock moved");
  eq(reader.info().kind, "mtr4", "info");
  await reader.close();
}

console.log("-- reader: auto");
{
  const cards = [], states = [], errors = [];
  const sim = simReader({ kind: "mtr4", id: 12, chunk: 5 });
  const reader = openReader(sim.transport, { onCard: (r) => cards.push(r), onState: (s) => states.push(`${s.state}:${s.kind}`), onError: (e) => errors.push(e.code) });
  eq(reader.info().kind, null, "unknown at first");
  await tick();
  sim.insert({ card: 31, punches: P([[0, 0], [70, 44]]) });
  eq([sim.opened.stopBits, reader.info().kind, cards.length, states.slice(0, 3), typeof cards[0].readAt], [1, "mtr4", 1, ["open:null", "ready:mtr4", "status:mtr4"], "number"], "an MTR answers /ST: known, then its card");
  await reader.close();
  const sim2 = simReader({ kind: "250", chunk: 5 }), cards2 = [], errors2 = [];
  const reader2 = openReader(sim2.transport, { onCard: (r) => cards2.push(r), onError: (e) => errors2.push(e.code) });
  await tick();
  sim2.insert({ card: 32, punches: P([[0, 0], [70, 44]]) });
  eq([String.fromCharCode(...sim2.written[0]), reader2.info().kind, cards2.length, cards2[0].readAt], ["/ST", "250", 1, undefined], "a 250 says nothing to /ST: known by its first frame");
  eq([await reader2.setTime(), errors2], [false, ["unsupported"]], "no clock to set on a 250");
  await reader2.close();
  eq(errors, [], "no error on the way");
  const ports = Object.entries(SERIAL).map(([k, v]) => `${k}:${v.baudRate}/${v.stopBits}`);
  eq([ports, stampOf(new Date(2026, 0, 2, 3, 4, 5))], [["250:9600/2", "mtr4:9600/1", "auto:9600/1"], { y: 2026, mo: 1, d: 2, h: 3, mi: 4, s: 5 }], "line settings; a Date as the MTR's clock");
}

// ---- the text messages (eScan, eScan2, eClock+): Emit's own examples
const txt = (line) => bytes([2], Array.from(line, (c) => c.charCodeAt(0)), [3, 10, 13]);
const MANUAL_STATUS = txt("IeClock-HW2-SW2-V1.02\tBS\tZUSB\tW10:32:07.000\tM1\tC100\tY126099999\tH0x000\tA268-487-+235-80-26\tR99");
const MANUAL_TAG = txt("BM\tZUSB\tN4321321\tY126099999\tM1234\tC100\tE12:34:56.987\tT00:22:33.555\tO0\tR68");

console.log("-- text messages: the eClock+ manual's examples");
const ts = decodeText(MANUAL_STATUS);
eq([ts.kind, ts.type, ts.b, ts.via, ts.id, ts.name, ts.hw, ts.sw, ts.version], ["text", "status", "S", "USB", "eClock-HW2-SW2-V1.02", "eClock", "2", "2", "1.02"], "status: product, hardware, software, version, sent by USB");
eq([ts.clock, ts.msg, ts.code, ts.unit, ts.product, ts.loop, ts.power, ts.check], [10 * 3600 + 32 * 60 + 7, 1, 100, "126099999", "eClock+", "0x000", "268-487-+235-80-26", "99"], "status: clock, message number, code, serial number (1260: an eClock+), loop, power, R as written");
eq(ts.items.map(([k]) => k).join(""), "IBZWMCYHAR", "status: its ten items in order");
const tt = decodeText(MANUAL_TAG);
eq([tt.kind, tt.type, tt.b, tt.via, tt.card, tt.unit, tt.msg, tt.code, tt.t, tt.race, tt.retries, tt.check], ["text", "tag", "M", "USB", 4321321, "126099999", 1234, 100, 45296.987, 1353.555, 0, "68"],
  "emiTag message: tag, unit, message number, code, passing 12:34:56.987, the tag's race time 22:33.555, no retransmission");
ok(same(encodeTextStatus({ clock: 37927, msg: 1, code: 100, unit: "126099999", power: "268-487-+235-80-26", check: "99" }), MANUAL_STATUS), "the status encoded: the manual's bytes (02 … 03 0A 0D)");
ok(same(encodeTextTag({ card: 4321321, unit: "126099999", msg: 1234, code: 100, t: 45296.987, race: 1353.555, check: "68" }), MANUAL_TAG), "the emiTag message encoded: the manual's bytes");
const lap = decodeText(txt("BM\tZ485\tN4321321\tY126099999\tM7\tC90\tE09:00:01.250\tT00:10:00.000\tO2\tLAPnOla Nordmann\tLAPp3\tR12"));
eq([lap.type, lap.via, lap.t, lap.retries, lap.items.filter(([k]) => k.startsWith("LAP"))], ["tag", "485", 32401.25, 2, [["LAPn", "Ola Nordmann"], ["LAPp", "3"]]], "lap items (LAPn, LAPp) are kept beside the passing");
eq(decodeText(txt("BS\tZUSB\tW12:49:50.000\tC250\tY857200002")).product, "eScan2", "serial number 857200002 (the eScan2 manual's display): product 8572, an eScan2");
eq([decodeText(txt("BS\tC250\tY999900001")).product, decodeText(txt("BS\tIsomething")).name], [null, "something"], "an unknown product number names nothing; an I item of another shape is kept whole");
eq([decodeText(txt("BD\tN503806\tC250")).type, decodeText(txt("BM\tZUSB\tC250\tE12:00:00.000")).type, decodeText(txt("BM\tN12\tC250\tEsoon")).type, decodeText(txt("Qwhatever")).b],
  ["other", "other", "other", null], "anything else — another B, a passing without a tag or a time, no B at all — is « other »: nothing read in it");
eq([decodeText(MANUAL_TAG.slice(0, 20)).code, decodeText(bytes([2, 66, 77, 7, 78, 49, 3])).code, decodeText(bytes([2, 3])).code, decodeText(MANUAL_TAG.slice(0, -2)).type], ["sync", "sync", "length", "tag"],
  "no 03 at the end, a control byte inside, an empty frame: no message; the 0A 0D may be missing");
eq([clockText(45296.987), clockText(0), clockText(86399.9996)], ["12:34:56.987", "00:00:00.000", "24:00:00.000"], "times as the messages write them");
let refused = 0;
for (const items of [[["N", "1\t2"]], [["N", "1\n"]], [["n", "1"]], [["A", "x".repeat(MAX_TEXT)]]]) { try { encodeText(items); } catch (e) { if (e.code === "text") refused++; } }
eq(refused, 4, "the encoder refuses a tab or a control byte in a value, a key that is no capital letter, a message too long");

console.log("-- the stream decoder: text messages");
const OTHER = encodeText([["B", "D"], ["Z", "USB"], ["N", "503806"], ["Q", "some content this code does not know"]]);
const kindsT = (items) => items.map((x) => (x.kind === "error" ? `error:${x.code}` : x.kind === "text" ? `text:${x.type}:${x.card ?? x.unit ?? x.b}` : `${x.kind}:${x.card ?? x.id}`));
eq(kindsT(feed(new Decoder({ kind: "escan" }), chunks(cat(MANUAL_STATUS, MANUAL_TAG, OTHER, MANUAL_TAG), rnd, 11))), ["text:status:126099999", "text:tag:4321321", "text:other:D", "text:tag:4321321"],
  "escan: status, passing, an unknown message, in chunks of any size; the 0A 0D between them cost nothing");
eq(kindsT(feed(new Decoder({ kind: "escan" }), Array.from(cat(MANUAL_TAG, MANUAL_STATUS), (x) => bytes([x])))), ["text:tag:4321321", "text:status:126099999"], "escan: one byte at a time");
eq(kindsT(feed(new Decoder({ kind: "escan" }), chunks(cat(bytes([0x55, 0xaa]), MANUAL_TAG.slice(0, 30), MANUAL_STATUS, bytes([2, 3, 2, 0x31]), MANUAL_TAG), rnd, 9))), ["error:sync", "text:status:126099999", "error:sync", "text:tag:4321321"],
  "escan: noise, a message cut short by the next one's 02, an empty frame: said once each, in step again at the next 02");
const long = cat(bytes([2, 66]), bytes(rep([0x41], MAX_TEXT + 5)), bytes([3]));
eq(kindsT(feed(new Decoder({ kind: "escan" }), [long, MANUAL_TAG])), ["error:sync", "text:tag:4321321"], "escan: more than MAX_TEXT bytes without a 03 is no message");
const accent = cat(bytes([2]), bytes(Array.from("BM\tN77\tC90\tE08:00:00.000\tLAPnJos", (c) => c.charCodeAt(0))), bytes([0xe9, 3, 10, 13]));
eq([kindsT(feed(new Decoder({ kind: "escan" }), [accent])), kindsT(feed(new Decoder(), [accent]))], [["text:tag:77"], ["error:sync"]], "a name's accented letter passes under « escan », not under « auto » (plain ASCII there)");
const auto3 = new Decoder();
eq([kindsT(feed(auto3, chunks(cat(bytes([7, 7]), MANUAL_STATUS, MANUAL_TAG), rnd, 9))), auto3.kind], [["error:sync", "text:status:126099999", "text:tag:4321321"], "escan"], "auto: a text unit found, the 0A 0D passed over from then on");
const auto4 = new Decoder();
eq([kindsT(feed(auto4, chunks(cat(bytes([2, 66, 77, 9, 78, 1]), bytes([2, 65, 200, 3]), A, B), rnd))), auto4.kind], [["error:sync", "card250:111111", "card250:222222"], "250"], "auto: a 02 in noise does not hold up a 250's frames");
eq(kindsT(feed(new Decoder({ kind: "250" }), [MANUAL_TAG, A])), ["error:sync", "card250:111111"], "a 250 decoder takes no text message");
let badKind = "";
try { new Decoder({ kind: "escan2" }); } catch (e) { badKind = e.code; }
eq(badKind, "kind", "an unknown kind is refused");

console.log("-- USB ids and lines");
eq([unitOfUsb({ usbVendorId: 0x2047, usbProductId: 0x0300 }), unitOfUsb({ usbVendorId: 0x0403, usbProductId: 0x6001 }), unitOfUsb({ usbVendorId: 0x0403, usbProductId: 0x6015 }), unitOfUsb({ usbVendorId: 0x10c4, usbProductId: 0x800a }), unitOfUsb({}), unitOfUsb(undefined)],
  ["escan", "ftdi", "ftdi", null, null, null], "2047:0300 is the first eScan; an FTDI chip may be a 250, an MTR4, an eScan2; a SPORTident station is neither");
eq([kindOfPort({ usbVendorId: USB_ESCAN.vendorId, usbProductId: USB_ESCAN.productId }), kindOfPort({ usbVendorId: USB.vendorId, usbProductId: USB.productId }), kindOfPort({})], ["escan", "auto", "auto"], "the kind asked for a port: « escan » by its ids, else « auto »");
eq([serialOf("escan"), SERIAL_ESCAN.baudRate, serialOf("auto").baud, serialOf("250").stopBits, serialOf("nothing")], [{ baud: 115200, baudRate: 115200, dataBits: 8, parity: "none", stopBits: 1 }, 115200, 9600, 2, undefined],
  "an eScan's line: 115 200 bit/s, 8 bits, no parity, 1 stop bit; the others as before");

console.log("-- reader and simulator: a unit of the text messages (eScan, eScan2)");
{
  let clock = new Date(2026, 10, 17, 12, 34, 50).getTime();
  const cards = [], punches = [], states = [], errors = [];
  const sim = simReader({ kind: "escan", unit: "857200002", code: 250, chunk: 7, now: () => clock });
  const reader = openReader(sim.transport, { kind: "escan", now: () => clock, onCard: (r) => cards.push(r), onPunch: (p) => punches.push(p), onState: (s) => states.push(s), onError: (e) => errors.push(e) });
  await tick();
  eq([sim.opened.baud, sim.opened.baudRate, sim.opened.stopBits, sim.opened.parity, sim.written.length, typeof reader.setTime, typeof reader.spool], [115200, 115200, 1, "none", 0, "undefined", "undefined"],
    "opens at 115 200 baud, 1 stop bit; writes nothing to the unit; no clock to set, no memory to ask");
  eq([reader.info().kind, reader.info().model, reader.info().ready], ["escan", null, false], "info before anything is heard");
  sim.status();
  const s0 = states.find((s) => s.state === "status");
  eq([states.map((s) => s.state), s0?.serial, s0?.product, s0?.code, s0?.clock, s0?.skew, s0?.name, s0?.version, s0?.via], [["open", "ready", "status"], "857200002", "eScan2", 250, 45290, 0, "eClock", "1.02", "USB"],
    "its status: open, ready, then what it is — serial number, product, code, clock, no skew");
  eq([reader.info().model, reader.info().unit?.serial, reader.info().frames], ["eScan2", "857200002", 1], "info: the model by its serial number");
  eq(s0?.info, { model: "eScan2", serial: "857200002", code: 250, version: "1.02" }, "the status carries what a station shows of the reader: model, serial number, code");
  clock += 4000; sim.status(); clock += 4000; sim.status();
  eq([states.filter((s) => s.state === "status").length, reader.info().frames, reader.info().unit.clock], [1, 3, 45298], "the same status again: not told twice, its clock kept up to date");
  sim.status({ code: 251 });
  eq([states.filter((s) => s.state === "status").length, states[states.length - 1].code], [2, 251], "its code changed: told");
  clock += 2000;
  sim.tag({ card: 4161048, t: 45296.987, race: 3005 });
  eq(punches, [{ sys: "emit", card: 4161048, code: 250, t: 45296.987, s: 45296.987, at: clock, src: "escan", race: 3005, unit: "857200002", msg: 1, retries: 0 }], "an emiTag's passing goes to onPunch: tag, the unit's code, the time of day, the tag's race time");
  sim.tag({ card: 4161049, t: 45300.5, retries: 2 }, { repeat: 3 });
  eq([punches.length, punches[1]?.card, punches[1]?.retries, punches[1]?.race, reader.info().repeats, reader.info().punches, cards.length], [2, 4161049, 2, 0, 2, 2, 0], "the same passing sent three times is one punch; no card read comes of a passing");
  sim.text([["B", "D"], ["N", "503806"], ["Q", "a card's content, in a layout Emit has not published"]]);
  sim.text([["B", "D"], ["N", "503807"], ["Q", "another"]]);
  eq([errors.map((e) => [e.code, e.part, e.b]), reader.info().unread, cards.length, punches.length], [[["unsupported", "message", "D"]], 2, 0, 2], "a message of another kind is said once, counted, and never read: no card, no punch");
  ok(errors[0] instanceof Error && errors[0].message === "unsupported", "that error is an Error with a code");
  let thrown = "";
  try { sim.insert({ card: 503806, punches: P([[0, 0], [31, 60]]) }); } catch (e) { thrown = e.code; }
  eq(thrown, "unpublished", "the simulator makes up no card message for an eScan");
  sim.noise(bytes([0x00, 0x7f, 0x41]));
  eq(errors.map((e) => e.code).slice(1), ["sync"], "noise is said once");
  await reader.close();
  eq([sim.closed, states[states.length - 1].state], [true, "closed"], "closed");
}

console.log("-- reader: auto meets a text unit");
{
  const punches = [], states = [], errors = [];
  const sim = simReader({ kind: "escan", chunk: 5 });
  const reader = openReader(sim.transport, { onPunch: (p) => punches.push(p), onState: (s) => states.push(`${s.state}:${s.kind}`), onError: (e) => errors.push(e.code) });
  await tick();
  sim.status(); sim.tag({ card: 4321321, t: 100.25 });
  eq([sim.opened.baud, reader.info().kind, reader.info().model, states.slice(0, 3), punches.length, punches[0]?.t], [9600, "escan", "eClock+", ["open:null", "ready:escan", "status:escan"], 1, 100.25],
    "at the 250's speed (the first eScan is a USB CDC port: any speed suits it), known by its first message");
  eq([await reader.setTime(), errors], [false, ["unsupported"]], "no clock to set on it");
  await reader.close();
}

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
