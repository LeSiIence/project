cmake_minimum_required(VERSION 3.16)

project(TrainBookingClient VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 查找Qt库
find_package(Qt6 REQUIRED COMPONENTS Core Widgets Network)

# 设置Qt自动化工具
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

# 源文件
set(SOURCES
    main.cpp
    MainWindow.cpp
)

# 头文件
set(HEADERS
    MainWindow.h
)

# 创建可执行文件
add_executable(TrainBookingClient
    ${SOURCES}
    ${HEADERS}
)

# 链接Qt库
target_link_libraries(TrainBookingClient
    Qt6::Core
    Qt6::Widgets
    Qt6::Network
)

# Windows特定设置
if(WIN32)
    set_target_properties(TrainBookingClient PROPERTIES
        WIN32_EXECUTABLE TRUE
    )
endif()

# 安装规则
install(TARGETS TrainBookingClient
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
)

# 部署Qt依赖项（可选）
if(WIN32)
    find_program(WINDEPLOYQT_EXECUTABLE windeployqt HINTS ${Qt6_DIR}/../../../bin)
    if(WINDEPLOYQT_EXECUTABLE)
        add_custom_command(TARGET TrainBookingClient POST_BUILD
            COMMAND ${WINDEPLOYQT_EXECUTABLE} $<TARGET_FILE:TrainBookingClient>
            COMMENT "Deploying Qt libraries"
        )
    endif()
endif()

# 设置输出目录
set_target_properties(TrainBookingClient PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin
)

# 编译器特定设置
if(MSVC)
    target_compile_options(TrainBookingClient PRIVATE /W4)
    # 设置为使用UTF-8编码
    target_compile_options(TrainBookingClient PRIVATE /utf-8)
else()
    target_compile_options(TrainBookingClient PRIVATE -Wall -Wextra -Wpedantic)
endif()

# Debug版本的额外设置
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    target_compile_definitions(TrainBookingClient PRIVATE DEBUG_BUILD)
endif() 