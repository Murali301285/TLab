@echo off
echo ==========================================
echo    Building TLab Platform for Windows Server
echo ==========================================

echo [1/5] Running Next.js Build...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Build failed! Exiting.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/5] Creating Deployment Directory...
if exist deployment (
    rmdir /s /q deployment
)
mkdir deployment

echo.
echo [3/5] Copying Standalone Build...
xcopy /E /I /Q .next\standalone deployment

echo.
echo [3.5/5] Copying Prisma Engines...
mkdir deployment\node_modules\.prisma
xcopy /E /I /Q /Y node_modules\.prisma deployment\node_modules\.prisma

echo.
echo [4/5] Copying Static Assets...
mkdir deployment\.next\static
xcopy /E /I /Q /Y .next\static deployment\.next\static
xcopy /E /I /Q /Y public deployment\public

echo.
echo [4.5/5] Creating Static Fallback...
mkdir deployment\public\_next\static
xcopy /E /I /Q /Y .next\static deployment\public\_next\static


echo.
echo [5/5] Configuring Start Scripts...
echo @echo off > deployment\run_server_4401.bat
echo set PORT=4401 >> deployment\run_server_4401.bat
echo set HOSTNAME=0.0.0.0 >> deployment\run_server_4401.bat
echo echo Starting 3Vidya Server on Port 4401... >> deployment\run_server_4401.bat
echo node server.js >> deployment\run_server_4401.bat
echo pause >> deployment\run_server_4401.bat

echo.
echo [6/5] Generating PM2 Configuration...
echo module.exports = { > deployment\ecosystem.config.js
echo   apps: [{ >> deployment\ecosystem.config.js
echo     name: '3vidya', >> deployment\ecosystem.config.js
echo     script: 'server.js', >> deployment\ecosystem.config.js
echo     instances: 1, >> deployment\ecosystem.config.js
echo     exec_mode: 'fork', >> deployment\ecosystem.config.js
echo     env: { >> deployment\ecosystem.config.js
echo       NODE_ENV: 'production', >> deployment\ecosystem.config.js
echo       PORT: 4401, >> deployment\ecosystem.config.js
echo       HOSTNAME: '0.0.0.0' >> deployment\ecosystem.config.js
echo     } >> deployment\ecosystem.config.js
echo   }] >> deployment\ecosystem.config.js
echo }; >> deployment\ecosystem.config.js

echo.
echo [SUCCESS] Deployment package created in 'deployment' folder.
echo.
echo instructions:
echo 1. Copy the 'deployment' folder to your Windows Server.
echo 2. Ensure Node.js (v18+) is installed on the server.
echo 3. Copy your .env or .env.local file into the 'deployment' folder.
echo 4. To start with batch file: Double-click 'run_server_5001.bat'.
echo 5. To start with PM2: Run 'pm2 start ecosystem.config.js' inside the folder.
echo 6. To allow external access: Ensure Windows Firewall allows Port 5001.
echo    (Command: netsh advfirewall firewall add rule name="TLab Port 5001" dir=in action=allow protocol=TCP localport=5001)
echo.
pause
