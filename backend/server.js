const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const portAudio = require('naudiodon');
const ChannelExtractor = require('./channelExtractor');

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

// Initialize channel extractor for DVS Receive devices
const channelExtractor = new ChannelExtractor();

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
    
    // Debug: Show ALL devices first
    console.log('🔍 ALL devices found by portAudio:');
    devices.forEach(device => {
      console.log(`  - ID: ${device.id}, Name: "${device.name}"`);
    });
    
    // Hardcode the exact 8 DVS Receive Dante devices we know exist
    const expectedDeviceNames = [
      'DVS Receive  1-2 (Dante Virtual Soundcard)',  // Note: double space after "Receive"
      'DVS Receive  3-4 (Dante Virtual Soundcard)',  // Note: double space after "Receive"
      'DVS Receive  5-6 (Dante Virtual Soundcard)',  // Note: double space after "Receive"
      'DVS Receive  7-8 (Dante Virtual Soundcard)',  // Note: double space after "Receive"
      'DVS Receive  9-10 (Dante Virtual Soundcard)', // Note: double space after "Receive"
      'DVS Receive 11-12 (Dante Virtual Soundcard)', // Note: single space after "Receive"
      'DVS Receive 13-14 (Dante Virtual Soundcard)', // Note: single space after "Receive"
      'DVS Receive 15-16 (Dante Virtual Soundcard)'  // Note: single space after "Receive"
    ];
    
    // Find only the exact devices we expect
    const dvsDevices = devices.filter(device => {
      const isMatch = expectedDeviceNames.includes(device.name);
      console.log(`🔍 Checking "${device.name}" - Match: ${isMatch}`);
      return isMatch;
    });
    
    console.log(`📋 Found ${dvsDevices.length} DVS Receive physical devices`);
    console.log('🔍 Physical devices found:');
    dvsDevices.forEach(device => {
      console.log(`  - ID: ${device.id}, Name: "${device.name}"`);
    });
    
    // Process ONLY DVS Receive devices through channel extractor
    const allDevices = [];
    
    dvsDevices.forEach(device => {
      const enhancedDevice = {
        id: device.id,
        name: device.name,
        maxInputs: device.maxInputs || 1,
        defaultSampleRate: device.defaultSampleRate || 48000, // Dante typically uses 48kHz
        hostAPIName: device.hostAPIName || 'Unknown',
        isDante: true,
        maxOutputs: device.maxOutputs || 0,
        defaultLowInputLatency: device.defaultLowInputLatency || 0,
        defaultHighInputLatency: device.defaultHighInputLatency || 0
      };
      
      // Create virtual devices for DVS Receive devices
      const virtualDevices = channelExtractor.createVirtualDevices(enhancedDevice);
      allDevices.push(...virtualDevices);
    });
    
    console.log(`🎵 Created ${allDevices.length} virtual DVS channels`);
    
    res.json({
      success: true,
      devices: allDevices
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

    let device = null;
    
    // Check if this is a virtual device
    if (channelExtractor.isVirtualDevice(parseInt(deviceId))) {
      const virtualDevice = channelExtractor.getVirtualDevice(parseInt(deviceId));
      const physicalDeviceId = channelExtractor.getPhysicalDeviceId(parseInt(deviceId));
      
      if (!virtualDevice || !physicalDeviceId) {
        return res.status(400).json({
          success: false,
          error: `Virtual device ${deviceId} configuration error`
        });
      }
      
      // Get the physical device info
      const devices = portAudio.getDevices();
      device = devices.find(d => d.id === physicalDeviceId);
      
      if (!device) {
        return res.status(400).json({
          success: false,
          error: `Physical device ${physicalDeviceId} not found for virtual device ${deviceId}`
        });
      }
      
      console.log(`🎵 Virtual device ${deviceId} (${virtualDevice.name}) mapped to physical device ${physicalDeviceId} (${device.name})`);
      
    } else {
      // Regular physical device
      const devices = portAudio.getDevices();
      device = devices.find(d => d.id === parseInt(deviceId));
      
      if (!device) {
        return res.status(400).json({
          success: false,
          error: `Device ${deviceId} not found`
        });
      }
    }

    console.log(`🎤 Device info:`, {
      id: device.id,
      name: device.name,
      defaultSampleRate: device.defaultSampleRate,
      maxInputs: device.maxInputs
    });

    // Try different sample rates - prioritize 24kHz for virtual devices (STT compatibility)
    const sampleRates = channelExtractor.isVirtualDevice(parseInt(deviceId)) 
      ? [24000, device.defaultSampleRate, 48000, 44100, 16000]  // Virtual devices: 24kHz first
      : [device.defaultSampleRate, 44100, 48000, 16000, 24000]; // Physical devices: default first
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
            deviceId: channelExtractor.isVirtualDevice(parseInt(deviceId)) ? 
                     channelExtractor.getPhysicalDeviceId(parseInt(deviceId)) : 
                     parseInt(deviceId)
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

    // Store stream reference with virtual device mapping
    activeStreams.set(streamId, {
      stream: audioStream,
      deviceId: deviceId,
      physicalDeviceId: channelExtractor.isVirtualDevice(parseInt(deviceId)) ? 
                       channelExtractor.getPhysicalDeviceId(parseInt(deviceId)) : 
                       parseInt(deviceId),
      isVirtualDevice: channelExtractor.isVirtualDevice(parseInt(deviceId)),
      virtualDeviceId: channelExtractor.isVirtualDevice(parseInt(deviceId)) ? parseInt(deviceId) : null,
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
  const streams = Array.from(activeStreams.entries()).map(([streamId, data]) => {
    const streamInfo = {
      streamId,
      deviceId: data.deviceId,
      startTime: data.startTime,
      isActive: streamStates.get(streamId) === 'running' || streamStates.get(streamId) === 'created'
    };
    
    // Add virtual device information if applicable
    if (data.isVirtualDevice) {
      const virtualDevice = channelExtractor.getVirtualDevice(data.virtualDeviceId);
      streamInfo.virtualDeviceName = virtualDevice ? virtualDevice.name : 'Unknown';
      streamInfo.physicalDeviceId = data.physicalDeviceId;
      streamInfo.channelType = channelExtractor.getChannelType(data.virtualDeviceId);
    }
    
    return streamInfo;
  });

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
            // DEBUG: Log raw audio data before any processing
            const rawMaxValue = Math.max(...audioData);
            const rawAvgValue = audioData.reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length;
            console.log(`🔍 RAW audio data: Max=${rawMaxValue}, Avg=${rawAvgValue.toFixed(2)}, Type=${audioData.constructor.name}, Length=${audioData.length}`);
            
            // FORCE PortAudio to return Int16Array data
            let rawAudioData = audioData;
            if (audioData.constructor.name === 'Buffer') {
              // Convert Buffer to Int16Array if PortAudio returns wrong type
              rawAudioData = new Int16Array(audioData.buffer, audioData.byteOffset, audioData.length / 2);
              console.log(`⚠️ PortAudio returned Buffer instead of Int16Array - converted to Int16Array`);
            }
            
            // Re-log with converted data
            const convertedMaxValue = Math.max(...rawAudioData);
            const convertedAvgValue = rawAudioData.reduce((sum, val) => sum + Math.abs(val), 0) / rawAudioData.length;
            console.log(`🔄 CONVERTED audio data: Max=${convertedMaxValue}, Avg=${convertedAvgValue.toFixed(2)}, Type=${rawAudioData.constructor.name}, Length=${rawAudioData.length}`);
            
            let processedAudioData = rawAudioData;
            
            // If this is a virtual device, extract the appropriate channel
            if (streamData.isVirtualDevice && streamData.virtualDeviceId) {
              const extractedChannel = channelExtractor.processAudioForVirtualDevice(rawAudioData, streamData.virtualDeviceId);
              if (extractedChannel) {
                processedAudioData = extractedChannel;
                const extractedMaxValue = Math.max(...extractedChannel);
                const extractedAvgValue = extractedChannel.reduce((sum, val) => sum + Math.abs(val), 0) / extractedChannel.length;
                console.log(`🎵 EXTRACTED channel: Max=${extractedMaxValue}, Avg=${extractedAvgValue.toFixed(2)}, Type=${extractedChannel.constructor.name}, Length=${extractedChannel.length}`);
              }
            }
            
            // Debug: Check audio levels
            const maxValue = Math.max(...processedAudioData);
            const avgValue = processedAudioData.reduce((sum, val) => sum + Math.abs(val), 0) / processedAudioData.length;
            
            // Log audio levels every 10 chunks (much more frequent for testing)
            if (!streamData.debugCounter) streamData.debugCounter = 0;
            streamData.debugCounter++;
            
            if (streamData.debugCounter % 10 === 0) {
              const deviceType = streamData.isVirtualDevice ? 'Virtual' : 'Physical';
              console.log(`🎤 Stream ${streamId} (${deviceType}) - Audio levels: Max=${maxValue}, Avg=${avgValue.toFixed(2)}, Samples=${processedAudioData.length}`);
              
              // If we're getting silence, log a warning
              if (maxValue === 0) {
                console.warn(`🔇 Stream ${streamId} - Microphone appears to be silent. Check microphone permissions and settings.`);
              }
            }
            
            // Send the processed audio data as raw Int16Array (preserves signed 16-bit values)
            // processedAudioData is already an Int16Array, so we can use it directly
            const bytes = new Uint8Array(processedAudioData.length * 2);
            
            // Convert each Int16 to two bytes (little-endian)
            for (let i = 0; i < processedAudioData.length; i++) {
              const value = processedAudioData[i];
              const lowByte = value & 0xFF;
              const highByte = (value >> 8) & 0xFF;
              bytes[i * 2] = lowByte;
              bytes[i * 2 + 1] = highByte;
            }
            
            const base64Data = Buffer.from(bytes).toString('base64');
            
            ws.send(JSON.stringify({
              type: 'audio',
              streamId,
              data: base64Data,
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

// Debug endpoint to view virtual device mappings
app.get('/api/debug/virtual-devices', (req, res) => {
  try {
    const virtualDevices = channelExtractor.getVirtualDevices();
    const physicalToVirtualMap = Array.from(channelExtractor.physicalToVirtualMap.entries()).map(([physicalId, virtualIds]) => ({
      physicalDeviceId: physicalId,
      virtualDeviceIds: virtualIds,
      virtualDevices: virtualIds.map(vid => {
        const vd = channelExtractor.getVirtualDevice(vid);
        return {
          id: vid,
          name: vd ? vd.name : 'Unknown',
          channel: vd ? vd.channel : 'Unknown'
        };
      })
    }));

    res.json({
      success: true,
      virtualDevices: virtualDevices,
      physicalToVirtualMap: physicalToVirtualMap,
      totalVirtualDevices: virtualDevices.length
    });
  } catch (error) {
    console.error('❌ Error getting virtual device debug info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
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
