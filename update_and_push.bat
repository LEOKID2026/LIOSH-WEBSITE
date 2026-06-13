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

echo Repository:  %REPO_WEB%
echo Work branch: %WORK_BRANCH%
echo Production:  %REPO_WEB%/tree/main  ^(Vercel live site^)
echo.

echo Pulling latest from origin/%WORK_BRANCH%...
git pull --rebase --autostash origin %WORK_BRANCH% 2>nul
if errorlevel 1 (
  echo Note: No remote branch "%WORK_BRANCH%" yet - continuing.
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
  echo.
  echo Committing changes...
  git commit -m "Auto update - %date% %time%"
  if errorlevel 1 (
    echo.
    echo ERROR: git commit failed.
    pause
    exit /b 1
  )
  set "DID_COMMIT=1"
) else (
  echo No new changes to commit.
)

if "!DID_COMMIT!"=="0" (
  git rev-list --count origin/%WORK_BRANCH%..HEAD 2>nul | findstr /R "^0$" >nul
  if not errorlevel 1 (
    if /I not "%WORK_BRANCH%"=="main" (
      goto :DeployMain
    )
    echo.
    echo Already up to date on GitHub - nothing to push.
    echo Live site: %REPO_WEB%/tree/main
    echo.
    git status --short
    pause
    exit /b 0
  )
  echo Local commits not on GitHub yet - pushing now...
)

echo.
echo [1/2] Pushing work branch to GitHub...
echo   %REPO_WEB%/tree/%WORK_BRANCH%
echo.
git push -u origin %WORK_BRANCH%
if errorlevel 1 (
  echo.
  echo ERROR: git push failed for %WORK_BRANCH%.
  pause
  exit /b 1
)

if /I "%WORK_BRANCH%"=="main" goto :DoneMain

:DeployMain
echo.
echo [2/2] Updating PRODUCTION ^(main - triggers Vercel live site^)...
git fetch origin main 2>nul
git checkout main
if errorlevel 1 (
  echo ERROR: could not switch to main.
  git checkout %WORK_BRANCH%
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

git merge %WORK_BRANCH% -m "Auto update production from %WORK_BRANCH% - %date% %time%"
if errorlevel 1 (
  echo.
  echo ERROR: merge into main failed - fix conflicts manually.
  git checkout %WORK_BRANCH%
  pause
  exit /b 1
)

echo Pushing main to GitHub ^(Vercel Production build starts here^)...
git push origin main
if errorlevel 1 (
  echo ERROR: git push main failed.
  git checkout %WORK_BRANCH%
  pause
  exit /b 1
)

git checkout %WORK_BRANCH%
if errorlevel 1 (
  echo WARNING: main pushed OK but could not switch back to %WORK_BRANCH%.
)

goto :Success

:DoneMain
echo.
echo Pushed directly to main - Vercel Production build should start now.

:Success
echo.
echo ================================
echo SUCCESS
echo ================================
echo Work branch: %REPO_WEB%/tree/%WORK_BRANCH%
echo PRODUCTION:  %REPO_WEB%/tree/main
echo Live site:   https://liosh-website.vercel.app
echo Vercel:      https://vercel.com/erans-projects/liosh-website/deployments?filterBranch=main
echo.
pause
