@echo off
setlocal EnableDelayedExpansion

title LIOSH-WEBSITE - Pull from Git

cd /d "%~dp0"

set "REPO_URL=https://github.com/LEOKID2026/LIOSH-WEBSITE.git"
set "REPO_WEB=https://github.com/LEOKID2026/LIOSH-WEBSITE"

echo.
echo ================================
echo LIOSH-WEBSITE - Pull from Git
echo ================================
echo.
echo מוריד את הגרסה האחרונה מ-GitHub
echo Branch: main
echo Repo:   %REPO_WEB%
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERROR: התיקייה הזו אינה מאגר Git.
  pause
  exit /b 1
)

git remote set-url origin %REPO_URL%

for /f "delims=" %%b in ('git branch --show-current') do set "WAS_BRANCH=%%b"

if /I not "!WAS_BRANCH!"=="main" (
  echo עובר ל-main ^(היית על !WAS_BRANCH!^)...
  git checkout main
  if errorlevel 1 (
    echo ERROR: לא הצלחתי לעבור ל-main. שמור או stash שינויים מקומיים ונסה שוב.
    pause
    exit /b 1
  )
)

echo.
echo בודק עדכונים ב-GitHub...
git fetch origin main
if errorlevel 1 (
  echo ERROR: git fetch נכשל. בדוק חיבור לאינטרנט.
  pause
  exit /b 1
)

for /f "delims=" %%c in ('git rev-list --count HEAD..origin/main 2^>nul') do set "BEHIND=%%c"
if not defined BEHIND set "BEHIND=0"

if "!BEHIND!"=="0" (
  echo.
  echo ================================
  echo כבר מעודכן
  echo ================================
  echo אין commits חדשים ב-GitHub. התיקייה כבר בגרסה האחרונה.
  echo.
  git log -1 --oneline
  echo.
  pause
  exit /b 0
)

echo נמצאו !BEHIND! commit^(ים^) חדש^(ים^). מוריד...
echo.

git pull --rebase --autostash origin main
if errorlevel 1 (
  echo.
  echo ERROR: git pull נכשל.
  echo אם יש קונפליקט, פתור אותו ידנית ואז הרץ:
  echo   git rebase --continue
  echo או בטל:
  echo   git rebase --abort
  pause
  exit /b 1
)

echo.
echo ================================
echo SUCCESS - עודכן בהצלחה
echo ================================
echo GitHub: %REPO_WEB%/tree/main
echo.
echo Commits שהורדו:
git log --oneline -n !BEHIND!
echo.
echo Commit נוכחי:
git log -1 --oneline
echo.
pause
exit /b 0
