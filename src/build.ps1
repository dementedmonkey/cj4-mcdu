Push-Location (join-path $PSScriptRoot mod)
.\build.ps1
Pop-Location

Push-Location (join-path $PSScriptRoot app)
npm install
npm run build:client
npm run build:mcdu-server
Pop-Location

Push-Location $PSScriptRoot
copy-item ..\readme.md ..\build -force
copy-item ..\version ..\build -force
$version = (get-content ..\version).trim()
$filename = "..\release\cj4-mcdu-$version.zip"
if (-not (test-path ..\release)) {
    mkdir ..\release
}
Compress-Archive ..\build\* $filename -force
pop-location