# Release notes

## 1.0.0 — 2026-10-14

Modified fork of dementedmonkey/cj4-mcdu 0.10.0 (GPL-3). The Community package is `z-DementedMonkey-LiM-CDU-v{version}`. The hub is Node, started with `web-cdu/start-web-cdu.cmd`. No exe server is shipped.

`web-cdu/cdu-server.cfg` sets the browser port (`httpPort`, 8126), the sim websocket (`simPort`, 8088), and the SPAD relay (`relayIp`, `relayPort` 8089). The sim and the browser connect in to `simPort`. SPAD listens. The hub dials out to `relayIp:relayPort` and sends the plane's messages. `relayPort` 0 turns the relay off.

Browser faces are HTML and CSS, one page per CDU family. CPT, FO, and BOTH select a side on dual CDUs. The King Air C90 and the P180 are a single CDU.

Supported aircraft and the WEBSOCKETS key:

- CJ4, King Air C90, FlightFX Piaggio P180, Hawker 800XP: IDX, page 2, RSK 5. An unrecognised WT21 title uses the CJ4 face, plate "WT21 Default".
- Citation X: NAV, SETTINGS, RSK 1.
- 737 MAX: MENU, RSK 5.
- 747-8, 747-400 GST, 747-400 LCF: MENU, RSK 5.
- 707: DATA page 1, RSK 5 MAINT, then RSK 1. A 707 payload opens the 5 in face.
- Saab 340: DATA page 1, RSK 5 MAINT, then RSK 1. A Saab 340 payload opens the 4 in face.

Every aircraft starts with export on when that title has no saved setting. A saved off stays off. Settings are stored per title.

CJ4, King Air, P180, and Hawker attach with the avionics plugin. The package does not ship a Working Title CJ4 FMC script. Citation X, the 737, and the 747 override the sim CDU page with a short HTML file that loads the sim's own avionics script and a LiM hook. The UNS-1 ships a patched copy of the Working Title UNS-1 instrument.

Charts are not included. The FS2020 Community copy sets `minimum_game_version` to `1.39.6`. The FS2020 CJ4 with Working Title WT21 loads the plugin, and the WEBSOCKETS menu is on IDX, page 2, RSK 5. The FS2020 P180 2.0.6 connects through an HTML override of `FFX21/FMC/WT21_FMC.html` that loads `lim_p180_fmc.js` after the sim FMC. Export stays on. That FMC has no page that can turn it off. The FS2020 Citation X 1.3.8 sends its screen through the HTML override of `VTX21/FMC/WT21_FMC.html`. That FMC has no SETTINGS page, so export stays on. Citation X version 2 is in beta with the newer avionics, and the WEBSOCKETS page comes back with that FMC.
