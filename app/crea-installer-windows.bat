@echo off
REM Crea l'installabile di FlowCut per Windows (dist\FlowCut-Setup-x.y.z.exe).
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js non trovato: installalo da https://nodejs.org
  pause
  exit /b 1
)

echo Installazione delle dipendenze...
call npm install
if errorlevel 1 goto :errore

echo Creazione dell'installabile...
call npm run dist:win
if errorlevel 1 goto :errore

echo.
echo Fatto! L'installabile si trova nella cartella "dist".
start "" "%~dp0dist"
pause
exit /b 0

:errore
echo.
echo Si e' verificato un errore: leggi i messaggi qui sopra.
pause
exit /b 1
