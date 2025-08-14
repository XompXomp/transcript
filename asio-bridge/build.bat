@echo off
echo Building ASIO Bridge...

REM Check if CMake is available
cmake --version >nul 2>&1
if errorlevel 1 (
    echo Error: CMake is not installed or not in PATH
    echo Please install CMake from https://cmake.org/download/
    pause
    exit /b 1
)

REM Check if Visual Studio is available
where cl >nul 2>&1
if errorlevel 1 (
    echo Warning: Visual Studio compiler not found in PATH
    echo Please run this script from a Visual Studio Developer Command Prompt
    echo or add Visual Studio to your PATH
    pause
)

REM Create build directory
if not exist build mkdir build
cd build

REM Configure with CMake
echo Configuring with CMake...
cmake .. -G "Visual Studio 16 2019" -A x64
if errorlevel 1 (
    echo Error: CMake configuration failed
    pause
    exit /b 1
)

REM Build the project
echo Building project...
cmake --build . --config Release
if errorlevel 1 (
    echo Error: Build failed
    pause
    exit /b 1
)

echo.
echo Build completed successfully!
echo Executable location: build\Release\asio-bridge.exe
echo.
echo To run the application:
echo   cd build\Release
echo   asio-bridge.exe
echo.
pause
