@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo Ctrl+Click a printed URL to open the Web CDU.
echo.

set "NODE_EXE="

REM Prefer a Node already on PATH.
where node >nul 2>nul
if not errorlevel 1 (
  for /f "delims=" %%I in ('where node 2^>nul') do (
    set "NODE_EXE=%%I"
    goto :have_node
  )
)

REM Common Windows install path when PATH was not refreshed yet.
if exist "%ProgramFiles%\nodejs\node.exe" (
  set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
  goto :have_node
)
if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
  set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
  goto :have_node
)

REM Portable copy downloaded by an earlier run of this script.
if exist "%~dp0runtime\node\node.exe" (
  set "NODE_EXE=%~dp0runtime\node\node.exe"
  goto :have_node
)

echo Node.js was not found on this PC.
echo Downloading a portable Node.js into web-cdu\runtime\ for this package.
echo This only needs to happen once, and it does not change your system PATH.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0node_modules\.lim-cdu\install-node.ps1"
if errorlevel 1 (
  echo.
  echo Portable Node.js could not be installed.
  echo Install Node.js LTS from https://nodejs.org/ then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "%~dp0runtime\node\node.exe" (
  echo.
  echo Portable Node.js download finished, but node.exe was not found.
  echo Install Node.js LTS from https://nodejs.org/ then run this file again.
  echo.
  pause
  exit /b 1
)

set "NODE_EXE=%~dp0runtime\node\node.exe"

:have_node
echo Using: !NODE_EXE!
echo.
"!NODE_EXE!" index.js
set "EXITCODE=!ERRORLEVEL!"
echo.
if not "!EXITCODE!"=="0" (
  echo The hub exited with code !EXITCODE!.
)
pause
exit /b !EXITCODE!
