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
echo Branch: main only ^(Vercel Production^)
echo Repo:   %REPO_WEB%
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERROR: This folder is not a Git repository.
  pause
  exit /b 1
)

git remote set-url origin %REPO_URL%

for /f "delims=" %%b in ('git branch --show-current') do set "WAS_BRANCH=%%b"

if /I not "!WAS_BRANCH!"=="main" (
  echo Switching to main ^(was on !WAS_BRANCH!^)...
  git checkout main
  if errorlevel 1 (
    echo ERROR: could not switch to main. Commit or stash changes, then retry.
    pause
    exit /b 1
  )
)

echo Pulling latest main...
git pull --rebase --autostash origin main
if errorlevel 1 (
  echo ERROR: git pull failed.
  pause
  exit /b 1
)

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
  echo Committing...
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

git rev-list --count origin/main..HEAD 2>nul | findstr /R "^0$" >nul
if not errorlevel 1 (
  if "!DID_COMMIT!"=="0" (
    echo.
    echo Already up to date on GitHub - nothing to push.
    echo Live site: https://liosh-website.vercel.app
    pause
    exit /b 0
  )
)

echo.
echo Pushing main to GitHub...
git push -u origin main
if errorlevel 1 (
  echo ERROR: git push failed.
  pause
  exit /b 1
)

echo.
echo ================================
echo SUCCESS
echo ================================
echo GitHub:  %REPO_WEB%/tree/main
echo Live:    https://liosh-website.vercel.app
echo Vercel:  https://vercel.com/erans-projects/liosh-website/deployments?filterBranch=main
echo.
echo Vercel build starts within ~30 seconds after push.
echo.
pause
