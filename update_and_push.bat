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

for /f "delims=" %%b in ('git branch --show-current') do set "BRANCH=%%b"

echo Repository:  %REPO_WEB%
echo Branch:      %BRANCH%
echo Destination: %REPO_WEB%/tree/%BRANCH%
echo.

if /I not "%BRANCH%"=="main" (
  echo NOTE: You are NOT on "main".
  echo       - Files go to GitHub branch: %BRANCH%
  echo       - Vercel PRODUCTION deploys only from "main" ^(liosh-website.vercel.app^)
  echo       - To update the live site: merge %BRANCH% into main, then push main.
  echo       - Preview deploy may appear under this branch in Vercel Deployments.
  echo.
)

echo Pulling latest changes from origin/%BRANCH%...
git pull --rebase --autostash origin %BRANCH% 2>nul
if errorlevel 1 (
  echo Note: No remote updates for "%BRANCH%" yet - continuing.
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
  git rev-list --count origin/%BRANCH%..HEAD 2>nul | findstr /R "^0$" >nul
  if not errorlevel 1 (
    echo.
    echo Already up to date on GitHub - nothing to push.
    echo View branch: %REPO_WEB%/tree/%BRANCH%
    echo.
    git status --short
    pause
    exit /b 0
  )
  echo Local commits not on GitHub yet - pushing now...
)

echo.
echo Pushing to GitHub...
echo   origin/%BRANCH%
echo   %REPO_WEB%/tree/%BRANCH%
echo.
git push -u origin %BRANCH%
if errorlevel 1 (
  echo.
  echo ERROR: git push failed.
  pause
  exit /b 1
)

echo.
echo ================================
echo SUCCESS: pushed to GitHub
echo ================================
echo Repository: %REPO_WEB%
echo Branch:     %BRANCH%
echo Commits:    %REPO_WEB%/commits/%BRANCH%
echo Files:      %REPO_WEB%/tree/%BRANCH%
echo.

if /I not "%BRANCH%"=="main" (
  echo Open PR to merge into main ^(updates Production^):
  echo   %REPO_WEB%/compare/main...%BRANCH%?expand=1
  echo.
  echo Vercel Production ^(main only^): https://vercel.com/erans-projects/liosh-website/deployments?filterBranch=main
  echo Vercel this branch:            https://vercel.com/erans-projects/liosh-website/deployments?filterBranch=%BRANCH%
  echo.
) else (
  echo Vercel should start a Production build shortly:
  echo   https://vercel.com/erans-projects/liosh-website/deployments?filterBranch=main
  echo.
)

pause
