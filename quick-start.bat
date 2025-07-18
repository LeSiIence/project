@echo off
echo ===============================================
echo         Quick Start - Train Ticket System
echo ===============================================
echo.

echo Checking port 3000...
netstat -ano | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo Stopping existing process on port 3000...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
        taskkill /PID %%a /F >nul 2>&1
    )
    timeout /t 1 >nul
)

echo Starting server...
echo.
echo Server: http://localhost:3000
echo Test page: http://localhost:3000/
echo.
echo Press Ctrl+C to stop
echo.

node back-end.js 