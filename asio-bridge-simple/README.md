# Simple ASIO Bridge

A simplified ASIO bridge that captures audio from ASIO devices and streams it via WebSocket to web applications.

## Features

- Captures audio from ASIO devices (up to 64 channels)
- Streams audio via WebSocket to web browsers
- Simple setup with minimal dependencies
- Works with Dante Virtual Soundcard and other ASIO devices

## Setup (3 Steps)

### Step 1: Download ASIO SDK
1. Go to https://www.steinberg.net/developers/
2. Register and download ASIO SDK
3. Extract to `asio-sdk\` directory

### Step 2: Build
```bash
build.bat
```

### Step 3: Run
```bash
asio_bridge.exe
```

## Usage

1. **Start the bridge**: Run `asio_bridge.exe`
2. **Open your web app**: The bridge will be available at `ws://localhost:8080`
3. **Select channels**: Your web app will receive all ASIO channels

## Audio Format

The bridge sends audio data in this format:
```
CHANNEL:0|audio_data_bytes
CHANNEL:1|audio_data_bytes
CHANNEL:2|audio_data_bytes
...
```

- Channel ID is a number (0, 1, 2, etc.)
- Audio data is 32-bit float samples
- Sample rate matches your ASIO device

## Troubleshooting

**"No ASIO devices found"**
- Make sure ASIO drivers are installed
- Check if your audio interface is connected

**"Build failed"**
- Make sure Visual Studio is installed
- Check that ASIO SDK is in the correct location

**"WebSocket connection failed"**
- Make sure the bridge is running
- Check if port 8080 is available

## Dependencies

- ASIO SDK (only dependency)
- Visual Studio C++ compiler
- Windows Sockets (included with Windows)

That's it! No complex libraries or build systems needed.
