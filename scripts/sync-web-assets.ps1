$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$targetRoot = Join-Path $projectRoot "android/app/src/main/assets/www"
$files = @(
    "index.html",
    "app.js",
    "style.css",
    "service-worker.js",
    "manifest.webmanifest",
    "manifest-meh.webmanifest",
    "manifest-zh.webmanifest",
    "favicon.ico"
)

New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null

foreach ($file in $files) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination (Join-Path $targetRoot $file) -Force
}

foreach ($directory in @("fonts", "icons")) {
    $sourceDirectory = Join-Path $projectRoot $directory
    $targetDirectory = Join-Path $targetRoot $directory
    New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null
    Copy-Item -Path (Join-Path $sourceDirectory "*") -Destination $targetDirectory -Recurse -Force
}

Write-Output "Web assets synchronized to $targetRoot"
