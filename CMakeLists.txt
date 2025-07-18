cmake_minimum_required(VERSION 3.10)
project(TrainTicketFakeServer)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 查找必要的包
find_package(PkgConfig REQUIRED)

# 查找jsoncpp
pkg_check_modules(JSONCPP jsoncpp)

# 包含目录
include_directories(${JSONCPP_INCLUDE_DIRS})

# 添加cpphttplib（单头文件库）
include_directories(${CMAKE_SOURCE_DIR}/include)

# 创建可执行文件
add_executable(fake_server fake_server.cpp)

# 链接库
target_link_libraries(fake_server ${JSONCPP_LIBRARIES})

# 设置编译选项
target_compile_options(fake_server PRIVATE ${JSONCPP_CFLAGS_OTHER})

# 设置输出目录
set_target_properties(fake_server PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin
)

# 安装目标
install(TARGETS fake_server
    RUNTIME DESTINATION bin
)

# 打印信息
message(STATUS "JSONCPP_INCLUDE_DIRS: ${JSONCPP_INCLUDE_DIRS}")
message(STATUS "JSONCPP_LIBRARIES: ${JSONCPP_LIBRARIES}")
message(STATUS "JSONCPP_CFLAGS_OTHER: ${JSONCPP_CFLAGS_OTHER}") 