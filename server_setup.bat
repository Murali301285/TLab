@echo off
setlocal EnableDelayedExpansion

:: Ensure we are running from the script's directory
cd /d "%~dp0"

echo ===================================================
echo   TLab Learning Platform - Server Setup Assistant
echo ===================================================

:: Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js v18+ from https://nodejs.org/
    pause
    exit /b 1
)

:: Check for PM2
call npm list -g pm2 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] PM2 is not installed globally. Installing...
    call npm install -g pm2
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Failed to install PM2. Try running as Administrator.
        pause
        exit /b 1
    )
)

echo.
echo [1/4] Installing Dependencies...
if not exist node_modules (
    call npm install
) else (
    echo [INFO] Node modules exist. Ensuring correct Prisma version...
    call npm install prisma@5.19.1 @prisma/client@5.19.1 --save-exact
    call npm install
)

echo.
echo [1.5/4] Stopping Existing Processes...
call pm2 stop 3vidya >nul 2>nul
call pm2 delete 3vidya >nul 2>nul

echo.
echo [2/4] Generating Database Client...
echo.
echo [2/4] Generating Database Client...
:: Force use of local project prisma to avoid version mismatch
call npx prisma generate

echo.
echo.
echo [2.5/4] Verifying Database Connection...
node --env-file=.env debug_prisma.js
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Database connection failed! Check .env and debug_prisma.js logs.
    pause
    exit /b 1
)

echo.
echo [3/4] Building Application...
:: Clean previous build to avoid EPERM
if exist .next rmdir /s /q .next
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed! Check the logs above.
    pause
    exit /b 1
)

echo.
echo [3.5/4] Copying Static Assets to Standalone...
:: Create directory structure
if not exist .next\standalone\public mkdir .next\standalone\public
if not exist .next\standalone\.next\static mkdir .next\standalone\.next\static

:: Copy Public folder
xcopy /E /I /Q /Y public .next\standalone\public

:: Copy Static assets
xcopy /E /I /Q /Y .next\static .next\standalone\.next\static

echo.
echo [3.6/4] Handling 3VidyaNew Nested Structure...
if exist .next\standalone\3VidyaNew (
    echo [INFO] Detected 3VidyaNew subfolder. Copying assets there too...
    if not exist .next\standalone\3VidyaNew\public mkdir .next\standalone\3VidyaNew\public
    if not exist .next\standalone\3VidyaNew\.next\static mkdir .next\standalone\3VidyaNew\.next\static
    xcopy /E /I /Q /Y public .next\standalone\3VidyaNew\public
    xcopy /E /I /Q /Y .next\static .next\standalone\3VidyaNew\.next\static
    
    echo [INFO] Copying .env to 3VidyaNew folder...
    copy /Y .env .next\standalone\3VidyaNew\.env

    echo [INFO] CRITICAL FIX: Copying FULL node_modules to standalone...
    :: This might take a while but ensures absolutely no missing dependencies
    xcopy /E /I /Q /Y node_modules .next\standalone\3VidyaNew\node_modules
)

echo.
echo [3.75/4] Creating Static Fallback...
if not exist .next\standalone\public\_next\static mkdir .next\standalone\public\_next\static
xcopy /E /I /Q /Y .next\static .next\standalone\public\_next\static

echo.
echo [4/4] Starting Application with PM2...
:: Stop legacy process if it exists
call pm2 stop tlab-platform >nul 2>nul
call pm2 delete tlab-platform >nul 2>nul

:: Check if new process exists
call pm2 describe 3vidya >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Reloading existing process...
    call pm2 reload 3vidya
) else (
    echo Starting new process on Port 4401...
    
    :: Logic to find server.js
    if exist .next\standalone\3VidyaNew\server.js (
        echo [INFO] Found server.js in 3VidyaNew subfolder.
    ) else if exist .next\standalone\server.js (
        echo [INFO] Found server.js in standalone root.
    ) else (
        echo [ERROR] server.js not found at .next\standalone\server.js OR .next\standalone\3VidyaNew\server.js
        echo Listing .next\standalone content for debug:
        dir .next\standalone
        pause
        exit /b 1
    )
    
    call pm2 start ecosystem.config.js
)
call pm2 save

echo.
echo ===================================================
echo   SUCCESS! Application is running on Port 4401.
echo ===================================================
echo.
echo To check status: pm2 status
echo To view logs:    pm2 logs 3vidya
echo.
pause
