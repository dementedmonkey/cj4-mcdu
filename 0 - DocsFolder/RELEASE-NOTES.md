# Release 1.0.0

Web CDU for Microsoft Flight Simulator. Modified from [dementedmonkey/cj4-mcdu](https://github.com/dementedmonkey/cj4-mcdu) 0.10.0, GPL-3. The Community package is `z-DementedMonkey-LiM-CDU-v1.0.0`.

This package replaces the older Demented Monkey CDU mods and the separate LiM 747 and LiM UNS-1 mods.

## Remove the old CDU mods

Take these folders out of the Community folder before you copy this package in:

- Older Demented Monkey CDU mods, including `z-dementedmonkey-cj4-mcdu` and `z-dementedmonkey-p180-mcdu`
- `z-lim-ffx-cdu-mod`
- LiM 747 mods named `z-LiM-747v2-CDU-v*`
- LiM UNS-1 mods named `z-LiM-UNS1-PLUGIN-v*`
- An older copy of this package, `z-DementedMonkey-LiM-CDU-v*`

The LiM Charts plugin stays. It installs beside this package and the two run together.

## Install

Use the MSFS 2024 zip in the MSFS 2024 Community folder. Use the MSFS 2020 zip in the MSFS 2020 Community folder. The folder inside either zip is `z-DementedMonkey-LiM-CDU-v1.0.0`.

Install Node.js once. Run `web-cdu/start-web-cdu.cmd` and leave that window open. Open the URL it prints. The CDU screen stays dark until the unit in the aircraft has power.

Leave the flight and start it again after you install, so the sim loads the new scripts.

## Aircraft

| Aircraft | Browser face | WEBSOCKETS |
| --- | --- | --- |
| Citation CJ4 | CJ4. Other WT21 titles use this face with the plate "WT21 Default" | IDX, page 2, RSK 5 |
| King Air C90 | C90, one CDU | IDX, page 2, RSK 5 |
| FlightFX Piaggio P180 (2024) | P180, one CDU | IDX, page 2, RSK 5 |
| FlightFX Hawker 800XP | 800XP | IDX, page 2, RSK 5 |
| FlightFX Citation X / C750 | Honeywell C750 | NAV, SETTINGS, RSK 1 |
| 737 MAX | 737 | MENU, RSK 5 |
| 747-8, 747-400 GST, 747-400 LCF | 747 | MENU, RSK 5 |
| 707 | 5 in | DATA page 1, RSK 5 MAINT, then RSK 1 |
| Saab 340 | 4 in | DATA page 1, RSK 5 MAINT, then RSK 1 |

Export starts on for every aircraft. A saved off stays off. That choice is stored per aircraft title.

The MSFS 2020 P180 2.0.6 and the MSFS 2020 Citation X 1.3.8 have no page that can turn export off, so those two stay on. Citation X version 2 is in beta with the newer avionics, and the WEBSOCKETS page comes back with that FMC.

Dual CDUs have CPT, FO, and BOTH. The King Air C90 and the FlightFX Piaggio P180 are a single CDU.

## MSFS 2020

The 2020 zip is for the 2020 CJ4, the 2020 FlightFX Piaggio P180, and the 2020 FlightFX Citation X.

- CJ4 with Working Title WT21 2.0.4: the plugin attaches. WEBSOCKETS is on IDX, page 2, RSK 5.
- FlightFX P180 2.0.6: that FMC has no plugin. Export stays on.
- FlightFX Citation X 1.3.8: that FMC has no SETTINGS page. Export stays on.

## Server

`web-cdu/cdu-server.cfg` holds the hub settings:

- `httpPort` 8126, the browser page
- `simPort` 8088, the sim and the browser websocket
- `relayIp` and `relayPort` 8089, the SPAD relay

The sim and the browser connect in to `simPort`. On the aircraft WEBSOCKETS page, set the IP to `127.0.0.1` and the port to `8088` when the sim and the hub are on the same PC.

SPAD listens on `relayPort`. The hub dials out to `relayIp:relayPort` and sends the same messages the plane sends. Set `relayPort` to `0` to turn that off.

## What this release adds

- One Community package for the CJ4, King Air C90, FlightFX Piaggio P180, FlightFX Hawker 800XP, FlightFX Citation X, 737 MAX, 747, 707, and Saab 340.
- HTML CDU faces. The old PNG bezels are gone.
- A WEBSOCKETS page on each aircraft, with export, IP, and port stored for that title.
- The 747, the 707, and the Saab 340, which replace the separate LiM 747 and LiM UNS-1 packages.
- A SPAD relay. SPAD listens, and the hub connects out and speaks as the plane.
- MSFS 2020 support for the CJ4, the P180 2.0.6, and the Citation X 1.3.8.

Demented Monkey's 0.10.0 project supplies the CDU WEBSOCKETS page and the hub configuration in `cdu-server.cfg`. Chart display stays in the LiM Charts plugin.
