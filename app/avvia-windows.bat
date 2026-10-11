@echo off
REM Avvio di FlowCut dal codice sorgente su Windows.
REM Al primo avvio installa le dipendenze (serve Node.js 20 o superiore).
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js non trovato.
  echo  Installa la versione LTS da https://nodejs.org e riavvia questo script.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installazione delle dipendenze ^(solo al primo avvio, qualche minuto^)...
  call npm install
  if errorlevel 1 (
    echo Installazione non riuscita. Controlla la connessione e riprova.
    pause
    exit /b 1
  )
)

echo Compilazione e avvio di FlowCut...
call npm run start
if errorlevel 1 pause
