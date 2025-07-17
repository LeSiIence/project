@echo off
echo ===============================================
echo         Train Ticket System Startup
echo ===============================================
echo.

echo Step 1: Checking MySQL service status...
sc query MySQL80 | find "RUNNING" >nul
if %errorlevel% neq 0 (
    echo MySQL service is not running, starting it...
    net start MySQL80
    if %errorlevel% neq 0 (
        rem Check if service is now running after attempt
        sc query MySQL80 | find "RUNNING" >nul
        if %errorlevel% neq 0 (
            echo Error: Cannot start MySQL service
            echo Please run as Administrator
            pause
            exit /b 1
        ) else (
            echo MySQL service started successfully
        )
    ) else (
        echo MySQL service started successfully
    )
) else (
    echo MySQL service is running
)

echo.
echo Step 2: Checking port 3000...
netstat -ano | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo Port 3000 is occupied, stopping existing process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
        echo Stopping process ID: %%a
        taskkill /PID %%a /F >nul 2>&1
    )
    timeout /t 2 >nul
) else (
    echo Port 3000 is available
)

echo.
echo Step 3: Installing dependencies...
npm install --silent
if %errorlevel% neq 0 (
    echo Error: npm install failed
    pause
    exit /b 1
)

echo.
echo Step 4: Testing MySQL connection...
node -e "
const mysql = require('mysql2/promise');
async function test() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'gnx051103'
        });
        await connection.execute('SELECT 1');
        await connection.end();
        console.log('MySQL connection successful');
        process.exit(0);
    } catch (error) {
        console.log('MySQL connection failed: ' + error.message);
        process.exit(1);
    }
}
test();"

if %errorlevel% neq 0 (
    echo.
    echo MySQL connection failed. Please configure password:
    echo 1. Run: node configure-mysql-password.js
    echo 2. Or run: mysql-reset-password-complete.bat
    echo.
    pause
    exit /b 1
)

echo.
echo Step 5: Starting Node.js server...
echo Server will start at: http://localhost:3000
echo Test page: http://localhost:3000/mysql-test.html
echo.
echo Press Ctrl+C to stop the server
echo.

node back-end.js 