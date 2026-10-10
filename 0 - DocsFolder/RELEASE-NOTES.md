# Release notes

## 1.0.0 — 2026-10-10

Modified fork of dementedmonkey/cj4-mcdu 0.10.0 (GPL-3).

- Versioned Community package `z-LiM-CDU-v{version}` and Node hub (`start-web-cdu.cmd`). The pkg exe is not shipped.
- `web-cdu/cdu-server.cfg` sets the browser port, the sim websocket port, and an optional relay port.
- The relay listens on its own port and forwards every websocket message both ways, so a browser CDU and SPAD can use the same screen.
- **MCDU MENU → WEBSOCKETS>** (737: **MENU → WEBSOCKETS>**) sets export, IP, and port. Export is **OFF** until turned on. Settings are stored per aircraft title.
- HTML/CSS CDU faces replace the PNG bezels. The page scales with the window. **BOTH** shows the left and right CDUs together.
- Hawker 800XP (H25B / TITLE containing 800XP) uses the jet WT21 face. Key events stay `CJ4_FMC_{1|2}_BTN_*`, the same H-events the shared WT21 FMC publishes.
