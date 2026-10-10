# z-DementedMonkey-LiM-CDU

Modified 2026-10-10 from [dementedmonkey/cj4-mcdu](https://github.com/dementedmonkey/cj4-mcdu), GPL-3. This fork keeps that license. See `LICENSE`. The Community name credits Demented Monkey and LiM together.

One Community package and one Node hub export CDU screens for the Working Title WT21 aircraft (CJ4, King Air C90, Citation X / C750, Piaggio P180), the 737 MAX, and the FlightFX Hawker 800XP.

Navigraph login and SimLink are not part of this repository.

## Run

```bash
npm install
npm run server
```

Open the URL the hub prints. Defaults are in `1 - Src/z-DementedMonkey-LiM-CDU/web-cdu/cdu-server.cfg`:

- `httpPort` — browser page (8126)
- `simPort` — sim and browser websocket (8088)
- `relayPort` — second websocket for SPAD or a hardware CDU (8089). Set `0` to turn it off.

In the aircraft, open **MCDU MENU** (737: **MENU**) and press **WEBSOCKETS>**. Set **EXPORT** to **ON**, and set the IP and port to the hub `simPort`.

`?screen=1`, `?screen=2`, and `?screen=both` select the left CDU, the right CDU, or both side by side.

## Build

`npm run build` writes `build/z-DementedMonkey-LiM-CDU-v{version}/` and copies it to the Community folder in `build-config.json`.

`npm run release` writes `dist/` and a zip.

Remove any older `z-dementedmonkey-cj4-mcdu`, `z-dementedmonkey-p180-mcdu`, `z-lim-ffx-cdu-mod`, `z-LiM-747v2-CDU-v*`, or `z-LiM-UNS1-PLUGIN-v*` package before testing. Two hubs cannot share port 8088.

This branch also loads the 747 CDU (MENU → WEBSOCKETS>, export / IP / port) and the UNS-1 CDU. The page picks the 747 or UNS face from the update header. UNS **4 IN / 5 IN** switches the bezel. A Boeing 707 payload selects the 5-inch face.
