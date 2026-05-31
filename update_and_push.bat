@echo off
setlocal

title LIOSH-WEBSITE - Auto Git Push

cd /d "%~dp0"

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

git remote set-url origin https://github.com/GLA7479/LIOSH-WEBSITE.git

for /f "delims=" %%b in ('git branch --show-current') do set BRANCH=%%b

if /I not "%BRANCH%"=="main" (
  echo ERROR: Current branch is "%BRANCH%". Expected "main".
  echo Aborting to avoid pushing the wrong branch.
  pause
  exit /b 1
)

echo Pulling latest changes from origin/main...
git pull --rebase --autostash origin main
if errorlevel 1 (
  echo.
  echo ERROR: git pull/rebase failed. Resolve the issue manually.
  pause
  exit /b 1
)

echo.
echo Adding all changes...
git add -A

git diff --cached --quiet
if errorlevel 2 (
  echo ERROR: git diff failed.
  pause
  exit /b 1
)

if not errorlevel 1 (
  echo.
  echo No changes to commit.
  echo.
  git status --short
  pause
  exit /b 0
)

echo.
echo Committing changes...
git commit -m "Auto update - %date% %time%"
if errorlevel 1 (
  echo.
  echo ERROR: git commit failed.
  pause
  exit /b 1
)

echo.
echo Pushing to GitHub origin/main...
git push origin main
if errorlevel 1 (
  echo.
  echo ERROR: git push failed.
  pause
  exit /b 1
)

echo.
echo SUCCESS: LIOSH-WEBSITE pushed to GitHub.
echo.
pause
