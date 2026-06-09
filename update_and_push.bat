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

echo Current branch: %BRANCH%
echo.

echo Pulling latest changes from origin/%BRANCH%...
git pull --rebase --autostash origin %BRANCH% 2>nul
if errorlevel 1 (
  echo Note: No remote updates for "%BRANCH%" yet - continuing.
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
echo Pushing to GitHub origin/%BRANCH%...
git push -u origin %BRANCH%
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
