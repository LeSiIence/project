@echo off
echo ========================================
echo 火车票预订系统 Qt客户端 构建脚本
echo ========================================

REM 检查Qt6是否安装
where qmake >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: 未找到Qt6，请确保Qt6已安装并添加到PATH中
    echo 请安装Qt6并将bin目录添加到环境变量PATH中
    pause
    exit /b 1
)

REM 检查CMake是否安装
where cmake >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: 未找到CMake，请确保CMake已安装并添加到PATH中
    pause
    exit /b 1
)

REM 创建构建目录
if not exist build (
    mkdir build
)

cd build

echo.
echo 正在配置项目...
cmake .. -G "MinGW Makefiles"
if %errorlevel% neq 0 (
    echo 配置失败，请检查Qt6和CMake安装
    pause
    exit /b 1
)

echo.
echo 正在编译项目...
cmake --build . --config Release
if %errorlevel% neq 0 (
    echo 编译失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo 构建完成！
echo ========================================
echo.
echo 可执行文件位置: build\bin\TrainBookingClient.exe
echo.
echo 运行前请确保后端服务已启动:
echo   cd ..
echo   node back-end.js
echo.
pause 