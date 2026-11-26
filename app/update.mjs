// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
// distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

// Keeping the app up to date. A timing team's computers must all run the same version, and nobody thinks of updating
// before a race — so the app does it itself, without ever getting in a race's way:
//
//   - at start, then every six hours, it asks GitHub whether the repository's latest release is newer (one plain HTTPS
//     request; nothing about the computer, the user or the events is sent). Without Internet nothing happens.
//   - where the app can replace itself — the Windows app installed by its Setup, the Linux AppImage — the new version is
//     downloaded in the background (electron-updater, its SHA-512 checked against the release's latest.yml) and installed
//     WHEN THE APP IS CLOSED; « restart now » is offered, never forced: a card may be in a reader.
//   - elsewhere — the macOS app while it is not signed with a Developer ID, the Windows portable program — it only says a
//     new version exists and where to download it.
//   - Help › « Keep Chronoz up to date » switches it off (settings.json `updates: false`).
//
// The state — `{ status, version, how, percent }`, status "off" | "idle" | "checking" | "current" | "available" |
// "downloading" | "ready" | "error" — goes to `say(state)`: the menu, and the pages through the hub's /hub/info.

import { createRequire } from "node:module";

export const RELEASES = "https://github.com/kerkia/Chronoz/releases";
const INFO = `${RELEASES}/latest/download/chrono-app.json`;
const EVERY = 6 * 3600 * 1000;

/** Whether version `a` is newer than `b` (numbers by dots; a pre-release suffix counts for nothing). */
export function newer(a, b) {
  const n = (v) => String(v || "").split("-")[0].split(".").map((x) => Number.parseInt(x, 10) || 0);
  const x = n(a), y = n(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
  return false;
}

/** How this copy of the app can be updated: "auto" (it replaces itself), "notice" (it says so), "none" (run from source). */
export function howOf({ packaged, platform = process.platform, env = process.env }) {
  if (!packaged) return "none";
  if (platform === "win32") return env.PORTABLE_EXECUTABLE_DIR ? "notice" : "auto";
  if (platform === "linux") return env.APPIMAGE ? "auto" : "notice";
  return "notice";
}

/**
 * `app`: Electron's; `enabled()`: the setting; `say(state)`: every change; `fetchJson(url)`: for the tests.
 * Returns `{ state(), check(), install(), stop() }`.
 */
export function startUpdates({ app, enabled = () => true, say = () => {}, fetchJson, updater } = {}) {
  const version = app.getVersion(), how = howOf({ packaged: app.isPackaged });
  let st = { status: how === "none" ? "off" : "idle", version: "", how, percent: 0 }, timer = null, au = null;
  const set = (o) => { st = { ...st, ...o }; try { say({ ...st }); } catch (e) { /* the listener's own trouble */ } };
  const get = fetchJson || (async (url) => {
    const r = await fetch(url, { redirect: "follow", headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

  if (how === "auto") {
    try {
      au = updater || createRequire(import.meta.url)("electron-updater").autoUpdater;
      au.autoDownload = true;
      au.autoInstallOnAppQuit = true;
      au.allowDowngrade = false;
      au.logger = null;
      au.on("update-available", (i) => set({ status: "downloading", version: i?.version || "", percent: 0 }));
      au.on("update-not-available", () => set({ status: "current", version: "" }));
      au.on("download-progress", (p) => set({ status: "downloading", percent: Math.round(p?.percent || 0) }));
      au.on("update-downloaded", (i) => set({ status: "ready", version: i?.version || st.version, percent: 100 }));
      au.on("error", () => { if (st.status !== "ready") set({ status: "error" }); });
    } catch (e) { au = null; }
  }

  async function check() {
    if (how === "none") return st;
    if (!enabled()) { set({ status: "off" }); return st; }
    if (st.status === "ready" || st.status === "downloading" || st.status === "checking") return st;
    set({ status: "checking" });
    try {
      if (au) await au.checkForUpdates();                    // the events above carry on from here
      else {
        const info = await get(INFO);
        set(newer(info?.version, version) ? { status: "available", version: String(info.version) } : { status: "current", version: "" });
      }
    } catch (e) { set({ status: "error" }); }               // no Internet at the arena: the usual case, said nowhere
    if (st.status === "checking") set({ status: "current" });
    return st;
  }

  if (how !== "none") {
    setTimeout(() => { check(); }, 8000);
    timer = setInterval(() => { check(); }, EVERY);
    timer.unref?.();
  }
  return {
    state: () => ({ ...st }),
    check,
    /** Restart on the new version now (only once it is downloaded); false when there is nothing to install. */
    install() { if (!au || st.status !== "ready") return false; setImmediate(() => au.quitAndInstall(false, true)); return true; },
    stop() { clearInterval(timer); },
  };
}
