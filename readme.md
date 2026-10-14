# z-DementedMonkey-LiM-CDU

Web CDU for Microsoft Flight Simulator 2024. Modified from [dementedmonkey/cj4-mcdu](https://github.com/dementedmonkey/cj4-mcdu) 0.10.0. This fork stays under GPL-3. See `LICENSE`. The package name credits Demented Monkey and LiM together.

The sim package is `z-DementedMonkey-LiM-CDU-v{version}`. The browser hub is Node, started with `web-cdu/start-web-cdu.cmd`. There is no packaged exe. Ports live in `web-cdu/cdu-server.cfg`.

The browser faces are HTML and CSS. Install, the WEBSOCKETS pages, and the relay are in `0 - DocsFolder/USER-MANUAL.md`. Build steps are in `0 - DocsFolder/BUILD-PIPELINE.md`.

## Supported aircraft

| Aircraft | Browser face | WEBSOCKETS |
| --- | --- | --- |
| Citation CJ4, and CJ3 titles C25A / C25B / C25C | CJ4. Other WT21 titles use this face with the plate "WT21 Default" | IDX, page 2, RSK 5 |
| King Air C90 | C90, one CDU | IDX, page 2, RSK 5 |
| Piaggio P180 (2024) | P180, one CDU | IDX, page 2, RSK 5 |
| FlightFX Hawker 800XP | 800XP | IDX, page 2, RSK 5 |
| FlightFX Citation X / C750 | Honeywell C750 | NAV, SETTINGS, RSK 1 |
| 737 MAX | 737 | MENU, RSK 5 |
| 747-8, 747-400 GST, 747-400 LCF | 747 | MENU, RSK 5 |
| UNS-1, including the 707 and Saab 340 installs | 4 in and 5 in. A 707 payload opens the 5 in face | DATA page 1, RSK 5 MAINT, then RSK 1 |

WT21 aircraft and the UNS-1 start with export on when nothing has been saved for that title. The 737 and 747 start off. A saved off stays off.

Dual CDUs have CPT, FO, and BOTH. The C90 and the P180 are a single CDU, so that switch stays hidden.

Charts and Navigraph login are not in this package.

## FS2020

This package requires MSFS 2024 (`minimum_game_version` 1.5.27). FS2020 will not load it.

The FS2020 aircraft installed here were checked against the plugin:

| Aircraft | What it ships | Result |
| --- | --- | --- |
| FlightFX P180 2.0.6 | `FFX21/FMC/WT21_FMC.html` and its own `FMC.js`. That script has no avionics plugin class. | The `LiMCdu.xml` plugin does not attach. It still needs the HTML page that loads `FFX21/FMC/FMC.js` and then a small hook. This package does not include that page. |
| CJ4 with Working Title WT21 2.0.4 | `WT21/FMC/WT21_FMC.html`. `FMC.js` exports `WT21FmcAvionicsPlugin`. | The plugin target `WT21_FMC` is the right attachment. FS2020 still will not load this package until a 2020 build exists. |
| FlightFX Citation X 1.3.8 | `VTX21/FMC/WT21_FMC.html`, template id `HP2000_FMC`. `FMC.js` has no plugin class. | The plugin does not run. The short HTML override in this package matches that page and is the attachment that works. The same 2024 version floor blocks FS2020. |

The 2024 CJ4, C750, and P180 are the ones this package is built for. The 2024 P180 uses the plugin. The 2024 C750 uses the HTML override. The 2024 CJ4 uses the plugin.

## Run

Install Node.js. From the Community package folder, run `web-cdu/start-web-cdu.cmd`. From a git checkout:

```bash
npm install
npm run server
```

Open the URL the hub prints. Defaults in `cdu-server.cfg`:

- `httpPort` 8126, the browser page
- `simPort` 8088, the sim and the browser websocket
- `relayIp` and `relayPort` 8089, the SPAD relay

The sim and the browser connect in to `simPort`. SPAD listens on `relayPort`. The hub dials out to `relayIp:relayPort` and sends the same messages the plane sends. Set `relayPort` to `0` to turn that off.

## How the sim side attaches

CJ4, King Air, P180, and Hawker attach with the avionics plugin `html_ui/Plugins/LiMCdu.xml`. The sim keeps its own Working Title FMC. This package does not ship a CJ4 or WT21 FMC script.

Citation X, the 737, and the 747 use a short HTML override of the sim's CDU page. That page imports the sim's own avionics script, then a small LiM hook.

The UNS-1 is the exception that ships avionics code. `WTUns1.js` is a patched copy of the Working Title UNS-1 instrument, loaded by an HTML override, with `Uns1Plugin.xml` and `LimUns1Inject.js` beside it.

## Acknowledgements

The websocket message names (`mcduConnected`, `requestUpdate`, `event`, `update`) come from Demented Monkey's server. That server followed the shape used by the FlyByWire A32NX MCDU. This repository does not contain FlyByWire source, and the browser faces are not that MCDU application.

Demented Monkey's 0.10.0 project is the base of the WT21 plugin and the Node hub. Later aircraft, the HTML faces, and the relay were added here.
