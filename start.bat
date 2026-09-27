@echo off
title AudioCraft Studio - AI Voiceover DAW
cd /d "%~dp0"
color 0B

echo ======================================================================
echo    AudioCraft Studio (ACS) - Long-Form AI Voiceover DAW
echo ======================================================================
echo.
echo [1/2] Opening default browser at http://localhost:3000/...
start http://localhost:3000/
echo.
echo [2/2] Starting AudioCraft Studio Web Engine...
echo       Press [Ctrl + C] in this window to stop the studio.
echo.

call npm run dev

echo.
echo AudioCraft Studio has stopped.
pause
