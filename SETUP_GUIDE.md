# ASIO Bridge Setup Guide

This guide will help you set up the ASIO Bridge for your audio transcription system.

## Overview

The system consists of two main components:
1. **ASIO Bridge (C++)** - Captures audio from ASIO devices and streams via WebSocket
2. **Updated Vite App** - Web application that receives ASIO audio and sends to STT servers

## Prerequisites

### Required Software
- **Visual Studio 2019/2022** with C++ development tools
- **CMake** (v3.16 or later)
- **Node.js** (v14 or later)
- **ASIO-compatible audio interface** (Focusrite, RME, etc.)

### Required Libraries

#### 1. ASIO SDK
- Download from: https://www.steinberg.net/developers/
- Extract to `asio-bridge/asio-sdk/` directory
- Structure should be:
  ```
  asio-bridge/
  ├── asio-sdk/
  │   ├── host/
  │   ├── common/
  │   └── lib/
  ```

#### 2. WebSocket++
- Download from: https://github.com/zaphoyd/websocketpp
- Extract to `asio-bridge/websocketpp/` directory

#### 3. nlohmann/json
- Download from: https://github.com/nlohmann/json
- Extract to `asio-bridge/json/` directory

#### 4. Boost Libraries
- Install via vcpkg or download from https://www.boost.org/
- Required components: system, thread

#### 5. OpenSSL
- Install via vcpkg or download from https://www.openssl.org/

## Installation Steps

### Step 1: Install Dependencies

#### Using vcpkg (Recommended)
```bash
# Clone vcpkg
git clone https://github.com/Microsoft/vcpkg.git
cd vcpkg
./bootstrap-vcpkg.bat
./vcpkg integrate install

# Install required packages
./vcpkg install boost-system boost-thread openssl
```

#### Manual Installation
1. Download and install Boost Libraries
2. Download and install OpenSSL
3. Set environment variables or specify paths in CMake

### Step 2: Download ASIO SDK

1. Register at https://www.steinberg.net/developers/
2. Download ASIO SDK
3. Extract to `asio-bridge/asio-sdk/`

### Step 3: Download Header-Only Libraries

```bash
cd asio-bridge

# Download WebSocket++
git clone https://github.com/zaphoyd/websocketpp.git

# Download nlohmann/json
git clone https://github.com/nlohmann/json.git
```

### Step 4: Build ASIO Bridge

```bash
cd asio-bridge

# Run build script
build.bat

# Or manually:
mkdir build
cd build
cmake .. -DCMAKE_TOOLCHAIN_FILE=C:/vcpkg/scripts/buildsystems/vcpkg.cmake
cmake --build . --config Release
```

### Step 5: Test ASIO Bridge

```bash
cd asio-bridge/build/Release
asio-bridge.exe --help
```

## Usage

### Starting the ASIO Bridge

```bash
# Start with default settings (port 8080)
asio-bridge.exe

# Start with custom port
asio-bridge.exe --port 9000

# Start with specific ASIO device
asio-bridge.exe --device "Focusrite USB ASIO"
```

### Using the Updated Vite App

1. **Start the ASIO Bridge first**
2. **Start your Vite app**
3. **Configure microphones**:
   - Select "ASIO Channels" radio button
   - Choose from available ASIO channels
   - Configure other settings (zone, table, topic, etc.)

## Configuration

### ASIO Bridge Configuration

The ASIO Bridge automatically:
- Detects available ASIO devices
- Lists all input channels
- Handles audio format conversion
- Resamples to 24kHz for STT compatibility
- Manages WebSocket connections

### Web App Configuration

The updated web app:
- Connects to ASIO Bridge on `ws://localhost:8080`
- Automatically detects ASIO channels
- Falls back to browser microphones if ASIO is unavailable
- Maintains existing STT integration

## Troubleshooting

### Common Issues

#### 1. "No ASIO devices found"
- Ensure ASIO drivers are installed
- Check device compatibility
- Verify ASIO SDK installation

#### 2. "WebSocket connection failed"
- Check if ASIO Bridge is running
- Verify port availability
- Check firewall settings

#### 3. "Build failed"
- Ensure all dependencies are installed
- Check Visual Studio installation
- Verify CMake configuration

#### 4. "No ASIO channels available"
- Make sure ASIO Bridge is running
- Check ASIO device connection
- Verify device drivers

### Debug Mode

Enable debug logging in the ASIO Bridge:
```cpp
// In websocket_server.cpp
m_server.set_access_channels(websocketpp::log::alevel::all);
m_server.set_error_channels(websocketpp::log::elevel::all);
```

### Performance Optimization

- **Buffer Size**: Adjust ASIO buffer size for your system
- **Sample Rate**: Use 48kHz or 96kHz for better quality
- **Latency**: Monitor system performance and adjust accordingly

## API Reference

### WebSocket Messages

#### Client to Server
```json
// Subscribe to channel
{
  "type": "subscribe",
  "channelId": 0
}

// Unsubscribe from channel
{
  "type": "unsubscribe",
  "channelId": 0
}

// Get available channels
{
  "type": "getChannels"
}
```

#### Server to Client
```json
// Audio data
{
  "type": "audio",
  "channelId": 0,
  "samples": [0.1, 0.2, 0.3, ...],
  "timestamp": 1234567890.123,
  "sampleRate": 24000
}

// Channel list
{
  "type": "channelList",
  "channels": ["Channel 1", "Channel 2", "Channel 3"]
}
```

## Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐    WebSocket    ┌─────────────────┐
│   ASIO Device   │ ──────────────► │  ASIO Bridge    │ ──────────────► │   Vite App      │
│   (Hardware)    │                 │   (C++ Server)  │                 │   (Browser)     │
└─────────────────┘                 └─────────────────┘                 └─────────────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │   STT Server    │
                                     │   (Existing)    │
                                     └─────────────────┘
```

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review ASIO SDK documentation
3. Check WebSocket++ documentation
4. Create an issue in the repository

## License

This project is licensed under the MIT License.
