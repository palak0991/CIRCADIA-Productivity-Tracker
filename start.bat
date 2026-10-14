@echo off
title Circadia Launcher
echo ========================================================
echo        Starting 24-Hour Visualizer Platform
echo ========================================================
echo.

start "24h-Python-Analytics" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0start-analytics.ps1"
timeout /t 3 /nobreak >nul
start "24h-Backend" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0start-backend.ps1"
timeout /t 5 /nobreak >nul
start "24h-Frontend" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0start-frontend.ps1"

echo All services launched in separate windows!
echo - Python Analytics: http://localhost:8000/health
echo - Spring Backend:   http://localhost:8080/api/health
echo - React Frontend:   http://localhost:5173
echo.
pause
