# WDM Audio Stream Backend

This backend server exposes WDM audio streams from your computer and provides them via WebSocket to the frontend STT application.

## Features

- 🔍 **Device Discovery**: Automatically detects all WDM audio input devices
- 🎤 **Audio Streaming**: Streams audio from any WDM device in real-time
- 🔌 **WebSocket API**: Real-time audio data transmission
- 📡 **REST API**: Device management and stream control
- 🚀 **Multiple Streams**: Support for multiple simultaneous audio streams

## Installation

```bash
cd backend
npm install
```

## Usage

### Start the server:
```bash
npm start
```

The server will start on:
- **HTTP API**: http://localhost:3001
- **WebSocket**: ws://localhost:3002

### API Endpoints

#### Get Available Devices
```bash
GET http://localhost:3001/api/devices
```

Returns all available WDM audio input devices.

#### Start Audio Stream
```bash
POST http://localhost:3001/api/streams/start
Content-Type: application/json

{
  "deviceId": 0,
  "streamId": "mic-1"
}
```

#### Stop Audio Stream
```bash
POST http://localhost:3001/api/streams/stop
Content-Type: application/json

{
  "streamId": "mic-1"
}
```

#### Get Stream Status
```bash
GET http://localhost:3001/api/streams/status
```

#### Health Check
```bash
GET http://localhost:3001/health
```

### WebSocket API

Connect to `ws://localhost:3002` and send JSON messages:

#### Subscribe to Stream
```json
{
  "type": "subscribe",
  "streamId": "mic-1"
}
```

#### Unsubscribe from Stream
```json
{
  "type": "unsubscribe",
  "streamId": "mic-1"
}
```

#### Audio Data (received)
```json
{
  "type": "audio",
  "streamId": "mic-1",
  "data": "base64-encoded-audio-data",
  "timestamp": 1234567890
}
```

## Audio Format

- **Sample Rate**: 16kHz
- **Channels**: 1 (mono)
- **Format**: 16-bit PCM
- **Encoding**: Base64 for WebSocket transmission

## Integration with Frontend

The frontend STT application will:
1. Fetch available devices from `/api/devices`
2. Start audio streams via `/api/streams/start`
3. Subscribe to audio data via WebSocket
4. Send audio data to STT servers for transcription

## Troubleshooting

### No devices found
- Ensure you have audio input devices connected
- Check Windows audio settings
- Run as administrator if needed

### Audio quality issues
- Check device sample rate compatibility
- Ensure no other applications are using the device
- Verify device drivers are up to date

### WebSocket connection issues
- Check firewall settings
- Ensure port 3002 is not blocked
- Verify CORS settings if accessing from different origin

