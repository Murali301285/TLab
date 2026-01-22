$ErrorActionPreference = "Stop"

Write-Host "Preparing Deployment Folder..." -ForegroundColor Cyan

# Define paths
$root = Get-Location
$standalone = "$root\.next\standalone"
$public = "$root\public"
$static = "$root\.next\static"
$destStatic = "$root\.next\standalone\.next\static"
$destPublic = "$root\.next\standalone\public"

# Ensure standalone exists
if (-not (Test-Path $standalone)) {
    Write-Error "Standalone folder not found! Run 'npm run build' first."
}

# 1. Copy Public Folder
if (Test-Path $public) {
    Write-Host "Copying public folder..."
    Copy-Item -Path $public -Destination $standalone -Recurse -Force
}

# 2. Copy .next/static Folder to .next/standalone/.next/static
if (Test-Path $static) {
    Write-Host "Copying .next/static folder..."
    # Ensure parent dir exists
    if (-not (Test-Path "$root\.next\standalone\.next")) {
        New-Item -ItemType Directory -Path "$root\.next\standalone\.next" | Out-Null
    }
    Copy-Item -Path $static -Destination $destStatic -Recurse -Force
}

Write-Host "Success! The '$standalone' folder is ready for deployment." -ForegroundColor Green
Write-Host "Action: Zip or Copy '$standalone' to your server."
