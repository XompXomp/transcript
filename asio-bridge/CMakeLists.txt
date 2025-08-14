cmake_minimum_required(VERSION 3.16)
project(ASIOBridge)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find required packages
find_package(PkgConfig REQUIRED)

# ASIO SDK (you'll need to download this separately)
set(ASIO_SDK_DIR "${CMAKE_SOURCE_DIR}/asio-sdk")
if(NOT EXISTS "${ASIO_SDK_DIR}")
    message(FATAL_ERROR "ASIO SDK not found at ${ASIO_SDK_DIR}. Please download ASIO SDK and place it in the asio-sdk directory.")
endif()

# WebSocket++ (header-only library)
find_package(Boost REQUIRED COMPONENTS system thread)
find_package(OpenSSL REQUIRED)

# Include directories
include_directories(
    ${CMAKE_SOURCE_DIR}/src
    ${ASIO_SDK_DIR}/host
    ${ASIO_SDK_DIR}/host/pc
    ${ASIO_SDK_DIR}/common
)

# Add WebSocket++ headers
include_directories(${CMAKE_SOURCE_DIR}/websocketpp)

# Source files
set(SOURCES
    src/main.cpp
    src/asio_manager.cpp
    src/websocket_server.cpp
    src/audio_processor.cpp
)

# Create executable
add_executable(asio-bridge ${SOURCES})

# Link libraries
target_link_libraries(asio-bridge
    ${Boost_LIBRARIES}
    OpenSSL::SSL
    OpenSSL::Crypto
    ws2_32
    winmm
    ole32
    oleaut32
)

# Compiler flags
if(MSVC)
    target_compile_options(asio-bridge PRIVATE /W4)
else()
    target_compile_options(asio-bridge PRIVATE -Wall -Wextra)
endif()

# Copy ASIO SDK files to build directory
file(COPY ${ASIO_SDK_DIR}/lib DESTINATION ${CMAKE_BINARY_DIR})
