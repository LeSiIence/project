@echo off
echo 编译火车票售票系统 Fake Server...

REM 检查是否有g++编译器
where g++ >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: 未找到g++编译器，请安装MinGW或配置环境变量
    pause
    exit /b 1
)

REM 编译fake server
echo 正在编译 simple_fake_server.cpp...
g++ -std=c++17 -O2 -o fake_server.exe simple_fake_server.cpp -lws2_32 -lpthread

if %errorlevel% equ 0 (
    echo 编译成功！
    echo 运行命令: fake_server.exe
    echo 服务器将在 http://localhost:3000 启动
) else (
    echo 编译失败！
)

pause 