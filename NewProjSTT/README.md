# STT Transcription App

A simple React application that connects to Unmute STT server, records audio from your microphone, and continuously saves transcribed text to files.

## Features

- 🎤 Real-time audio recording with microphone
- 🔗 WebSocket connection to Unmute STT server
- 📝 Live transcription display
- 💾 Automatic file saving for each completed sentence
- 📥 Download complete transcription
- 🗑️ Clear transcription history
- ⏱️ Timestamped entries

## Prerequisites

1. **Unmute STT Server**: Make sure you have the Unmute STT server running on `ws://localhost:8080`
2. **Node.js**: Version 16 or higher
3. **Microphone permissions**: Browser must have access to microphone

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

## How to Use

1. **Start Recording**: Click the microphone button (🎤) to begin recording
2. **Speak**: Talk clearly into your microphone
3. **Auto-Save**: Each completed sentence will automatically be saved to a text file
4. **Stop Recording**: Click the stop button (⏹️) to end recording
5. **Download All**: Use the "Download All" button to get the complete transcription
6. **Clear**: Use the "Clear" button to reset the transcription

## File Output

- **Individual sentences**: Each completed sentence is saved as a separate file with timestamp
- **Complete transcription**: All transcriptions are saved in one file when using "Download All"
- **File naming**: Files include timestamps for easy identification

## Technical Details

- Uses Web Audio API for raw PCM audio capture
- Connects to Unmute STT server via WebSocket
- Uses MessagePack for binary data encoding
- Sentence completion detection with 2-second timeout
- Real-time transcription display

## Troubleshooting

- **Connection issues**: Make sure the Unmute STT server is running on `ws://localhost:8080`
- **Microphone access**: Check browser permissions for microphone access
- **Audio quality**: Ensure good microphone quality and quiet environment for best results

## Development

- Built with React 18 and TypeScript
- Uses Vite for fast development and building
- Styled with inline CSS for simplicity 