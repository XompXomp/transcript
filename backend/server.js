const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const portAudio = require('naudiodon');

const app = express();
const PORT = 3001;

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Store active audio streams
const activeStreams = new Map();
const wss = new WebSocket.Server({ port: 3002 });

// Track stream states manually
const streamStates = new Map();

console.log('🚀 WDM Audio Stream Server starting...');
console.log('📡 HTTP API: http://localhost:3001');
console.log('🔌 WebSocket: ws://localhost:3002');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// API Routes
app.get('/api/test-dante-devices', (req, res) => {
  try {
    const devices = portAudio.getDevices();
    const danteDevices = devices.filter(device => {
      return device.name.toLowerCase().includes('dante') || 
             device.name.toLowerCase().includes('dvs') ||
             device.name.toLowerCase().includes('dvs receive');
    });

    console.log('🎵 Testing Dante device access...');
    console.log('Found Dante devices:', danteDevices.map(d => ({
      id: d.id,
      name: d.name,
      maxInputs: d.maxInputs,
      maxOutputs: d.maxOutputs,
      defaultSampleRate: d.defaultSampleRate
    })));

    if (danteDevices.length === 0) {
      return res.json({
        success: false,
        error: 'No Dante devices found',
        devices: []
      });
    }

    // Test the first Dante device
    const testDevice = danteDevices[0];
    console.log(`🧪 Testing Dante device: ${testDevice.name} (ID: ${testDevice.id})`);

    try {
      const testStream = portAudio.AudioIO({
        inChannels: 1,
        outChannels: 0,
        inOptions: {
          channelCount: 1,
          sampleFormat: portAudio.SampleFormatInt16,
          sampleRate: testDevice.defaultSampleRate || 48000, // Dante typically uses 48kHz
          deviceId: testDevice.id
        }
      });

      // If we get here, we can create the stream
      testStream.quit(); // Clean up immediately
      
      res.json({
        success: true,
        message: 'Dante device access test successful',
        testDevice: {
          id: testDevice.id,
          name: testDevice.name,
          defaultSampleRate: testDevice.defaultSampleRate,
          maxInputs: testDevice.maxInputs,
          maxOutputs: testDevice.maxOutputs
        },
        allDanteDevices: danteDevices.map(d => ({
          id: d.id,
          name: d.name,
          maxInputs: d.maxInputs,
          maxOutputs: d.maxOutputs,
          defaultSampleRate: d.defaultSampleRate
        }))
      });

    } catch (streamError) {
      res.json({
        success: false,
        error: 'Cannot create Dante audio stream',
        streamError: streamError.message,
        testDevice: {
          id: testDevice.id,
          name: testDevice.name,
          defaultSampleRate: testDevice.defaultSampleRate,
          maxInputs: testDevice.maxInputs,
          maxOutputs: testDevice.maxOutputs
        }
      });
    }

  } catch (error) {
    console.error('❌ Error testing Dante devices:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/test-mic-access', (req, res) => {
  try {
    const devices = portAudio.getDevices();
    const inputDevices = devices.filter(device => {
      const isInputByName = device.name.toLowerCase().includes('input') || 
                           device.name.toLowerCase().includes('microphone') ||
                           device.name.toLowerCase().includes('mic');
      const isInputByMaxInputs = device.maxInputs && device.maxInputs > 0;
      
      return isInputByName || isInputByMaxInputs;
    });

    console.log('🔍 Testing microphone access...');
    console.log('Available input devices:', inputDevices.map(d => ({
      id: d.id,
      name: d.name,
      defaultSampleRate: d.defaultSampleRate,
      maxInputs: d.maxInputs
    })));

    if (inputDevices.length === 0) {
      return res.json({
        success: false,
        error: 'No input devices found - possible permission issue',
        devices: []
      });
    }

    // Try to create a test stream with the first device
    const testDevice = inputDevices[0];
    console.log(`🧪 Testing with device: ${testDevice.name} (ID: ${testDevice.id})`);

    try {
      const testStream = portAudio.AudioIO({
        inChannels: 1,
        outChannels: 0,
        inOptions: {
          channelCount: 1,
          sampleFormat: portAudio.SampleFormatInt16,
          sampleRate: testDevice.defaultSampleRate || 44100,
          deviceId: testDevice.id
        }
      });

      // If we get here, we can create the stream
      testStream.quit(); // Clean up immediately
      
      res.json({
        success: true,
        message: 'Microphone access test successful',
        testDevice: {
          id: testDevice.id,
          name: testDevice.name,
          defaultSampleRate: testDevice.defaultSampleRate,
          maxInputs: testDevice.maxInputs
        },
        allDevices: inputDevices.map(d => ({
          id: d.id,
          name: d.name,
          defaultSampleRate: d.defaultSampleRate,
          maxInputs: d.maxInputs
        }))
      });

    } catch (streamError) {
      res.json({
        success: false,
        error: 'Cannot create audio stream - possible permission issue',
        streamError: streamError.message,
        testDevice: {
          id: testDevice.id,
          name: testDevice.name,
          defaultSampleRate: testDevice.defaultSampleRate,
          maxInputs: testDevice.maxInputs
        }
      });
    }

  } catch (error) {
    console.error('❌ Error testing mic access:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/devices', (req, res) => {
  try {
    const devices = portAudio.getDevices();
    // Filter for input devices - include Dante channels and handle cases where maxInputs is undefined
    const inputDevices = devices.filter(device => {
      // Check if it's an input device by name, maxInputs, or Dante channels
      const isInputByName = device.name.toLowerCase().includes('input') || 
                           device.name.toLowerCase().includes('microphone') ||
                           device.name.toLowerCase().includes('mic');
      const isInputByMaxInputs = device.maxInputs && device.maxInputs > 0;
      const isDanteChannel = device.name.toLowerCase().includes('dvs receive') ||
                            device.name.toLowerCase().includes('dante');
      
      return isInputByName || isInputByMaxInputs || isDanteChannel;
    });
    
    console.log(`📋 Found ${inputDevices.length} input devices`);
    
    // Enhanced device info for debugging
    const enhancedDevices = inputDevices.map(device => ({
      id: device.id,
      name: device.name,
      maxInputs: device.maxInputs || 1, // Default to 1 if undefined
      defaultSampleRate: device.defaultSampleRate || 16000, // Default sample rate
      hostAPIName: device.hostAPIName || 'Unknown',
      isDante: device.name.toLowerCase().includes('dante') || device.name.toLowerCase().includes('dvs'),
      maxOutputs: device.maxOutputs || 0,
      defaultLowInputLatency: device.defaultLowInputLatency || 0,
      defaultHighInputLatency: device.defaultHighInputLatency || 0
    }));
    
    res.json({
      success: true,
      devices: enhancedDevices
    });
  } catch (error) {
    console.error('❌ Error getting devices:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/streams/start', (req, res) => {
  const { deviceId, streamId } = req.body;
  
  console.log('Received stream start request:', { deviceId, streamId, body: req.body });
  
  if (deviceId === undefined || deviceId === null || deviceId === '') {
    return res.status(400).json({
      success: false,
      error: 'Device ID is required'
    });
  }

  try {
    // Check if stream already exists
    if (activeStreams.has(streamId)) {
      return res.json({
        success: true,
        message: 'Stream already active',
        streamId
      });
    }

    // Get device info to check supported sample rates
    const devices = portAudio.getDevices();
    const device = devices.find(d => d.id === parseInt(deviceId));
    
    if (!device) {
      return res.status(400).json({
        success: false,
        error: `Device ${deviceId} not found`
      });
    }

    console.log(`🎤 Device info:`, {
      id: device.id,
      name: device.name,
      defaultSampleRate: device.defaultSampleRate,
      maxInputs: device.maxInputs
    });

    // Try different sample rates - start with device's default
    const sampleRates = [device.defaultSampleRate, 44100, 48000, 16000, 24000];
    let audioStream = null;
    let usedSampleRate = null;

    for (const sampleRate of sampleRates) {
      try {
        console.log(`🎤 Trying sample rate: ${sampleRate}`);
        
        audioStream = portAudio.AudioIO({
          inChannels: 1,
          outChannels: 0,
          inOptions: {
            channelCount: 1,
            sampleFormat: portAudio.SampleFormatInt16,
            sampleRate: sampleRate,
            deviceId: parseInt(deviceId)
          }
        });

        usedSampleRate = sampleRate;
        console.log(`✅ Successfully created stream with sample rate: ${sampleRate}`);
        break;
        
      } catch (error) {
        console.log(`❌ Failed with sample rate ${sampleRate}:`, error.message);
        continue;
      }
    }

    if (!audioStream) {
      return res.status(500).json({
        success: false,
        error: 'Could not create audio stream with any supported sample rate'
      });
    }

    // Store stream reference
    activeStreams.set(streamId, {
      stream: audioStream,
      deviceId: deviceId,
      startTime: Date.now(),
      sampleRate: usedSampleRate
    });

    // Track stream state
    streamStates.set(streamId, 'created');

    console.log(`🎤 Started audio stream ${streamId} from device ${deviceId} at ${usedSampleRate}Hz`);

    res.json({
      success: true,
      message: 'Audio stream started',
      streamId,
      sampleRate: usedSampleRate
    });

  } catch (error) {
    console.error('❌ Error starting stream:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/streams/stop', (req, res) => {
  const { streamId } = req.body;

  if (!streamId) {
    return res.status(400).json({
      success: false,
      error: 'Stream ID is required'
    });
  }

  try {
    const streamData = activeStreams.get(streamId);
    if (!streamData) {
      return res.json({
        success: true,
        message: 'Stream not found or already stopped'
      });
    }

    // Stop the audio stream
    streamData.stream.quit();
    activeStreams.delete(streamId);
    streamStates.delete(streamId);

    console.log(`⏹️ Stopped audio stream ${streamId}`);

    res.json({
      success: true,
      message: 'Audio stream stopped'
    });

  } catch (error) {
    console.error('❌ Error stopping stream:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/streams/status', (req, res) => {
  const streams = Array.from(activeStreams.entries()).map(([streamId, data]) => ({
    streamId,
    deviceId: data.deviceId,
    startTime: data.startTime,
    isActive: streamStates.get(streamId) === 'running' || streamStates.get(streamId) === 'created'
  }));

  res.json({
    success: true,
    streams
  });
});

// WebSocket handling for real-time audio streaming
wss.on('connection', (ws) => {
  const clientId = Math.random().toString(36).substr(2, 9);
  console.log(`🔌 WebSocket client ${clientId} connected`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'subscribe') {
        const { streamId } = data;
        const streamData = activeStreams.get(streamId);
        
        if (!streamData) {
          ws.send(JSON.stringify({
            type: 'error',
            message: `Stream ${streamId} not found`
          }));
          return;
        }

        // Set up audio data handler for this client
        streamData.stream.on('data', (audioData) => {
          if (ws.readyState === WebSocket.OPEN) {
            // Debug: Check audio levels
            const maxValue = Math.max(...audioData);
            const avgValue = audioData.reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length;
            
            // Log audio levels every 100 chunks
            if (!streamData.debugCounter) streamData.debugCounter = 0;
            streamData.debugCounter++;
            
            if (streamData.debugCounter % 100 === 0) {
              console.log(`🎤 Stream ${streamId} - Audio levels: Max=${maxValue}, Avg=${avgValue.toFixed(2)}, Samples=${audioData.length}`);
              
              // If we're getting silence, log a warning
              if (maxValue === 0) {
                console.warn(`🔇 Stream ${streamId} - Microphone appears to be silent. Check microphone permissions and settings.`);
              }
            }
            
            // Send the raw Int16 audio data directly
            ws.send(JSON.stringify({
              type: 'audio',
              streamId,
              data: Buffer.from(audioData.buffer).toString('base64'),
              timestamp: Date.now()
            }));
          }
        });

        // Start the stream if not already running
        if (streamStates.get(streamId) !== 'running') {
          streamData.stream.start();
          streamStates.set(streamId, 'running');
        }

        ws.send(JSON.stringify({
          type: 'subscribed',
          streamId
        }));

        console.log(`📡 Client ${clientId} subscribed to stream ${streamId}`);
      }
      
      else if (data.type === 'unsubscribe') {
        const { streamId } = data;
        // Remove client subscription (stream continues running for other clients)
        ws.send(JSON.stringify({
          type: 'unsubscribed',
          streamId
        }));
        console.log(`📡 Client ${clientId} unsubscribed from stream ${streamId}`);
      }

    } catch (error) {
      console.error('❌ WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log(`🔌 WebSocket client ${clientId} disconnected`);
  });

  ws.on('error', (error) => {
    console.error(`❌ WebSocket client ${clientId} error:`, error);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeStreams: activeStreams.size
  });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ HTTP Server running on port ${PORT}`);
  console.log(`✅ WebSocket Server running on port 3002`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WDM Audio Stream Server...');
  
  // Stop all active streams
  for (const [streamId, streamData] of activeStreams) {
    try {
      streamData.stream.quit();
      streamStates.delete(streamId);
      console.log(`⏹️ Stopped stream ${streamId}`);
    } catch (error) {
      console.error(`❌ Error stopping stream ${streamId}:`, error);
    }
  }
  
  wss.close(() => {
    console.log('✅ WebSocket Server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down WDM Audio Stream Server...');
  process.exit(0);
});
