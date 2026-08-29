@echo off
title 24 Hour Visualizer Launcher
echo ========================================================
echo        Starting 24 Hour Visualizer Platform
echo ========================================================
echo.

start "24h-Backend" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0start-backend.ps1"
timeout /t 5 /nobreak >nul
start "24h-Frontend" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0start-frontend.ps1"

echo Both services launched in separate windows!
echo - Backend:  http://localhost:8080/api/health
echo - Frontend: http://localhost:5173
echo.
pause
