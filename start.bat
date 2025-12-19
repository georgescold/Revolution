@echo off
cd /d "%~dp0"

echo ==========================================
echo      Lancement de Viralithe...
echo ==========================================

:: Open browser immediately (it might need a refresh if server is slow to start)
start "" "http://localhost:3000"

:: Run the development server
echo Demarrage du serveur...
npm run dev

pause
