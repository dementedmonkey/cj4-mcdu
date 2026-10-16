# z-DementedMonkey-LiM-CDU — build

`release-version.json` is the version. The package that ships is `1 - Src/z-DementedMonkey-LiM-CDU/`.

`npm run build` writes `build/msfs2024/z-DementedMonkey-LiM-CDU-v{version}/` and `build/msfs2020/z-DementedMonkey-LiM-CDU-v{version}/`. Both use the Community folder name `z-DementedMonkey-LiM-CDU-v{version}`. The 2024 tree drops the `FFX21` P180 override. The 2020 tree keeps it and sets `minimum_game_version` to `1.39.6`. The build vendors `node_modules/ws` into `web-cdu/` so `start-web-cdu.cmd` can run from Community without a second install, and copies `USER-MANUAL.md` and `RELEASE-NOTES.md` into `documentation/`. When `build-config.json` has `communityDir` and `fs2020CommunityDir`, those trees are copied into the matching sim. An older unversioned `z-DementedMonkey-LiM-CDU` folder in either Community directory is removed so only the versioned package loads.

`npm run release` does that and then writes `dist/z-DementedMonkey-LiM-CDU-v{version}-msfs2024.zip` and `dist/z-DementedMonkey-LiM-CDU-v{version}-msfs2020.zip`. `npm run server` runs the hub from source. `npm run test:relay` checks the SPAD dial-out.

There is no pkg exe and no `MCDU SERVER` folder. The hub is `web-cdu/index.js`. The old React client, the PNG CDU faces, and the Project Editor packages are not in this repository. Edit `1 - Src/z-DementedMonkey-LiM-CDU` only.

## What the package contains

CJ4, King Air, P180, and Hawker: `html_ui/Plugins/DM_LiM_CDU.xml` loads `lim_wt21_fmc.js` into `WT21_FMC`, `HP2000_FMC`, and `VTX21_FMC`. The sim's own FMC script stays in the aircraft. No Working Title CJ4 source is in this package.

Citation X: `globally_overriden_base_sim_files` replaces `VTX21/FMC/WT21_FMC.html` with a short page that imports the sim's `FMC.js` and then `lim_vtx21_fmc.js`. `lim_wt21_fmc.js` returns immediately once that hook is running.

FS2020 P180 2.0.6: the same list replaces `FFX21/FMC/WT21_FMC.html` with the stock page plus `lim_p180_fmc.js`. That aircraft's FMC has no plugin class. The 2024 P180 still uses the plugin.

737: a short override of `wtb38m_cdu.html` imports the sim's `CDU.js` and `lim_737_cdu.js`.

747-8, 747-400 GST, and 747-400 LCF: the same pattern, importing the sim's CDU script and `lim747_cdu.js`.

UNS-1: `WTUns1.js` in this package is a patched Working Title UNS-1 instrument. The HTML overrides import that file and `LimUns1Inject.js`. `Uns1Plugin.xml` loads `Uns1CduPlugins.js`. The 707 and Saab 340 panel files point those cockpits at the LiM UNS page.

In-sim script changes need a full sim exit before they load. HTML and CSS in `web-cdu/public` load on a browser refresh. `index.js` and `cdu-server.cfg` load when the hub process starts again.

A GitHub release runs `.github/workflows/release.yml`, which runs `npm run release` and uploads both zips from `dist/`. It clears `communityDir` and `fs2020CommunityDir` for that run so the action does not need a local Community folder.
