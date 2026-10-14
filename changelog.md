# Changelog

## 1.0.0 — 2026-10-14

LiM fork of dementedmonkey/cj4-mcdu 0.10.0. The entries below 1.0.0 are that project's history.

- One Community package, `z-DementedMonkey-LiM-CDU-v{version}`, and a Node hub. The pkg exe is not shipped. `start-web-cdu.cmd` starts `web-cdu/index.js`.
- HTML/CSS faces for the CJ4, King Air C90, P180, Hawker 800XP, Citation X, 737, 747, and UNS-1 (4 in and 5 in). CPT, FO, and BOTH on dual CDUs. C90 and P180 stay a single CDU.
- WEBSOCKETS page on each family. Export starts on for every aircraft. The choice is stored per aircraft title.
- Avionics plugin file is `html_ui/Plugins/DM_LiM_CDU.xml`.
- SPAD relay: the hub dials out to `relayIp:relayPort` and speaks as the plane. SPAD listens.
- CJ4, King Air, P180, and Hawker use the avionics plugin. No Working Title CJ4 FMC script is shipped. Citation X, the 737, and the 747 use a short HTML override that loads the sim's own avionics script. The UNS-1 ships a patched Working Title UNS-1 instrument.
- The separate FS2020 P180 package is not included. The FS2020 Community copy uses `minimum_game_version` 1.39.6. FS2020 CJ4 with Working Title WT21 2.0.4 loads the plugin, and the WEBSOCKETS menu is on IDX, page 2, RSK 5. FS2020 P180 2.0.6 connects through the `FFX21/FMC/WT21_FMC.html` override and `lim_p180_fmc.js`. Export stays on. That FMC has no page that can turn it off. FS2020 Citation X 1.3.8 has no SETTINGS page, so export stays on. Citation X version 2 is in beta with the newer avionics; the WEBSOCKETS page returns with that FMC.

## 0.10.0
* Support FFX P180 2024 version
* Added new plugin for the P180 in 2020

## 0.9.0
* Support FFX C750
* Use character grid layout in WT21 CDU for better fidelity
* Rework CSS for more modularity and fewer magic values
* Update NPM packages

## 0.8.0
* Support different CDU hardware styles in the app
* Add support for Asobo 737 MAX 8
* Add Turboprop-style CDU for WT21 (C90, P180)
* Improve handling of sim connection and disconnection
* Adjust package to correctly override P180 in SU2

## 0.7.0
* Update documentation to indicate FS2024 support
* Add support for FFX Piaggio P180 in FS2020

## 0.6.0
* Updated for SU15.
* Use the new WT21 plugin system

## 0.5.1
* Requires AAU1 1.30.7.0 beta.  Use 0.3.0 if you're still on the released SU11.
* Add check for conflicting programs at startup

## 0.5.0
* Requires AAU1 1.30.7.0 beta.  Use 0.3.0 if you're still on the released SU11.
* Rework electrical bus logic to not require hacking panel.xml
* Change data format of the mod for future expansion

## 0.4.0
* Requires the AAU1 beta.  Use 0.3.0 if you're still on the released SU11.
* Compatibility with AAU1 version 1.30.5.0
* Support split CDUs (click the top left/right screws)

## 0.3.0
* Add optional click sounds to button presses _(Available by adding /sound to the URL)_
* Update readme to reference 0.12.14 version of WT mod
* Clear the screen when the sim disconnects
* Fix WT bug showing GS on POS INIT 2 page
* Fix WT bug causing PROGRESS page to flicker

## 0.2.0
* Change websocket port from 8081 to 8088 to avoid conflict with PilotEdge
* Fix scratchpad disappearing on some screens
* Add version number to EXE filename

## 0.1.0
* Initial release
