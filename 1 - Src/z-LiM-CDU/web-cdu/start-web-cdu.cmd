@echo off
REM Runs from this folder. Node.js must be on PATH.
cd /d "%~dp0"
echo.
echo Ctrl+Click a printed URL to open the Web CDU.
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on PATH. Install Node, then run this file again.
  echo.
  pause
  exit /b 1
)
node index.js
pause
