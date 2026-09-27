# AudioCraft Studio - One-Click Launcher for PowerShell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "AudioCraft Studio - AI Voiceover DAW"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   🎙️  AudioCraft Studio (ACS) - Long-Form AI Voiceover DAW" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

# 1. Check NPM
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js and npm are required but were not found in PATH!" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}

# 2. Check / Start VibeVoice
$pythonExe = "C:\Users\rayud\OneDrive\Desktop\Projects\VibeVoice\.venv\Scripts\python.exe"
$portActive = (Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -InformationLevel Quiet)

Write-Host "[1/3] Checking VibeVoice 1.5B GPU Neural Backend (Port 8000)..." -ForegroundColor Yellow
if ($portActive) {
    Write-Host "      ✅ VibeVoice Neural Engine is already active on port 8000!" -ForegroundColor Green
} else {
    if (Test-Path $pythonExe) {
        Write-Host "      🚀 Starting VibeVoice 1.5B on RTX GPU (port 8000)..." -ForegroundColor Yellow
        Start-Process -FilePath $pythonExe -ArgumentList "scripts\run_vibevoice_server.py --port 8000 --model vibevoice-1.5b --preload" -WindowStyle Minimized
        Start-Sleep -Seconds 3
    } else {
        Write-Host "      ⚠️ Local Python not found at: $pythonExe" -ForegroundColor DarkYellow
    }
}

Write-Host ""
Write-Host "[2/3] Launching Web Browser at http://localhost:3000/..." -ForegroundColor Yellow
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:3000/"
} | Out-Null

Write-Host ""
Write-Host "[3/3] Starting AudioCraft Studio Web Server (Port 3000)..." -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  🌐 Studio URL:     http://localhost:3000/" -ForegroundColor White
Write-Host "  🧠 Neural Backend: http://127.0.0.1:8000/ (VibeVoice 1.5B GPU)" -ForegroundColor White
Write-Host "  📁 Project Folder: $PSScriptRoot" -ForegroundColor White
Write-Host "  💡 Press [Ctrl + C] in this window to stop the studio." -ForegroundColor DarkGray
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""

npm run dev
