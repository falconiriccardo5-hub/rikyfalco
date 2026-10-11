@echo off
REM ==========================================================================
REM  FlowCut - installazione completa con un doppio clic.
REM
REM  Funziona in due modi:
REM   - dentro la cartella del progetto (ZIP estratto): usa quei file;
REM   - DA SOLO (hai scaricato solo questo .bat): scarica FlowCut da GitHub
REM     in %LOCALAPPDATA%\FlowCut\sorgente e poi installa tutto.
REM
REM  Installa: Node.js (se manca), dipendenze e FFmpeg, whisper.cpp,
REM  modello Whisper, impostazioni, e l'app con collegamento sul desktop.
REM  Si puo' rilanciare: i passaggi gia' fatti vengono saltati.
REM ==========================================================================
setlocal
title Installazione FlowCut
cd /d "%~dp0"

set "SCRIPT=%~dp0app\scripts\installa.ps1"
if exist "%SCRIPT%" goto :installa

echo.
echo  File di FlowCut non trovati accanto a questo .bat: li scarico da GitHub...
set "SRC=%LOCALAPPDATA%\FlowCut\sorgente"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $ProgressPreference='SilentlyContinue';" ^
  "$dst='%SRC%'; $tmp=Join-Path $env:TEMP 'flowcut-src.zip'; $x=$dst + '_x'; $ok=$false;" ^
  "foreach ($b in @('main','claude/video-editing-automation-app-5iygkw')) {" ^
  "  try {" ^
  "    Invoke-WebRequest -UseBasicParsing -Uri ('https://github.com/falconiriccardo5-hub/rikyfalco/archive/refs/heads/' + $b + '.zip') -OutFile $tmp;" ^
  "    if (Test-Path $x) { Remove-Item -Recurse -Force $x }; Expand-Archive -Path $tmp -DestinationPath $x -Force;" ^
  "    $inner = Get-ChildItem $x -Directory | Select-Object -First 1;" ^
  "    if (Test-Path (Join-Path $inner.FullName 'app\scripts\installa.ps1')) {" ^
  "      if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }; Move-Item $inner.FullName $dst; $ok=$true; Write-Host ('  Codice scaricato (ramo ' + $b + ')'); break" ^
  "    }" ^
  "  } catch { Write-Host ('  Ramo ' + $b + ' non disponibile') }" ^
  "}" ^
  "if (Test-Path $x) { Remove-Item -Recurse -Force $x }; if (Test-Path $tmp) { Remove-Item -Force $tmp };" ^
  "if (-not $ok) { exit 1 }"
if errorlevel 1 (
  echo.
  echo  ERRORE: impossibile scaricare FlowCut. Controlla la connessione e riprova.
  pause
  exit /b 1
)
set "SCRIPT=%SRC%\app\scripts\installa.ps1"
if not exist "%SCRIPT%" (
  echo  ERRORE: script di installazione non trovato in %SRC%
  pause
  exit /b 1
)

:installa
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*
set ERR=%ERRORLEVEL%
echo.
pause
exit /b %ERR%
