@echo off
echo Building Simple ASIO Bridge...

REM Check if ASIO SDK exists
if not exist "asio-sdk\host\pc\asio.h" (
    echo ERROR: ASIO SDK not found!
    echo Please download ASIO SDK from https://www.steinberg.net/developers/
    echo and extract it to asio-sdk\ directory
    pause
    exit /b 1
)

REM Compile with Visual Studio
cl /EHsc /std:c++17 asio_bridge.cpp /I"asio-sdk\host\pc" /I"asio-sdk\host" /I"asio-sdk\common" /link ws2_32.lib

if %ERRORLEVEL% EQU 0 (
    echo Build successful! asio_bridge.exe created.
    echo.
    echo To run: asio_bridge.exe
    echo.
) else (
    echo Build failed!
)

pause
