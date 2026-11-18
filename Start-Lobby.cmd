@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 24 or newer, then run this launcher again.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm.cmd ci
  if errorlevel 1 exit /b 1
)
call npm.cmd run setup
if errorlevel 1 exit /b 1
echo.
echo Open http://127.0.0.1:3000 in your browser.
echo Keep this window open. Press Ctrl+C to stop LOBBY.
call npm.cmd start





































