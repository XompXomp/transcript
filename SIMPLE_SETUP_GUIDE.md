# Simple ASIO Bridge Setup Guide

This is the **simplified version** with minimal dependencies and setup steps.

## What You Get

- **ASIO Bridge**: Captures audio from ASIO devices (like Dante Virtual Soundcard)
- **WebSocket Streaming**: Sends audio to your web browser
- **Simple Setup**: Only 3 steps required

## Setup (3 Steps)

### Step 1: Download ASIO SDK
1. Go to https://www.steinberg.net/developers/
2. Register (free) and download ASIO SDK
3. Extract to `asio-bridge-simple/asio-sdk/` directory

### Step 2: Build
```bash
cd asio-bridge-simple
build.bat
```

### Step 3: Run
```bash
asio_bridge.exe
```

## How It Works

1. **Bridge starts**: Detects your ASIO devices (Dante Virtual Soundcard, etc.)
2. **WebSocket server**: Runs on `ws://localhost:8080`
3. **Audio streaming**: Sends all channels continuously
4. **Web app connects**: Your Vite app receives audio streams

## Audio Format

The bridge sends audio in this simple format:
```
CHANNEL:0|audio_data_bytes
CHANNEL:1|audio_data_bytes
CHANNEL:2|audio_data_bytes
```

- **Channel ID**: Number (0, 1, 2, etc.)
- **Audio Data**: 32-bit float samples
- **Sample Rate**: Matches your ASIO device

## Your Web App

The updated Vite app will:
- Connect to `ws://localhost:8080`
- Receive all ASIO channels
- Let you select which channels to transcribe
- Send selected channels to STT servers

## Troubleshooting

**"No ASIO devices found"**
- Make sure ASIO drivers are installed
- Check if Dante Virtual Soundcard is running

**"Build failed"**
- Make sure Visual Studio is installed
- Check ASIO SDK is in `asio-sdk/` folder

**"WebSocket connection failed"**
- Make sure bridge is running (`asio_bridge.exe`)
- Check port 8080 is available

## Dependencies

- ✅ ASIO SDK (only dependency)
- ✅ Visual Studio C++ compiler
- ✅ Windows Sockets (included)

That's it! No complex libraries or build systems.

## For Your Dante Setup

1. **Install Dante Virtual Soundcard**
2. **Configure it** to receive audio from your Dante network
3. **Run the bridge**: `asio_bridge.exe`
4. **Open your web app**: It will detect Dante channels automatically
5. **Select channels**: Choose which Dante streams to transcribe

The bridge will automatically detect Dante Virtual Soundcard as an ASIO device and stream all its input channels.
