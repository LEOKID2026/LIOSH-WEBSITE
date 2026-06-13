@echo off
setlocal EnableDelayedExpansion

title LIOSH-WEBSITE - Auto Git Push

cd /d "%~dp0"

set "REPO_URL=https://github.com/LEOKID2026/LIOSH-WEBSITE.git"
set "REPO_WEB=https://github.com/LEOKID2026/LIOSH-WEBSITE"

echo.
echo ================================
echo LIOSH-WEBSITE - Auto Git Push
echo ================================
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERROR: This folder is not a Git repository.
  pause
  exit /b 1
)

git remote set-url origin %REPO_URL%

for /f "delims=" %%b in ('git branch --show-current') do set "WORK_BRANCH=%%b"

echo Repository: %REPO_WEB%
echo You are on: %WORK_BRANCH%
echo LIVE SITE deploys from: main only
echo.

echo Pulling origin/%WORK_BRANCH%...
git pull --rebase --autostash origin %WORK_BRANCH% 2>nul
if errorlevel 1 echo Note: remote branch "%WORK_BRANCH%" not found yet - continuing.

echo.
echo Adding all changes...
git add -A

set "DID_COMMIT=0"

git diff --cached --quiet
if errorlevel 2 (
  echo ERROR: git diff failed.
  pause
  exit /b 1
)

if errorlevel 1 (
  echo Committing on %WORK_BRANCH%...
  git commit -m "Auto update - %date% %time%"
  if errorlevel 1 (
    echo ERROR: git commit failed.
    pause
    exit /b 1
  )
  set "DID_COMMIT=1"
) else (
  echo No new changes to commit.
)

if /I not "%WORK_BRANCH%"=="main" (
  echo.
  echo Pushing backup to origin/%WORK_BRANCH%...
  git push -u origin %WORK_BRANCH%
  if errorlevel 1 (
    echo ERROR: push to %WORK_BRANCH% failed.
    pause
    exit /b 1
  )
)

echo.
echo ========================================
echo Updating MAIN ^(triggers Vercel Production^)
echo ========================================

git fetch origin main 2>nul
git checkout main
if errorlevel 1 (
  echo ERROR: could not switch to main.
  pause
  exit /b 1
)

git pull --rebase origin main
if errorlevel 1 (
  echo ERROR: git pull on main failed.
  git checkout %WORK_BRANCH%
  pause
  exit /b 1
)

if /I not "%WORK_BRANCH%"=="main" (
  git merge %WORK_BRANCH% -m "Auto update production from %WORK_BRANCH% - %date% %time%"
  if errorlevel 1 (
    echo ERROR: merge into main failed. Fix conflicts, then run again.
    git checkout %WORK_BRANCH%
    pause
    exit /b 1
  )
)

git rev-list --count origin/main..HEAD 2>nul | findstr /R "^0$" >nul
if not errorlevel 1 (
  if "!DID_COMMIT!"=="0" (
    echo.
    echo main is already on GitHub - nothing new to deploy.
    git checkout %WORK_BRANCH% 2>nul
    echo Live site: https://liosh-website.vercel.app
    pause
    exit /b 0
  )
)

echo Pushing main to GitHub...
git push origin main
if errorlevel 1 (
  echo ERROR: git push main failed.
  git checkout %WORK_BRANCH%
  pause
  exit /b 1
)

if /I not "%WORK_BRANCH%"=="main" git checkout %WORK_BRANCH%

echo.
echo ================================
echo SUCCESS - Production deploy triggered
echo ================================
echo GitHub main: https://github.com/LEOKID2026/LIOSH-WEBSITE/tree/main
echo Live site:   https://liosh-website.vercel.app
echo Vercel:      https://vercel.com/erans-projects/liosh-website/deployments?filterBranch=main
echo.
echo Vercel usually starts building within 30 seconds.
echo.
pause
