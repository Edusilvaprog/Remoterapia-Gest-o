@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\editor-visual\start.ps1"
if errorlevel 1 exit /b 1
start "" "http://localhost:3010/"
