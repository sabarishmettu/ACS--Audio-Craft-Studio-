@echo off
setlocal enabledelayedexpansion
title AudioCraft Studio - AI Voiceover & Long-Form TTS DAW
color 0B

echo ======================================================================
echo    🎙️  AudioCraft Studio (ACS) - Long-Form AI Voiceover DAW
echo ======================================================================
echo.

:: 1. Navigate to script directory
cd /d "%~dp0"

:: 2. Check Node.js and NPM
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js and npm are required but were not found in PATH!
    echo Please install Node.js from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

:: 3. Configure Python VibeVoice Environment
set "PYTHON_EXE=C:\Users\rayud\OneDrive\Desktop\Projects\VibeVoice\.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    if defined VIBEVOICE_PYTHON (
        set "PYTHON_EXE=%VIBEVOICE_PYTHON%"
    )
)

:: 4. Check if VibeVoice is already running on port 8000
echo [1/3] Checking VibeVoice 1.5B GPU Neural Backend (Port 8000)...
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
    echo       ✅ VibeVoice Neural Engine is already active on port 8000!
) else (
    if exist "%PYTHON_EXE%" (
        echo       🚀 Starting VibeVoice 1.5B on RTX GPU (port 8000)...
        start "VibeVoice 1.5B Neural Engine" /min "%PYTHON_EXE%" scripts\run_vibevoice_server.py --port 8000 --model vibevoice-1.5b --preload
        echo       ⏳ Waiting 3 seconds for neural weights warmup...
        ping 127.0.0.1 -n 4 >nul
    ) else (
        echo       ⚠️ Local Python environment not found at: %PYTHON_EXE%
        echo       Cloud TTS and Web Voice engines will remain fully available.
    )
)

echo.
echo [2/3] Launching Web Browser at http://localhost:3000/...
start http://localhost:3000/

echo.
echo [3/3] Starting AudioCraft Studio Web Server (Port 3000)...
echo ======================================================================
echo   🌐 Studio URL:     http://localhost:3000/
echo   🧠 Neural Backend: http://127.0.0.1:8000/ (VibeVoice 1.5B GPU)
echo   📁 Project Folder: %CD%
echo   💡 Press [Ctrl + C] in this window to stop the studio.
echo ======================================================================
echo.

call npm run dev

echo.
echo AudioCraft Studio server has stopped.
pause
