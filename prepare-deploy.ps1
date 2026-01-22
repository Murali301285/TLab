# prepare-deploy.ps1
Write-Host "Preparing Standalone Deployment..." -ForegroundColor Cyan

$source = "d:\Dev\Tlab\tlab-learning-platform"
$dest = "d:\Dev\Tlab\tlab-learning-platform\.next\standalone"

# 1. Copy Public Folder (Assets, Placeholders)
Write-Host "Copying 'public' folder..."
Copy-Item -Path "$source\public\*" -Destination "$dest\public\" -Recurse -Force

# 2. Copy Static Assets (Next.js styles/scripts)
# Check if .next/static exists in dest, create if not
if (!(Test-Path "$dest\.next\static")) {
    New-Item -ItemType Directory -Force -Path "$dest\.next\static" | Out-Null
}
Write-Host "Copying '.next/static' folder..."
Copy-Item -Path "$source\.next\static\*" -Destination "$dest\.next\static\" -Recurse -Force

Write-Host "---------------------------------------------------" -ForegroundColor Green
Write-Host "✅ Deployment Ready in: $dest" -ForegroundColor Green
Write-Host "👉 Copy the CONTENTS of '$dest' to your Windows Server."
Write-Host "---------------------------------------------------"
