@echo off
echo === 火车票售票系统 MySQL版本启动脚本 ===
echo.

echo 检查Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到Node.js，请确保已安装Node.js
    pause
    exit /b 1
)

echo 检查npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到npm
    pause
    exit /b 1
)

echo 停止现有的Node.js进程...
taskkill /f /im node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo 已停止现有的Node.js进程
) else (
    echo 没有找到运行中的Node.js进程
)

echo 安装依赖...
npm install
if %errorlevel% neq 0 (
    echo 错误: 依赖安装失败
    pause
    exit /b 1
)

echo.
echo 注意: 请确保MySQL服务已启动并且配置正确
echo 默认配置: host=localhost, user=root, password=空, database=train_ticket_system
echo.
echo 启动服务器...
echo 服务器将在http://localhost:3000启动
echo 测试页面: http://localhost:3000/mysql-test.html
echo.
echo 按Ctrl+C停止服务器
echo.

node back-end.js

pause 