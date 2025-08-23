param (
    [string]$Project = "dementedmonkey-cj4-mcdu.xml",
    [string]$Package,
    [string]$MinimumGameVersion = "1.14.5",
    [string]$OutputPath = "..\..\build",
    [switch]$CleanBuild = $false
)

function Update-Packages {
    [XML]$projectFile = Get-Content $Project

    foreach ($packageEntry in $projectFile.Project.Packages.Package) {
        [XML]$packageFile = Get-Content $packageEntry
        $packageName = $packageFile.AssetPackage.Name
        if ($Package -and $packageName -ne $Package) {
            continue
        }
        
        $packageDef = $packageFile.AssetPackage
    
        $manifest = New-Object -TypeName PSObject -Property @{
            dependencies         = @()
            content_type         = $packageDef.ItemSettings.ContentType
            package_order_hint   = $packageDef.PackageOrderHint
            title                = $packageDef.ItemSettings.Title
            manufacturer         = ""
            creator              = $packageDef.ItemSettings.Creator
            package_version      = $packageDef.Version
            minimum_game_version = $MinimumGameVersion
            release_notes        = @{
                neutral = @{
                    LastUpdate   = ""
                    OlderHistory = ""
                }
            }
        }
    
        $packagePath = Join-Path $OutputPath $packageName
        $manifestPath = Join-Path $packagePath "manifest.json"
    
        if ($CleanBuild -eq $true) {
            Write-Host "Cleaning $packagePath..."
            Remove-Item -Path $packagePath -Recurse -ErrorAction SilentlyContinue
        }

        if ((Test-Path -Path $packagePath) -eq $false) {
            Write-Host "Creating package path $packagePath..."  
            New-Item -Path $packagePath -ItemType directory | Out-Null
        }
           
        Write-Host "Copying source files..."
        foreach ($assetGroup in $packageDef.AssetGroups.AssetGroup) {
            $src = Join-Path "." $assetGroup.AssetDir
            $dest = Join-Path $packagePath $assetGroup.OutputDir
            Write-Host "Copying $src to $dest..."
            robocopy $src $dest /XO /e  | Out-Null
        }
    
        Write-Host "Writing $manifestPath..."  
        $manifest | ConvertTo-Json | Out-File -FilePath $manifestPath -Encoding ASCII

        Write-Host "Building layout file..."
        $layoutEntries = @()
        foreach ($file in Get-ChildItem -Path $packagePath -Recurse -Exclude "manifest.json" -Attributes !Directory) {
            Push-Location $packagePath
    
            $layoutEntries += @{
                path = ($file | Resolve-Path -Relative).Replace('\', '/').Substring(2)
                size = $file.Length
                date = $file.LastWriteTime.ToFileTime()
            }
    
            Pop-Location
        }
        
        $layoutFilePath = Join-Path $packagePath "layout.json"
        Write-Host "Writing $layoutFilePath"
    
        $layoutFile = New-Object -Type PSObject -Property @{content = $layoutEntries }   
        $layoutFile | ConvertTo-Json | Out-File $layoutFilePath -Encoding ASCII
    
        Write-Host "Build finished."
    }

    # Report success to the GitHub workflow
    exit 0
}

Update-Packages