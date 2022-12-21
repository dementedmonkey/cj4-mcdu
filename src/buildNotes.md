# Notes on how to build and debug

Notes for myself becuase every time I step away from this for a while I forget the details.

## The app
* In the app folder, `npm install` and hope nothing blows up
* `npm run build:watch` for the node build
* In the same folder `node index.js` to run the server 

## The mod
* Temporarily rename the community folder
* From FS Dev Mode, Project Editor, open `mod\dementedmonkye-cj4-mcdu.xml`
* Click `build all` button for FS to discover the files/changes
* Start on the runway somewhere
* From the MSFS SDK, launch `Tools\CoherentGT Debugger\Debugger.exe`
* Open `VCockpit?? - WTT2_FMC_#` where `??` is random and `#` is 1 or 2 for left or right
* Debugger tab, open `dm21_fmc.js`
* Console windows has lots of expected 404 errors, don't panic.  Filter on `dm21:` for our messages.
* Need to hit "Build All" in Project Editor to pick up your changes
* `Ctrl-Shift-R` to reload changed files, `Ctrl-R` to just reload the same script.
* This only reloads the current HTML, need to reload the plane for other screens or to be sure.

## Building the release
* Stop any of the running node processes
* Update the `/version` file
* Run `node updateversions.js` to get this injected where it needs to be
* `git add`/`commit` then `git clean -fxd` to clean up intermediates
* Run `build.ps1` to build the code
* The output is zipped up in the `release` folder
* Copy mods into the community folder and restart the game
