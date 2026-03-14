# MCDU Web application for Microsoft Flight Simulator

## About
This project contains an application that will allow you to access
the MCDU of the CJ4 from a web browser on a tablet
or another PC.

It includes 2 pieces - a web server application that your browser
connects to, and a community mod for Flight Simulator
that will connect the simulator aircraft to this application.   

## Supported Aircraft

The "CJ4" name is increasingly inaccurate, as the mod now supports
5 different aircraft.

| Aircraft                      | FS2020 | FS2024 |
| ----------------------------- | :----: | :----: |
| Citation CJ4                  |   ✅    |   ✅    |
| King Air C90                  |  N/A   |   ✅    |
| Asobo 737 Max 8               |  N/A   |   ✅    |
| FFX P180 2.0.3 (2020 version) |   ✅    |  ❌   |
| FFX P180 2.1.9 (2024 version) |  N/A   |   ✅    |
| FFX C750 1.3.9                |   ✅    |   ✅    |

## Installation
* Remove any previous versions of the this mod
* Copy the `z-dementedmonkey-cj4-mcdu` folder into your MSFS `Community` folder.
* Special instructions for the P180 in FS2020:
  * Copy ths `FS2020\z-dementedmonkey-p180-mcdu` folder into your MSFS `Community` folder.
  * This is FS2020 only.   If you do this in FS2024 none of your screens will work.

> [!IMPORTANT]
> Mismatched versions of the MCDU app, the FS plugin, and your
> aircraft will cause bad things to happen.
> Be sure to remove all old versions when updating!

## Using the MCDU
* Run the `MCDU SERVER\cj4-mcdu-server-x.y.z.exe` application.  <br/>
_Note:_ It is important that the mod and the MCDU server are the same version.
* Start a flight with the CJ4
* The screen from the MCDU server will change to show that
the sim has connected, and will give you an address to enter
into your browser.   Typically it will be something like http://192.168.1.x:8126/
* Open your web browser, pointed to the address supplied.   You should see the MCDU immediately.   The screen will be
blank until it's powered up in the plane.   The CDU will default to the CJ4 type, but will switch
to the appropriate hardware for the aircraft once the sim loads.

## Multiple screens
You can control both the left and right MCDUs, if the aircraft is so equipped.  There are two ways of selecting which
MCDU you are controlling:
1. Click the top-left or top-right screw to control the left or right MCDU
2. Add `?screen=1` or `?screen=2` to the end of your URL to select the left or right screen.  This will
disable switching by the screws.

## Acknowlegements
The MCDU application is based on code from the FlyByWire a32nx https://github.com/flybywiresim/a32nx 

The mod contains modified files from the Working Title CJ4.

I'm not affiliated with either of those teams, just a fan of their work.
