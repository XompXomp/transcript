# ASIO Bridge - Audio Streaming Server

A C++ application that captures audio from ASIO devices and streams it via WebSocket to web applications for real-time transcription.

## Features

- **ASIO Audio Capture**: Supports up to 36 input channels from ASIO-compatible audio interfaces
- **Real-time Streaming**: Low-latency audio streaming via WebSocket
- **Channel Subscription**: Dynamic channel subscription/unsubscription
- **Sample Rate Conversion**: Automatic resampling to 24kHz for STT compatibility
- **Multi-client Support**: Multiple web clients can subscribe to different channels
- **Cross-platform**: Windows-focused with ASIO support

## Prerequisites

### Required Libraries

1. **ASIO SDK** (v2.3 or later)
   - Download from: https://www.steinberg.net/developers/
   - Extract to `asio-sdk/` directory in the project root

2. **Boost Libraries** (v1.70 or later)
   - Download from: https://www.boost.org/
   - Install system-wide or specify path in CMake

3. **OpenSSL** (v1.1.1 or later)
   - Download from: https://www.openssl.org/
   - Install system-wide or specify path in CMake

4. **WebSocket++** (header-only)
   - Download from: https://github.com/zaphoyd/websocketpp
   - Extract to `websocketpp/` directory in the project root

5. **nlohmann/json** (header-only)
   - Download from: https://github.com/nlohmann/json
   - Extract to `json/` directory in the project root

### Build Tools

- **CMake** (v3.16 or later)
- **Visual Studio 2019/2022** (Windows) or **GCC/Clang** (Linux)
- **C++17** compatible compiler

## Building

### Windows (Visual Studio)

1. **Install Dependencies**:
   ```bash
   # Install vcpkg (if not already installed)
   git clone https://github.com/Microsoft/vcpkg.git
   cd vcpkg
   ./bootstrap-vcpkg.bat
   ./vcpkg integrate install
   
   # Install required packages
   ./vcpkg install boost-system boost-thread openssl
   ```

2. **Download ASIO SDK**:
   ```bash
   # Download and extract ASIO SDK to asio-sdk/
   # You'll need to register with Steinberg to download
   ```

3. **Build the Project**:
   ```bash
   mkdir build
   cd build
   cmake .. -DCMAKE_TOOLCHAIN_FILE=C:/vcpkg/scripts/buildsystems/vcpkg.cmake
   cmake --build . --config Release
   ```

### Linux

1. **Install Dependencies**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install libboost-system-dev libboost-thread-dev libssl-dev
   
   # CentOS/RHEL
   sudo yum install boost-devel openssl-devel
   ```

2. **Build the Project**:
   ```bash
   mkdir build
   cd build
   cmake ..
   make -j$(nproc)
   ```

## Usage

### Command Line Options

```bash
./asio-bridge [options]

Options:
  --port <port>     WebSocket server port (default: 8080)
  --device <name>   ASIO device name to use
  --help           Show this help message
```

### Examples

1. **Start with default settings**:
   ```bash
   ./asio-bridge
   ```

2. **Specify custom port**:
   ```bash
   ./asio-bridge --port 9000
   ```

3. **Use specific ASIO device**:
   ```bash
   ./asio-bridge --device "Focusrite USB ASIO"
   ```

### WebSocket API

The server provides a WebSocket API for client applications:

#### Connection
- **URL**: `ws://localhost:8080`
- **Protocol**: Text-based JSON messages

#### Message Types

1. **Subscribe to Channel**:
   ```json
   {
     "type": "subscribe",
     "channelId": 0
   }
   ```

2. **Unsubscribe from Channel**:
   ```json
   {
     "type": "unsubscribe",
     "channelId": 0
   }
   ```

3. **Get Available Channels**:
   ```json
   {
     "type": "getChannels"
   }
   ```

4. **Get Available Devices**:
   ```json
   {
     "type": "getDevices"
   }
   ```

#### Server Messages

1. **Channel List**:
   ```json
   {
     "type": "channelList",
     "channels": ["Channel 1", "Channel 2", "Channel 3"]
   }
   ```

2. **Audio Data**:
   ```json
   {
     "type": "audio",
     "channelId": 0,
     "samples": [0.1, 0.2, 0.3, ...],
     "timestamp": 1234567890.123,
     "sampleRate": 24000
   }
   ```

3. **Subscription Confirmation**:
   ```json
   {
     "type": "subscribed",
     "channelId": 0
   }
   ```

## Integration with Web Applications

### JavaScript Example

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = function() {
    console.log('Connected to ASIO Bridge');
    
    // Subscribe to channel 0
    ws.send(JSON.stringify({
        type: 'subscribe',
        channelId: 0
    }));
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    
    if (data.type === 'audio') {
        // Process audio data for STT
        const audioSamples = data.samples;
        const channelId = data.channelId;
        
        // Send to STT server
        sendToSTT(audioSamples, channelId);
    }
};
```

## Performance Considerations

- **Buffer Size**: Default ASIO buffer size is used (typically 256-1024 samples)
- **Latency**: Typical latency is 5-20ms depending on ASIO device settings
- **CPU Usage**: Minimal CPU usage with efficient audio processing
- **Memory**: Low memory footprint with streaming audio processing

## Troubleshooting

### Common Issues

1. **No ASIO devices found**:
   - Ensure ASIO drivers are installed
   - Check device compatibility
   - Verify ASIO SDK installation

2. **WebSocket connection failed**:
   - Check if port is available
   - Verify firewall settings
   - Ensure no other application is using the port

3. **Audio quality issues**:
   - Check ASIO device settings
   - Verify sample rate compatibility
   - Monitor CPU usage

### Debug Mode

Enable debug logging by modifying the source code:
```cpp
// In websocket_server.cpp
m_server.set_access_channels(websocketpp::log::alevel::all);
m_server.set_error_channels(websocketpp::log::elevel::all);
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review ASIO SDK documentation
