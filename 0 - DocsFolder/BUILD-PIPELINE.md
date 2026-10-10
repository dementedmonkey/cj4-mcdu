# DementedMonkey-LiM-CDU — build

`release-version.json` is the version. `npm run build` writes `build/DementedMonkey-LiM-CDU-v{version}/` and copies it to the Community folder in `build-config.json`. `npm run release` writes `dist/` and a zip.

Source package: `1 - Src/DementedMonkey-LiM-CDU/`.

`npm run server` runs the hub from source. `npm run test:relay` checks that a message on the sim port arrives on the relay port and a key on the relay port arrives on the sim port.
