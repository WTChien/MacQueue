@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Error: Node.js is not installed. Please install Node.js 18+ first.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo Error: npm is not installed. Please install npm first.
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)

echo Starting MacQueue with Netlify Dev...
call npx netlify dev

endlocal