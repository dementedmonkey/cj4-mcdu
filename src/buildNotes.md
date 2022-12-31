# Notes on how to build and debug

Notes for myself becuase every time I step away from this for a while I forget the details.

## The app

* In the app folder, `npm install` and hope nothing blows up
* `npm run build:watch` for the node build
* In the same folder `node index.js` to run the server

## The mod

* Temporarily rename the community folder
* From FS Dev Mode, Project Editor, open `mod\dementedmonkey-cj4-mcdu.xml`
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

Releases are built using the GitHub action defined in `.github\workflows\release.yml`.

To build an official release create and push a tag with the version,
e.g. `v0.5.0`.   The package will build automatically, a new draft release created,
and the output will be attached to the release as a zip file.

To build a one-off release the action can be triggered manually via the Actions
tab in GitHub. Click on the `Release build` workflow on the left, then `Run workflow`
on the right. Specify the version number then hit `Run workflow`. After the run completes
the zip file will be attached as an artifact at the bottom of the workflow run results.

You can use the `src/build.ps1` script to run the build locally.

## Version numbering
The JSON and XML files need to have a version number and can't import one.   The `build.ps1`
script will update them with the version tag for CI, or the number `9999.9999.9999` for local
builds.   Note that building with a non-default version will leave the file edited locally with
the last build number embedded.   The alternative would be to template the file and exclude the
generated version, but I think that's worse than what we have now.
