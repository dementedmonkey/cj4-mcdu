# Release 1.0.2

Web CDU for Microsoft Flight Simulator. Modified from [dementedmonkey/cj4-mcdu](https://github.com/dementedmonkey/cj4-mcdu) 0.10.0, GPL-3. The Community package is `z-DementedMonkey-LiM-CDU-v1.0.2`.

## What is new in 1.0.2

- Browser face routing fixes so the 747, 737, and UNS pages open from the hub URL instead of staying on a blank WT21 face.
- Separate 747-400 CRT face (dark brown bezel, green phosphor, rounder screen) for the LCF and GST. The 747-8 keeps the tan multi-color face. Routing uses ATC MODEL (`744` vs `748`).
- Hawker and CJ4 LSK pitch tweaks.
- Release minify no longer breaks the UNS instrument in Coherent GT (`WTUns1.js` stays unminified).

## Remove the old CDU mods

Take these folders out of the Community folder before you copy this package in:

- Older Demented Monkey CDU mods, including `z-dementedmonkey-cj4-mcdu` and `z-dementedmonkey-p180-mcdu`
- `z-lim-ffx-cdu-mod`
- LiM 747 mods named `z-LiM-747v2-CDU-v*`
- LiM UNS-1 mods named `z-LiM-UNS1-PLUGIN-v*`
- An older copy of this package, `z-DementedMonkey-LiM-CDU-v*`

The LiM Charts plugin stays. It installs beside this package and the two run together.

## Install

Download the MSFS 2024 zip or the MSFS 2020 zip from this release. Use the MSFS 2024 zip in the MSFS 2024 Community folder. Use the MSFS 2020 zip in the MSFS 2020 Community folder. The folder inside either zip is `z-DementedMonkey-LiM-CDU-v1.0.2`.

Double-click `web-cdu/start-web-cdu.cmd` and leave that window open. Open the URL it prints. The CDU screen stays dark until the unit in the aircraft has power. If Node.js is not already on the PC, that script downloads a portable copy into `web-cdu/runtime/` the first time and then starts the hub.

Leave the flight and start it again after you install, so the sim loads the new scripts.

## MSFS 2024 aircraft

| Aircraft | Version | Browser face | WEBSOCKETS |
| --- | --- | --- | --- |
| Citation CJ4 | 2.1.10 | CJ4. Other WT21 titles use this face with the plate "WT21 Default" | IDX, page 2, RSK 5 |
| King Air C90 | 1.1.2 | C90, one CDU | IDX, page 2, RSK 5 |
| FlightFX Piaggio P180 | 2.2.7 | P180, one CDU | IDX, page 2, RSK 5 |
| FlightFX Hawker 800XP | 1.6 | 800XP | IDX, page 2, RSK 5 |
| FlightFX Citation X / C750 | 2.3 | Honeywell C750 | NAV, SETTINGS, RSK 1 |
| 737 MAX 8 | 9.11.0 | 737 | MENU, RSK 5 |
| 747-8 | 2.1.7 | 747 | MENU, RSK 5 |
| 747-400 LCF | 2.1.7 | 747-400 CRT | MENU, RSK 5 |
| 747-400 GST | 2.1.6 | 747-400 CRT | MENU, RSK 5 |
| 707-320C | 1.0.0 | 5 in | DATA page 1, RSK 5 MAINT, then RSK 1 |
| Saab 340 | 1.1.3 | 4 in | DATA page 1, RSK 5 MAINT, then RSK 1 |

Export starts on for every aircraft. A saved off stays off. That choice is stored per aircraft title.

The MSFS 2020 P180 2.0.6 and the MSFS 2020 Citation X 1.3.8 have no page that can turn export off, so those two stay on.

Dual CDUs have CPT, FO, and BOTH. The King Air C90 and the FlightFX Piaggio P180 are a single CDU.

## MSFS 2020 aircraft

| Aircraft | Version | Result |
| --- | --- | --- |
| Citation CJ4 with Working Title WT21 | 2.0.4 | The plugin attaches. WEBSOCKETS is on IDX, page 2, RSK 5. |
| FlightFX Piaggio P180 | 2.0.6 | That FMC has no plugin. Export stays on. |
| FlightFX Citation X | 1.3.8 | That FMC has no SETTINGS page. Export stays on. |

## Server

`web-cdu/cdu-server.cfg` holds the hub settings:

- `httpPort` 8126, the browser page
- `simPort` 8088, the sim and the browser websocket
- `relayIp` and `relayPort` 8089, the SPAD relay

The sim and the browser connect in to `simPort`. On the aircraft WEBSOCKETS page, set the IP to `127.0.0.1` and the port to `8088` when the sim and the hub are on the same PC.

SPAD listens on `relayPort`. The hub dials out to `relayIp:relayPort` and sends the same messages the plane sends. Set `relayPort` to `0` to turn that off.

## What 1.0.1 added

- `web-cdu/start-web-cdu.cmd` downloads a portable Node.js into `web-cdu/runtime/` when Node is not already on the PC, then starts the hub. No separate Node install steps.
- Separate MSFS 2024 and MSFS 2020 zips. Use the zip that matches your sim.

## What 1.0.0 added

- One Community package for the CJ4, King Air C90, FlightFX Piaggio P180, FlightFX Hawker 800XP, FlightFX Citation X, 737 MAX, 747, 707, and Saab 340.
- HTML CDU faces. The old PNG bezels are gone.
- A WEBSOCKETS page on each aircraft, with export, IP, and port stored for that title.
- The 747, the 707, and the Saab 340, which replace the separate LiM 747 and LiM UNS-1 packages.
- A SPAD relay. SPAD listens, and the hub connects out and speaks as the plane.
- MSFS 2020 support for the CJ4, the P180 2.0.6, and the Citation X 1.3.8.

Demented Monkey's 0.10.0 project supplies the CDU WEBSOCKETS page and the hub configuration in `cdu-server.cfg`. Chart display stays in the LiM Charts plugin.
