@echo off
echo STARTING DEPLOYMENT PROCESS
echo --------------------------------

echo [1/4] Installing Dependencies...
call npm install
IF %ERRORLEVEL% NEQ 0 ( echo npm install failed & exit /b %ERRORLEVEL% )

echo [2/4] Building Project...
call npm run build
IF %ERRORLEVEL% NEQ 0 ( echo Build failed & exit /b %ERRORLEVEL% )

echo [3/4] Preparing Standalone Artifacts...
powershell -ExecutionPolicy Bypass -File prepare-deploy.ps1
IF %ERRORLEVEL% NEQ 0 ( echo Preparation failed & exit /b %ERRORLEVEL% )

echo [4/4] Configuring PM2...
REM Check if PM2 is installed
call pm2 -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo PM2 is not installed globally. Installing PM2...
    call npm install -g pm2
)

IF EXIST ecosystem.config.js (
    echo Starting/Reloading PM2...
    call pm2 reload ecosystem.config.js --env production --update-env || call pm2 start ecosystem.config.js --env production
    call pm2 save
) ELSE (
    echo ecosystem.config.js missing!
)

echo --------------------------------
echo DEPLOYMENT COMPLETE
echo Access the app at http://localhost:3000
pause
