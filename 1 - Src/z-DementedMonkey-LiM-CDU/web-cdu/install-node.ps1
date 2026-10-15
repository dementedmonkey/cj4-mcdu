# Downloads a portable Node.js win-x64 build into web-cdu\runtime\node.
# Called by start-web-cdu.cmd when no system Node is available.
$ErrorActionPreference = 'Stop'

$webCduDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$runtimeRoot = Join-Path $webCduDir 'runtime'
$nodeDir = Join-Path $runtimeRoot 'node'
$nodeExe = Join-Path $nodeDir 'node.exe'

if (Test-Path -LiteralPath $nodeExe) {
  Write-Host "Portable Node.js is already present."
  exit 0
}

$arch = $env:PROCESSOR_ARCHITECTURE
if ($arch -eq 'ARM64') {
  Write-Host 'This PC is ARM64. Install Node.js LTS from https://nodejs.org/ and run start-web-cdu.cmd again.'
  exit 1
}

Write-Host 'Looking up the current Node.js LTS...'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$index = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json'
$lts = $index | Where-Object { $_.lts -ne $false } | Select-Object -First 1
if (-not $lts) {
  throw 'Could not find a Node.js LTS release on nodejs.org.'
}

$version = [string]$lts.version
$zipName = "node-$version-win-x64.zip"
$zipUrl = "https://nodejs.org/dist/$version/$zipName"
$zipPath = Join-Path $runtimeRoot $zipName
$extractDir = Join-Path $runtimeRoot ("node-$version-win-x64")

Write-Host "Downloading $zipName ..."
New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing

Write-Host 'Extracting...'
if (Test-Path -LiteralPath $extractDir) {
  Remove-Item -LiteralPath $extractDir -Recurse -Force
}
Expand-Archive -LiteralPath $zipPath -DestinationPath $runtimeRoot -Force

$extractedNode = Join-Path $extractDir 'node.exe'
if (-not (Test-Path -LiteralPath $extractedNode)) {
  throw "Download finished, but $extractedNode was missing."
}

if (Test-Path -LiteralPath $nodeDir) {
  Remove-Item -LiteralPath $nodeDir -Recurse -Force
}
Rename-Item -LiteralPath $extractDir -NewName 'node'
Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue

$verify = & $nodeExe --version
Write-Host "Portable Node.js ready: $verify"
exit 0
