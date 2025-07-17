@echo off
echo ===============================================
echo      MySQL Password Reset Tool (Complete)
echo ===============================================
echo.
echo This script will reset MySQL root password to empty
echo Please run this script as Administrator
echo.
pause

echo.
echo Step 1: Stopping MySQL service...
net stop MySQL80
if %errorlevel% neq 0 (
    echo Error: Cannot stop MySQL service, please run as Administrator
    pause
    exit /b 1
)

echo.
echo Step 2: Creating password reset SQL file...
mkdir C:\temp 2>nul
echo USE mysql; > C:\temp\reset-mysql-password.sql
echo UPDATE user SET authentication_string='' WHERE User='root' AND Host='localhost'; >> C:\temp\reset-mysql-password.sql
echo ALTER USER 'root'@'localhost' IDENTIFIED BY ''; >> C:\temp\reset-mysql-password.sql
echo FLUSH PRIVILEGES; >> C:\temp\reset-mysql-password.sql

echo.
echo Step 3: Starting MySQL safe mode...
echo Please wait for MySQL to start in safe mode and execute reset...
echo.
start /wait "MySQL Safe Mode" "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --skip-grant-tables --init-file=C:\temp\reset-mysql-password.sql --console

echo.
echo Step 4: Restarting MySQL service...
net start MySQL80
if %errorlevel% neq 0 (
    echo Error: Cannot start MySQL service
    pause
    exit /b 1
)

echo.
echo Step 5: Cleaning up temporary files...
del C:\temp\reset-mysql-password.sql

echo.
echo ===============================================
echo          Password Reset Complete!
echo ===============================================
echo.
echo MySQL root password has been reset to empty (no password)
echo You can now connect to MySQL with empty password
echo.
echo Test connection:
echo   mysql -u root
echo.
echo Start Node.js server:
echo   node back-end.js
echo.
pause