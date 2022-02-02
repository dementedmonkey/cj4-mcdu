# MCDU Web application for the Working Title CJ4

This application provides a web-based MCDU for the Working Title CJ4
in Microsoft Flight Simulator 2020.

## About
This project contains an application that will allow you to access
the MCDU of the Working Title CJ4 from a web browser on a tablet
or another PC.

In addition to this application, it includes a Flight Simulator mod
that will connect the CJ4 to this application.   This mod requires
a specific version of the CJ4, currently [0.12.11](https://www.workingtitle.aero/packages/cj4/2021/12/07/cj4-release-v0.12.11.html)

## Installation
* Install the [Working Title CJ4](https://www.workingtitle.aero/packages/cj4/) if you haven't already
* Copy the `z-dementedmonkey-cj4-mcdu` folder into your MSFS `Community` folder.<br/>
*Note:* Mods are loaded in alphabetical order.  The folder name must sort after "workingtitle" to be able to successfully
replace the existing files.

## Using the MCDU
* Run the `MCDU SERVER\cj4-mcdu-server-x.y.z.exe` application.  <br/>
_Note:_ It is important that the mod and the MCDU server are the same version.
* Start a flight with the CJ4
* The screen from the MCDU server will change to show that
the sim has connected, and will give you an address to enter
into your browser.   Typically it will be something like http://192.168.1.x:8126/
* Open your web browser, pointed to the address supplied.   You should see the MCDU immediately.   The screen will be
blank until it's powered up in the plane

## Acknowlegements
The MCDU application is based on code from the FlyByWire a32nx https://github.com/flybywiresim/a32nx 

The mod contains modified files from the Working Title CJ4 https://github.com/Working-Title-MSFS-Mods/fspackages

I'm not affiliated with either of those teams, just a fan of their work.
