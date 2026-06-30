@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

set "NODE=C:\Program Files\nodejs\node.exe"
set "SUBJECTS=math,geometry,hebrew,english,science,moledet-geography,history"

echo.
echo ============================================================
echo   MASS 1000 PREFLIGHT — 2-level model (regular + advanced), science regular-only
echo   final launch subjects + history
echo   subjects: %SUBJECTS%
echo   Closed PASS runs (do not touch):
echo     mass-2026-06-28T06-22-20
echo     mass-2026-06-29T03-58-49
echo ============================================================
echo.

if not exist "%NODE%" (
  echo [ERROR] Node not found: %NODE%
  goto :fail
)
if not exist ".env.local" (
  echo [ERROR] Missing .env.local
  goto :fail
)

"%NODE%" --env-file=.env.local scripts/qa/run-mass-virtual-students.mjs --preflight-only --students=1000 --parents=50 --days=30 --subjects=%SUBJECTS% --grades=g1,g2,g3,g4,g5,g6 --mode=staging

set EXITCODE=%ERRORLEVEL%
echo.
if %EXITCODE% NEQ 0 (
  echo [PREFLIGHT FAILED] exit=%EXITCODE% — do NOT start 1000
) else (
  echo [PREFLIGHT PASS] safe to run START-MASS-1000-FINAL-LAUNCH-SUBJECTS.bat
)
echo.
pause
exit /b %EXITCODE%

:fail
pause
exit /b 1
