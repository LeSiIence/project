@echo off
:menu
cls
echo ===============================================
echo         Train Ticket System - Startup Menu
echo ===============================================
echo.
echo 1. Full startup (recommended for first time)
echo 2. Quick start (for configured environment)
echo 3. Configure MySQL password
echo 4. Reset MySQL password
echo 5. Test MySQL connection
echo 6. Exit
echo.
set /p choice=Please choose an option (1-6): 

if "%choice%"=="1" goto full_startup
if "%choice%"=="2" goto quick_start
if "%choice%"=="3" goto configure_password
if "%choice%"=="4" goto reset_password
if "%choice%"=="5" goto test_connection
if "%choice%"=="6" goto exit
echo Invalid choice. Please try again.
pause
goto menu

:full_startup
echo.
echo Starting full startup...
call start-service.bat
pause
goto menu

:quick_start
echo.
echo Starting quick start...
call quick-start.bat
pause
goto menu

:configure_password
echo.
echo Launching password configuration tool...
node configure-mysql-password.js
pause
goto menu

:reset_password
echo.
echo Launching password reset tool...
echo Please run the following as Administrator:
echo mysql-reset-password-complete.bat
pause
goto menu

:test_connection
echo.
echo Testing MySQL connection...
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
        console.log('SUCCESS: MySQL connection works!');
        process.exit(0);
    } catch (error) {
        console.log('FAILED: ' + error.message);
        process.exit(1);
    }
}
test();"
pause
goto menu

:exit
echo.
echo Goodbye!
exit /b 0 