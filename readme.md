# WebCDU Plugin for MSFS 2024

Web CDU for Microsoft Flight Simulator 2024. Modified from [dementedmonkey/cj4-mcdu](https://github.com/dementedmonkey/cj4-mcdu) 0.10.0. This fork stays under GPL-3. See `LICENSE`. The package name credits Demented Monkey and LiM together.

The sim package is `z-DementedMonkey-LiM-CDU-v{version}`. MSFS 2024 and MSFS 2020 each have their own zip. The browser hub is Node, started with `web-cdu/start-web-cdu.cmd`. There is no packaged exe. Ports live in `web-cdu/cdu-server.cfg`.

The browser faces are HTML and CSS. Install, the WEBSOCKETS pages, and the relay are in `0 - DocsFolder/USER-MANUAL.md`. Build steps are in `0 - DocsFolder/BUILD-PIPELINE.md`.

## MSFS 2024

| Aircraft | Version | Browser face | WEBSOCKETS |
| --- | --- | --- | --- |
| Citation CJ4 | 2.1.10 | CJ4. Other WT21 titles use this face with the plate "WT21 Default" | IDX, page 2, RSK 5 |
| King Air C90 | 1.1.2 | C90, one CDU | IDX, page 2, RSK 5 |
| FlightFX Piaggio P180 | 2.2.7 | P180, one CDU | IDX, page 2, RSK 5 |
| FlightFX Hawker 800XP | 1.6 | 800XP | IDX, page 2, RSK 5 |
| FlightFX Citation X / C750 | 2.3 | Honeywell C750 | NAV, SETTINGS, RSK 1 |
| 737 MAX 8 | 9.11.0 | 737 | MENU, RSK 5 |
| 747-8 | 2.1.7 | 747 | MENU, RSK 5 |
| 747-400 LCF | 2.1.7 | 747 | MENU, RSK 5 |
| 747-400 GST | 2.1.6 | 747 | MENU, RSK 5 |
| 707-320C | 1.0.0 | 5 in | DATA page 1, RSK 5 MAINT, then RSK 1 |
| Saab 340 | 1.1.3 | 4 in | DATA page 1, RSK 5 MAINT, then RSK 1 |

Every aircraft starts with export on when nothing has been saved for that title. A saved off stays off.

Dual CDUs have CPT, FO, and BOTH. The C90 and the P180 are a single CDU, so that switch stays hidden.

Charts and Navigraph login are not in this package.

## MSFS 2020

Use the MSFS 2020 zip for these aircraft.

| Aircraft | Version | Result |
| --- | --- | --- |
| Citation CJ4 with Working Title WT21 | 2.0.4 | The plugin attaches. WEBSOCKETS is on IDX, page 2, RSK 5. |
| FlightFX Piaggio P180 | 2.0.6 | That FMC has no plugin. The zip loads the sim's `FFX21/FMC/WT21_FMC.html` and then `lim_p180_fmc.js`. Export stays on. That FMC has no page that can turn it off. |
| FlightFX Citation X | 1.3.8 | That FMC has no SETTINGS page. The zip sends the CDU screen through the HTML override of `VTX21/FMC/WT21_FMC.html`. Export stays on. |

## Run

Double-click `web-cdu/start-web-cdu.cmd` from the package and leave the window open. It prints the browser URL. If Node.js is not already on the PC, the script downloads a portable copy into `web-cdu/runtime/` the first time and then starts the hub.

Defaults in `cdu-server.cfg`:

- `httpPort` 8126, the browser page
- `simPort` 8088, the sim and the browser websocket
- `relayIp` and `relayPort` 8089, the SPAD relay

The sim and the browser connect in to `simPort`. SPAD listens on `relayPort`. The hub dials out to `relayIp:relayPort` and sends the same messages the plane sends. Set `relayPort` to `0` to turn that off.

## How the sim side attaches

CJ4, King Air, Hawker, and the 2024 P180 attach with the avionics plugin `html_ui/Plugins/DM_LiM_CDU.xml`. The sim keeps its own Working Title FMC. This package does not ship a CJ4 or WT21 FMC script. The 2020 P180 is covered by the 2020 zip, in the table above.

Citation X, the 737, and the 747 use a short HTML override of the sim's CDU page. That page imports the sim's own avionics script, then a small LiM hook.

The UNS-1 is the exception that ships avionics code. `WTUns1.js` is a patched copy of the Working Title UNS-1 instrument, loaded by an HTML override, with `Uns1Plugin.xml` and `LimUns1Inject.js` beside it.

## Acknowledgements

Demented Monkey's 0.10.0 project is the base of the WT21 plugin and the Node hub. That project supplies the CDU WEBSOCKETS page, where each aircraft sets export on or off and the destination IP and port, and the hub server configuration in `cdu-server.cfg`: the browser port and the sim websocket port.

The websocket message names (`mcduConnected`, `requestUpdate`, `event`, `update`) come from Demented Monkey's server. That server followed the shape used by the FlyByWire A32NX MCDU. This repository does not contain FlyByWire source, and the browser faces are not that MCDU application.

Later aircraft and the HTML faces were added in this fork. The SPAD relay is an extra dial-out on that same server configuration: `relayIp` and `relayPort` in `cdu-server.cfg`.
