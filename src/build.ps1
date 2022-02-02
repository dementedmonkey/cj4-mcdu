$version = (get-content ..\version).trim()

Push-Location (join-path $PSScriptRoot mod)
.\build.ps1
Pop-Location

Push-Location (join-path $PSScriptRoot app)
npm install
npm run build:client
npm run build:mcdu-server
Pop-Location
$source="..\build\MCDU SERVER\cj4-mcdu-server.exe"
$target="..\build\MCDU SERVER\cj4-mcdu-server-$version.exe"
Move-Item $source $target -Force

Push-Location $PSScriptRoot
copy-item ..\readme.md ..\build -force
copy-item ..\version ..\build -force
$filename = "..\release\cj4-mcdu-$version.zip"
if (-not (test-path ..\release)) {
    mkdir ..\release
}
Compress-Archive ..\build\* $filename -force
pop-location