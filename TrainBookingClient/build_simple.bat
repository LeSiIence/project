@echo off
echo ========================================
echo 简化构建脚本 - 火车票预订Qt客户端
echo ========================================

REM 设置环境变量
set CMAKE_PATH=C:\Program Files\CMake\bin
set QT_PATH=C:\Qt\Tools\mingw1310_64
set QT_CMAKE=C:\Qt\Tools\CMake_64\bin

REM 添加到PATH
set PATH=%CMAKE_PATH%;%QT_CMAKE%;%QT_PATH%\bin;%PATH%

echo 正在检查工具...

REM 检查CMake
"%CMAKE_PATH%\cmake.exe" --version
if %errorlevel% neq 0 (
    echo 错误: CMake未找到
    pause
    exit /b 1
)

REM 检查编译器
"%QT_PATH%\bin\gcc.exe" --version
if %errorlevel% neq 0 (
    echo 错误: GCC编译器未找到
    pause
    exit /b 1
)

echo.
echo 正在查找Qt6...

REM 查找Qt6安装
for /d %%i in ("C:\Qt\6.*") do (
    if exist "%%i\mingw_64\bin\qmake.exe" (
        set QT6_PATH=%%i\mingw_64
        goto found_qt6
    )
    if exist "%%i\msvc2022_64\bin\qmake.exe" (
        set QT6_PATH=%%i\msvc2022_64
        goto found_qt6
    )
)

echo 警告: 未找到Qt6 qmake，尝试使用CMake进行构建...
goto cmake_build

:found_qt6
echo 找到Qt6: %QT6_PATH%
set PATH=%QT6_PATH%\bin;%PATH%

:cmake_build
echo.
echo 正在创建构建目录...
if not exist build mkdir build
cd build

echo.
echo 正在配置CMake...
"%CMAKE_PATH%\cmake.exe" -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release ..
if %errorlevel% neq 0 (
    echo CMake配置失败
    pause
    exit /b 1
)

echo.
echo 正在编译...
"%CMAKE_PATH%\cmake.exe" --build . --config Release
if %errorlevel% neq 0 (
    echo 编译失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo 构建成功！
echo 可执行文件位置: build\TrainBookingClient.exe
echo ========================================
pause 