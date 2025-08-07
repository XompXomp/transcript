# Multi-Microphone STT Transcription System

A comprehensive speech-to-text transcription system that supports multiple microphones, multiple STT endpoints, and persistent storage of transcripts.

## Features

- **Multiple Microphone Support**: Configure and manage up to 36 different microphones
- **Multiple STT Endpoints**: Connect to different STT servers for load balancing
- **Device Selection**: Automatic detection and selection of available audio input devices
- **Zone Management**: Organize microphones by zones (1-4)
- **Database Storage**: Persistent storage of mic configurations and transcripts
- **Real-time Status**: Live connection status for each microphone
- **Transcript Management**: View, filter, and export transcripts

## Database Structure

The system stores data in a JSON format with the following structure:

```json
{
  "mics": [
    {
      "micId": "auto-generated-unique-id",
      "deviceId": "browser-device-id",
      "deviceName": "Microphone Name",
      "zoneId": 1-4,
      "tableId": "user-assigned",
      "topicId": "user-assigned",
      "topicName": "user-assigned",
      "sttEndpoint": "endpoint1|endpoint2",
      "isActive": true/false
    }
  ],
  "transcripts": [
    {
      "id": "auto-generated-unique-id",
      "micId": "reference-to-mic",
      "zoneId": 1-4,
      "tableId": "table-id",
      "topicId": "topic-id",
      "topicName": "topic-name",
      "transcript": "actual transcribed text",
      "timestamp": "ISO-timestamp",
      "duration": "optional-duration"
    }
  ]
}
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure STT Endpoints

Edit the STT endpoints in `src/components/MicConfiguration.tsx`:

```typescript
const sttEndpoints: STTEndpoint[] = [
  {
    id: 'endpoint1',
    name: 'STT Server 1',
    url: 'ws://your-stt-server-1:port/api/asr-streaming',
    apiKey: 'your-api-key-1'
  },
  {
    id: 'endpoint2',
    name: 'STT Server 2',
    url: 'ws://your-stt-server-2:port/api/asr-streaming',
    apiKey: 'your-api-key-2'
  }
];
```

### 3. Start STT Proxy Servers

Start both proxy servers:

```bash
npm run proxies
```

Or start them individually:

```bash
# Terminal 1
npm run proxy

# Terminal 2
npm run proxy2
```

### 4. Start the Application

```bash
npm run dev
```

## Usage

### 1. Configuration Tab

1. **Add Microphones**:
   - Select an audio input device from the dropdown
   - Assign Zone ID (1-4)
   - Enter Table ID, Topic ID, and Topic Name
   - Select STT endpoint
   - Click "Add Microphone"

2. **Manage Microphones**:
   - View all configured microphones
   - Activate/deactivate microphones
   - Delete microphone configurations

### 2. Recording Tab

1. **Start Recording**:
   - Only active microphones appear here
   - Click the microphone button to start recording
   - Live transcript appears below each mic
   - Click again to stop recording and save transcript

2. **Status Monitoring**:
   - Green border = Connected to STT server
   - Red border = Connection error
   - Status text shows current state

### 3. Transcripts Tab

1. **View Transcripts**:
   - Filter by specific microphone
   - View all transcripts with metadata
   - Export transcripts as JSON

## Architecture

### Frontend Components

- **App.tsx**: Main application with navigation and state management
- **MicConfiguration.tsx**: Microphone setup and management
- **TranscriptViewer.tsx**: Transcript viewing and export
- **databaseService.ts**: Database operations
- **types.ts**: TypeScript type definitions

### Backend Services

- **stt-proxy.js**: Proxy server for first STT endpoint (port 8030)
- **stt-proxy-2.js**: Proxy server for second STT endpoint (port 8031)
- **start-proxies.js**: Script to start both proxy servers

### Data Flow

1. **Configuration**: User configures microphones → Stored in database
2. **Connection**: App connects to appropriate proxy based on mic configuration
3. **Recording**: Audio streamed to STT server via proxy
4. **Transcription**: STT responses processed and displayed live
5. **Storage**: Completed transcripts saved to database

## STT Endpoint Configuration

The system supports multiple STT endpoints for load balancing:

- **Endpoint 1**: `ws://localhost:8030` → `ws://172.22.225.138:11004/api/asr-streaming`
- **Endpoint 2**: `ws://localhost:8031` → `ws://172.22.225.139:11004/api/asr-streaming`

To add more endpoints:
1. Create additional proxy files (e.g., `stt-proxy-3.js`)
2. Update the endpoint configuration in the app
3. Add the new proxy to the startup script

## Troubleshooting

### Common Issues

1. **No Audio Devices Found**:
   - Ensure microphone permissions are granted
   - Check browser audio settings
   - Try refreshing the page

2. **STT Connection Failed**:
   - Verify proxy servers are running
   - Check STT server endpoints
   - Verify API keys are correct

3. **Database Not Saving**:
   - Check browser localStorage
   - Ensure proper permissions
   - Check console for errors

### Debug Mode

Enable debug logging by checking browser console for detailed information about:
- Audio device enumeration
- WebSocket connections
- STT message processing
- Database operations

## Security Considerations

- API keys are stored in frontend code (consider backend storage for production)
- Database is stored in localStorage (consider backend database for production)
- WebSocket connections are unencrypted (use WSS for production)

## Performance Notes

- Each microphone maintains its own WebSocket connection
- Audio processing is done in real-time
- Database operations are asynchronous
- Transcripts are stored locally (consider pagination for large datasets)

## Future Enhancements

- Backend API for secure data storage
- Real-time collaboration features
- Advanced audio processing
- Export to various formats (CSV, PDF, etc.)
- User authentication and authorization
- Advanced filtering and search capabilities 