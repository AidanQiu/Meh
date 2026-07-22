$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$targetRoot = Join-Path $projectRoot "android/app/src/main/assets/www"
$files = @(
    "index.html",
    "app.js",
    "pwa-update.js",
    "style.css",
    "service-worker.js",
    "version.json",
    "manifest.webmanifest",
    "manifest-meh.webmanifest",
    "manifest-zh.webmanifest",
    "favicon.ico"
)

New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null

foreach ($file in $files) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination (Join-Path $targetRoot $file) -Force
}

$sourceFonts = Join-Path $projectRoot "fonts"
$targetFonts = Join-Path $targetRoot "fonts"
New-Item -ItemType Directory -Force -Path $targetFonts | Out-Null
Copy-Item -Path (Join-Path $sourceFonts "*") -Destination $targetFonts -Recurse -Force

$iconFiles = @(
    "icon_monochrome.svg",
    "meh_background.svg",
    "meh_foreground.svg",
    "meh_icon.png"
)
$sourceIcons = Join-Path $projectRoot "icons"
$targetIcons = Join-Path $targetRoot "icons"
New-Item -ItemType Directory -Force -Path $targetIcons | Out-Null

Get-ChildItem -LiteralPath $targetIcons -File | Where-Object {
    $_.Name -notin $iconFiles
} | Remove-Item -Force

foreach ($iconFile in $iconFiles) {
    Copy-Item -LiteralPath (Join-Path $sourceIcons $iconFile) -Destination (Join-Path $targetIcons $iconFile) -Force
}

$expectedRelativeFiles = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
)
foreach ($file in $files) {
    [void]$expectedRelativeFiles.Add($file.Replace("/", [System.IO.Path]::DirectorySeparatorChar))
}
$sourceFontsPrefix = [System.IO.Path]::GetFullPath($sourceFonts).TrimEnd(
    [System.IO.Path]::DirectorySeparatorChar
) + [System.IO.Path]::DirectorySeparatorChar
Get-ChildItem -LiteralPath $sourceFonts -Recurse -File | ForEach-Object {
    $relative = $_.FullName.Substring($sourceFontsPrefix.Length)
    [void]$expectedRelativeFiles.Add((Join-Path "fonts" $relative))
}
foreach ($iconFile in $iconFiles) {
    [void]$expectedRelativeFiles.Add((Join-Path "icons" $iconFile))
}

# The Android asset directory is a generated mirror. Remove stale files so an old index,
# stylesheet, manifest, or icon cannot survive a later APK build.
Get-ChildItem -LiteralPath $targetRoot -Recurse -File | ForEach-Object {
    $targetPrefix = [System.IO.Path]::GetFullPath($targetRoot).TrimEnd(
        [System.IO.Path]::DirectorySeparatorChar
    ) + [System.IO.Path]::DirectorySeparatorChar
    $relative = $_.FullName.Substring($targetPrefix.Length)
    if (-not $expectedRelativeFiles.Contains($relative)) {
        Remove-Item -LiteralPath $_.FullName -Force
    }
}

Write-Output "Web assets synchronized to $targetRoot"
