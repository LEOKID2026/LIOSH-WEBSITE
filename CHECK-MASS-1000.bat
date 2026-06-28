@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Folder: %CD%
echo.
if exist "C:\Program Files\nodejs\node.exe" (
  echo [OK] Node: C:\Program Files\nodejs\node.exe
  "C:\Program Files\nodejs\node.exe" --version
) else (
  echo [FAIL] Node not at C:\Program Files\nodejs\node.exe
  where node 2>nul || echo [FAIL] node not in PATH
)
echo.
if exist ".env.local" (echo [OK] .env.local) else (echo [FAIL] .env.local missing)
if exist "reports\mass-simulation\mass-2026-06-28T06-22-20\manifest.json" (echo [OK] manifest.json) else (echo [FAIL] manifest.json missing)
if exist "scripts\qa\run-mass-virtual-students.mjs" (echo [OK] run script) else (echo [FAIL] run script missing)
echo.
echo If all OK - double-click START-MASS-1000-RESUME.bat in this folder
echo.
pause
