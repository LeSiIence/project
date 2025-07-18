@echo off
echo 开始测试订票逻辑...
echo.

REM 检查Node.js是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: 未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)

REM 检查MySQL是否运行
echo 检查MySQL服务状态...
sc query MySQL80 | find "RUNNING" >nul
if %errorlevel% neq 0 (
    echo 警告: MySQL服务可能未运行，请确保MySQL服务已启动
    echo 尝试启动MySQL服务...
    net start MySQL80 >nul 2>nul
)

echo 运行订票逻辑测试...
echo.
node test_booking_logic.js

echo.
echo 测试完成！
pause 