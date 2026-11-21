# Privacy

This program will not transfer any information to other networked systems unless specifically requested by the user or
the person installing or operating it.

This page says what Ozimut Chrono keeps, where, and what it sends on a network. It describes the desktop application built
from this repository. The « Chrono » tab of ozimut.com, which embeds the same screens, is governed by ozimut.com's own
privacy page.

## What stays on the computer

- **The events**: one journal per event, `<event>.ozchrono.jsonl`, in the folder `Documents/Ozimut Chrono` (or the folder
  named in `settings.json`). Every operation is appended to it as it happens. Beside them, `hub.json` keeps this computer's
  identity on the local network, the event opened last, the event codes typed to join an event and the addresses of other
  computers added by hand.
- **The settings**: `settings.json` in the per-user application-data folder « Ozimut Chrono » (`%APPDATA%\Ozimut Chrono` on
  Windows, `~/Library/Application Support/Ozimut Chrono` on macOS, `~/.config/Ozimut Chrono` on Linux): the app's key (the
  one phones and other computers are asked for), the data folder when it is not the usual one, the folder files were last
  saved to, the serial port chosen for each use, whether updates are checked.
- **The page's own storage**, in the same folder: the window is a web page, and it keeps a copy of the events in its
  browser database (IndexedDB), the language, theme, devices and station name chosen, and the card numbers remembered by Close for the next race.
- **Files you export** (results, start lists, event files) go where you save them.

An event holds what an organiser puts in it: runners' names, clubs, licence and card numbers, birth years, times, and the
event's code. **The organiser is responsible for those data** and for whom they share them with; keep the data folder as
you keep your results files. Nothing of it is sent to the author of Ozimut Chrono.

## The local network

Ozimut Chrono is made to link the laptops of an arena without the Internet. On the local network:

- **It announces itself** every five seconds by a UDP broadcast on port 8379: the computer's name, the app's version, the
  port its pages are served on, an identifier of the app's copy, and for each of its latest events (twelve at most) the
  event's identifier, name and day. **Never the event's code**, nor anything about runners.
- **It links to the apps that hold the same event**, over a WebSocket (port 8377 by default): an app must prove it knows the
  event's code (a keyed hash; the code itself never travels) or give the app's key. Once linked, the two exchange the
  event's operations — everything the event holds.
- **It serves its pages** on port 8377 (or the next free one up to 8387) to the phones and screens of the arena. Another
  device must give the app's key; the app's own window and pages of the same computer need none.
- **It listens for radio punches** (SIRAP) on TCP port 10000, from the relays you point at it.
- It links by itself only to apps it heard announce an event it holds, and to addresses you typed in (Prepare ›
  Connections › « A computer does not show up? »).

## The Internet

The app makes no request to the Internet by itself, except:

1. **The update check** — at start and every six hours, a request to github.com for the latest release of this repository
   (and, when a new version exists for the installed Windows app or the AppImage, its download from GitHub). Nothing is
   sent beyond what any HTTPS request carries (the computer's address, the app's user agent). Help › « Keep Ozimut Chrono up
   to date » switches it off.
2. **What you ask for**: a link you click opens in your usual browser. The connection to ozimut.com exists only when it was
   set up from ozimut.com's « Chrono » tab (signed in there, « Give the other stations access »): the event then carries a
   key, and the stations that have it exchange the event's operations with the copy kept on ozimut.com, send its live
   results when « live results » is on, and can publish the results there. These are governed by ozimut.com's privacy page.

A page of ozimut.com opened in a browser on the same computer may call this computer's app (Prepare › Connections › « Look
for the app on this computer », in the tab): the app answers it as it answers its own window. Pages of other websites are refused (pages served by this computer
itself, at `localhost`, apart).

## Questions

Write to contact@ozimut.com, or open an issue at <https://github.com/kerkia/ChronOzimut/issues> (with no personal data in
it: the repository is public).
