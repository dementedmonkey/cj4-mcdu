# z-DementedMonkey-LiM-CDU

Web CDU for Microsoft Flight Simulator 2024. Modified from [dementedmonkey/cj4-mcdu](https://github.com/dementedmonkey/cj4-mcdu), GPL-3. See `LICENSE`. The Community folder name credits Demented Monkey and LiM together.

One Community package, `z-DementedMonkey-LiM-CDU-v{version}`, exports the CDU screen to a browser. The hub is Node. Start it with `web-cdu/start-web-cdu.cmd` inside the package. There is no exe server.

Charts and Navigraph login are not part of this package.

The MSFS 2020 zip is for the 2020 CJ4, the 2020 P180, and the 2020 Citation X. The CJ4 plugin attaches, and WEBSOCKETS is on IDX, page 2, RSK 5. The P180 2.0.6 FMC has no plugin. That zip loads `FFX21/FMC/WT21_FMC.html` and then `lim_p180_fmc.js`. Export stays on. That FMC has no page that can turn it off. The Citation X 1.3.8 has no SETTINGS page. That zip sends the screen through the HTML override of `VTX21/FMC/WT21_FMC.html`. Export stays on. Citation X version 2 is in beta with the newer avionics, and the WEBSOCKETS page comes back with that FMC.

## Install

Remove any older copy before copying this one in:

- `z-DementedMonkey-LiM-CDU-v*`
- `z-dementedmonkey-cj4-mcdu`
- `z-dementedmonkey-p180-mcdu`
- `z-lim-ffx-cdu-mod`
- `z-LiM-747v2-CDU-v*`
- `z-LiM-UNS1-PLUGIN-v*`

Copy `z-DementedMonkey-LiM-CDU-v1.0.0` into the MSFS 2024 Community folder. Install Node.js, then run `web-cdu/start-web-cdu.cmd`. Leave that window open while you fly.

The hub prints a local URL and a LAN URL. Open one of them in a browser on this PC or on a tablet on the same network. The screen stays dark until the CDU in the aircraft has power.

After you replace the Community package, leave the flight and start it again so the sim loads the new scripts. A browser refresh is enough for a face change that is only HTML or CSS. Restart `start-web-cdu.cmd` after you edit `cdu-server.cfg`. Two hubs cannot share port 8088.

## Ports

Defaults are in `web-cdu/cdu-server.cfg`:

| Setting | Default | Role |
| --- | --- | --- |
| `httpPort` | 8126 | Browser page |
| `simPort` | 8088 | Sim and browser websocket |
| `relayIp` | 127.0.0.1 | PC where SPAD is listening |
| `relayPort` | 8089 | SPAD websocket. `0` turns the relay off |

The sim and the browser connect in to `simPort`. On the aircraft WEBSOCKETS page, set the IP to `127.0.0.1` and the port to `simPort` when the sim and the hub are on the same PC.

SPAD listens on `relayPort`. The hub connects out to `relayIp:relayPort` and speaks as the plane: `mcduConnected`, then the same screen updates. Set `relayIp` to the other PC's address when SPAD is not on this machine. SPAD has to be listening before the hub can connect. The hub retries every couple of seconds.

## WEBSOCKETS page

The page stores export, IP, and port for that aircraft title. Every aircraft starts with export on when that title has no saved value. Turning it off is remembered.

| Aircraft | Where |
| --- | --- |
| CJ4, King Air C90, FlightFX Piaggio P180, Hawker 800XP | IDX, page 2, RSK 5 |
| Citation X | NAV, SETTINGS, RSK 1 |
| 737 MAX | MENU, RSK 5 |
| 747-8, 747-400 GST, 747-400 LCF | MENU, RSK 5 |
| 707 | DATA page 1, RSK 5 MAINT, then RSK 1 |
| Saab 340 | DATA page 1, RSK 5 MAINT, then RSK 1 |

A WT21 title this package does not recognise still uses the CJ4 face. The plate reads "WT21 Default".

## Browser

`?screen=1` is the left CDU, `?screen=2` is the right CDU, and `?screen=both` shows them side by side. Dual CDUs also have CPT, FO, and BOTH on the face. The King Air C90 and the P180 are a single CDU, so that switch is hidden.

The UNS page has a 4 IN / 5 IN switch. A 707 payload opens the 5 in face. A Saab 340 payload opens the 4 in face.

Key clicks play a short click. The first click may be silent until the browser allows audio.

## Develop

From a checkout of this repository:

```bash
npm install
npm run server
```

`npm run build` writes `build/z-DementedMonkey-LiM-CDU-v{version}/` and copies it to the Community folder in `build-config.json`. `npm run release` also writes `dist/` and a zip. See `BUILD-PIPELINE.md`.
