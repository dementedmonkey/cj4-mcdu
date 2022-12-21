# MCDU Web application for the Working Title CJ4

This application provides a web-based MCDU for the CJ4
in Microsoft Flight Simulator 2020 with AAU1.

## Beta release
* This version is for *AAU1 Beta 1.30.7.0* only.  Any other version will most
likely not work.
* This is a quick fix to get things working again with the AAU1 beta.   If anything
isn't working right, please open an Issue.
* You *MUST* remove previous versions of the mod, even the 0.4.0 version.  If you don't
do this and the mod doesn't work, I'll make fun of you.

## About
This project contains an application that will allow you to access
the MCDU of the CJ4 from a web browser on a tablet
or another PC.

In addition to this application, it includes a Flight Simulator mod
that will connect the CJ4 to this application.   

## Installation
* Remove any previous versions of the Working Title mod and this mod
* Install [AAU1](https://forums.flightsimulator.com/t/read-first-welcome-to-the-aau-i-beta/562534)
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

## Multiple screens
You can control both the left and right MCDUs.  There are two ways of selecting which
MCDU you are controlling:
1. Click the top-left or top-right screw to control the left or right MCDU
2. Add `?screen=1` or `?screen=2` to the end of your URL to select the left or right screen.  This will
disable switching by the screws.

## Acknowlegements
The MCDU application is based on code from the FlyByWire a32nx https://github.com/flybywiresim/a32nx 

The mod contains modified files from the Working Title CJ4.

I'm not affiliated with either of those teams, just a fan of their work.
