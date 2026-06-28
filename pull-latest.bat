@echo off
setlocal EnableDelayedExpansion

title LIOSH-WEBSITE - Pull Latest

cd /d "%~dp0"

set "REPO_WEB=https://github.com/LEOKID2026/LIOSH-WEBSITE"

echo.
echo ================================
echo LIOSH-WEBSITE - Pull Latest
echo ================================
echo.
echo Local only - does NOT deploy or change Production.
echo This resets the folder to match GitHub ^(local edits are discarded^).
echo Keeps: pull-latest.bat and start-local.bat
echo Repo: %REPO_WEB%
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERROR: This folder is not a Git repository.
  pause
  exit /b 1
)

for /f "delims=" %%b in ('git branch --show-current 2^>nul') do set "BRANCH=%%b"
if not defined BRANCH set "BRANCH=main"
echo Branch: !BRANCH!
echo.

for /f "delims=" %%h in ('certutil -hashfile package-lock.json MD5 2^>nul ^| findstr /V "hash" ^| findstr /V "CertUtil"') do set "LOCK_BEFORE=%%h"
if not defined LOCK_BEFORE set "LOCK_BEFORE=missing"

echo Fetching from origin...
git fetch origin
if errorlevel 1 (
  echo ERROR: git fetch failed.
  pause
  exit /b 1
)

echo Resetting to origin/!BRANCH!...
git reset --hard origin/!BRANCH!
if errorlevel 1 (
  echo ERROR: git reset failed.
  pause
  exit /b 1
)

echo Removing untracked files ^(except the two .bat launchers^)...
git clean -fd -e pull-latest.bat -e start-local.bat
if errorlevel 1 (
  echo ERROR: git clean failed.
  pause
  exit /b 1
)

for /f "delims=" %%h in ('certutil -hashfile package-lock.json MD5 2^>nul ^| findstr /V "hash" ^| findstr /V "CertUtil"') do set "LOCK_AFTER=%%h"
if not defined LOCK_AFTER set "LOCK_AFTER=missing"

if /I not "!LOCK_BEFORE!"=="!LOCK_AFTER!" (
  echo.
  echo package-lock.json changed - installing dependencies with npm ci...
  call npm ci
  if errorlevel 1 (
    echo ERROR: npm ci failed.
    pause
    exit /b 1
  )
) else (
  echo.
  echo Dependencies unchanged - skipping npm install.
)

echo.
echo ================================
echo SUCCESS - folder matches GitHub
echo ================================
echo.
echo Next step: double-click start-local.bat
echo Local URL: http://127.0.0.1:3002
echo.
pause
exit /b 0
