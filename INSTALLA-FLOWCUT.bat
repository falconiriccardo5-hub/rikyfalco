@echo off
REM Installazione completa di FlowCut: Node.js, dipendenze, FFmpeg, whisper.cpp,
REM modello di trascrizione e app (con collegamento sul desktop).
REM Basta un doppio clic. Si puo' rilanciare: i passaggi gia' fatti vengono saltati.
setlocal
cd /d "%~dp0"
title Installazione FlowCut
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\scripts\installa.ps1" %*
set ERR=%ERRORLEVEL%
echo.
pause
exit /b %ERR%
