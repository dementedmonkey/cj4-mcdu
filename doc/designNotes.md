# Design notes

## What this fork still shares with the original server

Demented Monkey's hub used the same message names as the FlyByWire A32NX remote MCDU: `mcduConnected`, `requestUpdate`, `event:…`, and `update:…`. Those names are still the wire protocol. This repository does not contain FlyByWire source. The browser is HTML and CSS written for each CDU face. The old FBW-style single page, the PNG bezels, and the packaged exe are gone.

The original server listened on 8126 for the page and 8088 for the websocket, one higher than the FlyByWire ports so both could run. Those two defaults are unchanged.

## Hub

`web-cdu/index.js` is the hub.

- HTTP `httpPort` (8126) serves `web-cdu/public`.
- WebSocket `simPort` (8088) accepts the sim and the browser. A message from the sim is sent to every browser. A key from a browser is sent to the sim.
- If `relayPort` is not 0, the hub opens a client websocket to `ws://relayIp:relayPort`. SPAD listens. The hub sends `mcduConnected` and then the same updates the plane sent. Keys that arrive from SPAD are forwarded to the sim.

`cdu-server.cfg` is read first, then `LIM_HTTP_PORT`, `LIM_WS_PORT`, `LIM_RELAY_PORT`, `LIM_RELAY_IP`, then `--http-port=`, `--sim-port=`, `--relay-port=`, and `--relay-ip=`.

## Messages

The sim connects out to the hub and sends:

- `mcduConnected` when the socket opens
- `update:<protocol>:<json>` when the screen changes

The browser and SPAD send:

- `requestUpdate` to ask for the current screen
- `event:<protocol>:<index>:<key>` for a key

`<protocol>` is `wt21`, `wt737`, `wt737/wt747`, or `wt737/uns1`.

WT21 JSON is one side per socket:

```json
{
  "aircraft": "CJ4",
  "left": {
    "lines": [["left", "right", "center"]],
    "power": true
  }
}
```

`right` replaces `left` on the second CDU. `lines` follows the sim template. A cell may end with a bracket style such as `[green]` or `[blue]`, the same markers the Working Title FMC already uses. The scratchpad is one of those lines. It is not a separate field.

737 and 747 updates use their own protocol prefix and can include `exec` for the EXEC light. UNS-1 updates use `wt737/uns1` and may include `"face": "4in"` or `"face": "5in"`.

## Sim attachment

CJ4, King Air, P180, and Hawker register `lim_wt21_fmc.js` through the MSFS avionics plugin API (`DM_LiM_CDU.xml` targets `WT21_FMC`, `HP2000_FMC`, and `VTX21_FMC`). The aircraft keeps the stock FMC. Hawker key events are still `CJ4_FMC_{1|2}_BTN_*`, which is what that shared instrument publishes.

Citation X, the 737, the 747, and the FS2020 P180 replace only the CDU HTML gauge. The replacement imports the sim's own script from the aircraft's VFS path, then the LiM hook. The P180 2.0.6 page is `FFX21/FMC/WT21_FMC.html` plus `lim_p180_fmc.js`, the same attachment as the v0.10 P180 package. The 2024 P180 still uses the plugin.

The UNS-1 ships `WTUns1.js`, a patched Working Title UNS instrument, because the WEBSOCKETS page and the CDU index live inside that instrument. `LimUns1Inject.js` and `Uns1Plugin.xml` sit beside it. That file is UNS avionics, not a CJ4 FMC.
