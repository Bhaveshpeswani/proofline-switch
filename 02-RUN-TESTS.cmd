@echo off
cd /d "%~dp0"
echo Testing the backend...
call npm test
if errorlevel 1 (
  echo TESTS FAILED. Do not submit yet.
  pause
  exit /b 1
)
echo.
echo Checking running business tool...
node tool.mjs facts
pause
