# LiM Web CDU

Modified 2026-10-10 from [dementedmonkey/cj4-mcdu](https://github.com/dementedmonkey/cj4-mcdu), GPL-3. This fork keeps that license. See `LICENSE`.

One Community package and one Node hub export CDU screens for the Working Title WT21 aircraft (CJ4, King Air C90, Citation X / C750, Piaggio P180), the 737 MAX, and the FlightFX Hawker 800XP.

Navigraph login and SimLink are not part of this repository.

## Run

```bash
npm install
npm run server
```

Open the URL the hub prints. Defaults are in `1 - Src/z-LiM-CDU/web-cdu/cdu-server.cfg`:

- `httpPort` — browser page (8126)
- `simPort` — sim and browser websocket (8088)
- `relayPort` — second websocket for SPAD or a hardware CDU (8089). Set `0` to turn it off.

In the aircraft, open **MCDU MENU** (737: **MENU**) and press **WEBSOCKETS>**. Set **EXPORT** to **ON**, and set the IP and port to the hub `simPort`.

`?screen=1`, `?screen=2`, and `?screen=both` select the left CDU, the right CDU, or both side by side.

## Build

`npm run build` writes `build/z-LiM-CDU-v{version}/` and copies it to the Community folder in `build-config.json`.

`npm run release` writes `dist/` and a zip.

Remove any older `z-dementedmonkey-cj4-mcdu`, `z-dementedmonkey-p180-mcdu`, or `z-lim-ffx-cdu-mod` package before testing. Two hubs cannot share port 8088.
