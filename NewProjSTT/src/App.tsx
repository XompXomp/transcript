import React, { useState, useRef, useEffect } from 'react';
// @ts-ignore
import msgpack from 'msgpack-lite';
import { MicConfig, Transcript, STTEndpoint, AudioDevice } from './types';
import { databaseService } from './databaseService';

const App: React.FC = () => {
  const [mics, setMics] = useState<MicConfig[]>([]);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [micConnections, setMicConnections] = useState<Map<string, WebSocket>>(new Map());
  const [micStatuses, setMicStatuses] = useState<Map<string, { isConnected: boolean; status: string }>>(new Map());
  const [micTranscripts, setMicTranscripts] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Topic mapping based on structure.md
  const topicMapping = [
    { id: '01', name: 'Urban Intelligence', zoneId: 1 },
    { id: '02', name: 'New Energy', zoneId: 1 },
    { id: '03', name: 'Mobility', zoneId: 1 },
    { id: '04', name: 'Education and talent', zoneId: 1 },
    { id: '05', name: 'Mission driven ecosystems', zoneId: 1 },
    { id: '06', name: 'City funding', zoneId: 2 },
    { id: '07', name: 'City branding and identity', zoneId: 2 },
    { id: '08', name: 'Trade and Investment hubs', zoneId: 2 },
    { id: '09', name: 'Planned Urban Expansion', zoneId: 2 },
    { id: '10', name: 'City Diplomacy', zoneId: 2 },
    { id: '11', name: 'City Leadership and Capacity building', zoneId: 2 },
    { id: '12', name: 'Tourism and Visitor Economy', zoneId: 3 },
    { id: '13', name: 'Affordable and Inclusive housing', zoneId: 3 },
    { id: '14', name: 'Urban Health Systems', zoneId: 3 },
    { id: '15', name: 'Active City Living', zoneId: 3 },
    { id: '16', name: 'Urban Safety and Security', zoneId: 3 },
    { id: '17', name: 'Social Value Infrastructure', zoneId: 3 },
    { id: '18', name: 'Orange Economy and Cultural Investment', zoneId: 3 },
    { id: '19', name: 'Urban Heat', zoneId: 4 },
    { id: '20', name: 'Climate Adaptation and Mitigation', zoneId: 4 },
    { id: '21', name: 'Decarbonizing the built environment', zoneId: 4 },
    { id: '22', name: 'Nature Positive Cities', zoneId: 4 },
    { id: '23', name: 'Blue Economy', zoneId: 4 },
    { id: '24', name: 'Urban Water and Food Security', zoneId: 4 },
    { id: '25', name: 'Zero Waste and Resource Circularity', zoneId: 4 }
  ];

  const sttEndpoints: STTEndpoint[] = [
    {
      id: 'endpoint1',
      name: 'STT Server 1',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint2',
      name: 'STT Server 2',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint3',
      name: 'STT Server 3',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint4',
      name: 'STT Server 4',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint5',
      name: 'STT Server 5',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint6',
      name: 'STT Server 6',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint7',
      name: 'STT Server 7',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint8',
      name: 'STT Server 8',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint9',
      name: 'STT Server 9',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint10',
      name: 'STT Server 10',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint11',
      name: 'STT Server 11',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint12',
      name: 'STT Server 12',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint13',
      name: 'STT Server 13',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint14',
      name: 'STT Server 14',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint15',
      name: 'STT Server 15',
      url: '',
      apiKey: 'public_token'
    },  
    {
      id: 'endpoint16',
      name: 'STT Server 16',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint17',
      name: 'STT Server 17',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint18',
      name: 'STT Server 18',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint19',
      name: 'STT Server 19',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint20',
      name: 'STT Server 20',
      url: '',
      apiKey: 'public_token'
    },  
    {
      id: 'endpoint21',
      name: 'STT Server 21',
      url: '',
      apiKey: 'public_token'
    },  
    {
      id: 'endpoint22',
      name: 'STT Server 22',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint23',
      name: 'STT Server 23',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint24',
      name: 'STT Server 24',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint25',
      name: 'STT Server 25',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint26',
      name: 'STT Server 26',
      url: '',
      apiKey: 'public_token'
    },  
    {
      id: 'endpoint27',
      name: 'STT Server 27',
      url: '',
      apiKey: 'public_token'
    },  
    {
      id: 'endpoint28',
      name: 'STT Server 28',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint29',
      name: 'STT Server 29',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint30',
      name: 'STT Server 30',
      url: '',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint31',
      name: 'STT Server 31',
      url: '',
      apiKey: 'public_token'
    }
  ];

  useEffect(() => {
    loadMics();
    loadAudioDevices();
    databaseService.initializeFromStorage();
  }, []);

  const loadMics = async () => {
    try {
      const allMics = await databaseService.getAllMics();
      setMics(allMics);
      
      // Preserve existing statuses and only initialize new mics
      setMicStatuses(prev => {
        const newStatuses = new Map(prev);
        allMics.forEach(mic => {
          if (!newStatuses.has(mic.micId)) {
            // Only initialize status for new mics
            newStatuses.set(mic.micId, { isConnected: false, status: 'Disconnected' });
          }
        });
        return newStatuses;
      });
    } catch (error) {
      console.error('Error loading mics:', error);
    }
  };

  const loadAudioDevices = async () => {
    try {
      console.log('Attempting to enumerate audio devices...');
      
      // First, try to get user permission by requesting microphone access
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone permission granted');
      } catch (permError) {
        console.warn('Microphone permission denied:', permError);
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log('All devices found:', devices.length);
      
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
          groupId: device.groupId
        }));
      
      console.log('Audio input devices found:', audioInputs.length);
      console.log('Audio devices:', audioInputs);
      
      setAudioDevices(audioInputs);
    } catch (error) {
      console.error('Error loading audio devices:', error);
    }
  };

  const createSTTConnection = async (mic: MicConfig) => {
    const endpoint = sttEndpoints.find(e => e.id === mic.sttEndpoint);
    if (!endpoint) {
      console.error('STT endpoint not found for mic:', mic.micId);
      return null;
    }

    // Map endpoint to proxy port
    const getProxyPortForEndpoint = (endpointId: string): number => {
      switch (endpointId) {
        case 'endpoint1':
          return 8030;
        case 'endpoint2':
          return 8031;
        case 'endpoint3':
          return 8032;
        case 'endpoint4':
          return 8033;
        case 'endpoint5':
          return 8034;
        case 'endpoint6':
          return 8035;
        case 'endpoint7':
          return 8036;
        case 'endpoint8':
          return 8037;
        case 'endpoint9':
          return 8038;
        case 'endpoint10':
          return 8039;
        case 'endpoint11':
          return 8040;
        case 'endpoint12':
          return 8041;
        case 'endpoint13':
          return 8042;
        case 'endpoint14':
          return 8043;
        case 'endpoint15':
          return 8044;
        case 'endpoint16':
          return 8045;
        case 'endpoint17':
          return 8046;
        case 'endpoint18':
          return 8047;
        case 'endpoint19':
          return 8048;
        case 'endpoint20':
          return 8049;
        case 'endpoint21':
          return 8050;
        case 'endpoint22':
          return 8051;
        case 'endpoint23':
          return 8052;
        case 'endpoint24':
          return 8053;
        case 'endpoint25':
          return 8054;
        case 'endpoint26':
          return 8055;
        case 'endpoint27':
          return 8056;
        case 'endpoint28':
          return 8057;
        case 'endpoint29':
          return 8058;
        case 'endpoint30':
          return 8059;
        case 'endpoint31':
          return 8060;
        default:
          return 8058;
      }
    };

    const proxyPort = getProxyPortForEndpoint(mic.sttEndpoint);
    const proxyUrl = `ws://localhost:${proxyPort}`;
    
    return new Promise<WebSocket>((resolve, reject) => {
      const ws = new WebSocket(proxyUrl);
      
      ws.onopen = () => {
        console.log(`STT WebSocket connected for mic ${mic.micId}`);
        setMicStatuses(prev => new Map(prev).set(mic.micId, { 
          isConnected: true, 
          status: 'Connected to STT server' 
        }));
        
        // Send authentication
      try {
        const authMessage = {
          type: "Auth",
            token: endpoint.apiKey
        };
        const encoded = msgpack.encode(authMessage);
          ws.send(encoded);
      } catch (e) {
        console.log('Could not send auth message:', e);
      }
        
        resolve(ws);
      };
      
      ws.onerror = (error) => {
        console.error(`STT WebSocket error for mic ${mic.micId}:`, error);
        setMicStatuses(prev => new Map(prev).set(mic.micId, { 
          isConnected: false, 
          status: 'Connection error' 
        }));
        reject(error);
      };
      
      ws.onclose = () => {
        console.log(`STT WebSocket closed for mic ${mic.micId}`);
        setMicStatuses(prev => new Map(prev).set(mic.micId, { 
          isConnected: false, 
          status: 'Disconnected from STT server' 
        }));
      };
    });
  };

  const addMic = async () => {
    const newMic: Omit<MicConfig, 'micId'> = {
      deviceId: '',
      deviceName: '',
      zoneId: 1,
      tableId: '',
      topicId: '',
      topicName: '',
      sttEndpoint: '',
      isActive: false
    };

    try {
      const micId = await databaseService.addMic(newMic);
      // Add the new mic to state without reloading all mics
      const addedMic = await databaseService.getMic(micId);
      if (addedMic) {
        setMics(prev => [...prev, addedMic]);
        // Initialize status for the new mic
        setMicStatuses(prev => new Map(prev).set(micId, { 
          isConnected: false, 
          status: 'Disconnected' 
        }));
      }
    } catch (error) {
      console.error('Error adding mic:', error);
      alert('Error adding microphone');
    }
  };

  const updateMic = async (micId: string, updates: Partial<MicConfig>) => {
    try {
      await databaseService.updateMic(micId, updates);
      // Update the mic in state without reloading all mics
      setMics(prev => prev.map(mic => 
        mic.micId === micId ? { ...mic, ...updates } : mic
      ));
    } catch (error) {
      console.error('Error updating mic:', error);
    }
  };

  const deleteMic = async (micId: string) => {
    if (window.confirm('Are you sure you want to delete this microphone?')) {
      try {
        await databaseService.deleteMic(micId);
        // Remove the mic from state and clean up connections
        setMics(prev => prev.filter(mic => mic.micId !== micId));
        setMicStatuses(prev => {
          const newStatuses = new Map(prev);
          newStatuses.delete(micId);
          return newStatuses;
        });
        setMicConnections(prev => {
          const newConnections = new Map(prev);
          const connection = newConnections.get(micId);
          if (connection) {
            connection.close();
            newConnections.delete(micId);
          }
          return newConnections;
        });
        setMicTranscripts(prev => {
          const newTranscripts = new Map(prev);
          newTranscripts.delete(micId);
          return newTranscripts;
        });
      } catch (error) {
        console.error('Error deleting mic:', error);
      }
    }
  };

  const toggleMicActive = async (micId: string) => {
    const mic = mics.find(m => m.micId === micId);
    if (!mic) return;

    const newActiveState = !mic.isActive;
    
    try {
      await updateMic(micId, { isActive: newActiveState });
      
      if (newActiveState) {
        // Create connection
        const connection = await createSTTConnection(mic);
        if (connection) {
          setMicConnections(prev => new Map(prev).set(micId, connection));
        }
      } else {
        // Close connection
        const connection = micConnections.get(micId);
        if (connection) {
          connection.close();
          setMicConnections(prev => {
            const newMap = new Map(prev);
            newMap.delete(micId);
            return newMap;
          });
        }
      }
    } catch (error) {
      console.error('Error toggling mic active state:', error);
    }
  };

  const handleRecording = async (micId: string) => {
    const mic = mics.find(m => m.micId === micId);
    if (!mic) return;

    const connection = micConnections.get(micId);
    if (!connection || connection.readyState !== WebSocket.OPEN) {
      alert('STT connection not available for this microphone');
      return;
    }

    const isCurrentlyRecording = isRecording(micId);
    
    if (isCurrentlyRecording) {
      // Stop recording
      await stopRecording(micId);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { deviceId: mic.deviceId } 
        });
        
        const audioContext = new AudioContext({ sampleRate: 24000 });
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(1024, 1, 1);
        
        let transcript = '';
        
        processor.onaudioprocess = (event) => {
          if (connection.readyState === WebSocket.OPEN) {
            const inputData = event.inputBuffer.getChannelData(0);
            const pcmData = Array.from(inputData);
            
            const message = {
              type: 'Audio',
              pcm: pcmData
            };
            const encoded = msgpack.encode(message);
            connection.send(encoded);
          }
        };
        
        // Handle STT responses - always set the handler for each recording session
        connection.onmessage = (event) => {
          try {
            console.log(`Received message for mic ${micId}:`, event.data);
            if (event.data instanceof Blob) {
              event.data.arrayBuffer().then(buffer => {
                const uint8Array = new Uint8Array(buffer);
                const data = msgpack.decode(uint8Array);
                console.log(`Decoded data for mic ${micId}:`, data);
                
                if (data.type === 'Word' && data.text) {
                  console.log(`Adding word "${data.text}" to transcript for mic ${micId}`);
                  setMicTranscripts(prev => {
                    const currentTranscript = prev.get(micId) || '';
                    const newTranscript = currentTranscript + (currentTranscript ? ' ' : '') + data.text;
                    console.log(`Updated transcript for mic ${micId}:`, newTranscript);
                    return new Map(prev).set(micId, newTranscript);
                  });
                }
              });
            }
          } catch (e) {
            console.error('Error processing STT message:', e);
          }
        };
        
        source.connect(processor);
        processor.connect(audioContext.destination);
        
        // Store the processor and stream for cleanup
        setMicConnections(prev => {
          const newMap = new Map(prev);
          const connection = newMap.get(micId);
          if (connection) {
            (connection as any).processor = processor;
            (connection as any).stream = stream;
            (connection as any).audioContext = audioContext;
          }
          return newMap;
        });
        
        setMicStatuses(prev => new Map(prev).set(micId, { 
          isConnected: true, 
          status: 'Recording...' 
        }));
        
      } catch (error) {
        console.error('Error starting recording for mic:', micId, error);
        alert('Error accessing microphone. Please check permissions.');
      }
    }
  };

  const stopRecording = async (micId: string) => {
    const connection = micConnections.get(micId);
    if (connection) {
      // Clean up audio resources
      if ((connection as any).processor) {
        const processor = (connection as any).processor;
        processor.disconnect();
        (connection as any).processor = null;
      }
      
      if ((connection as any).stream) {
        const stream = (connection as any).stream;
        stream.getTracks().forEach((track: any) => track.stop());
        (connection as any).stream = null;
      }
      
      if ((connection as any).audioContext) {
        const audioContext = (connection as any).audioContext;
        audioContext.close();
        (connection as any).audioContext = null;
      }
    }
    
    const transcript = micTranscripts.get(micId);
    console.log(`Stopping recording for mic ${micId}, transcript:`, transcript);
    if (transcript) {
      const mic = mics.find(m => m.micId === micId);
      if (mic) {
        try {
          console.log(`Saving transcript for mic ${micId}, tableId: ${mic.tableId}`);
          // Force reload from localStorage to ensure we have the latest data
          await databaseService.reloadFromStorage();
          
          // Check if a transcript already exists for this tableId
          const existingTranscripts = await databaseService.getAllTranscripts();
          const existingTranscript = existingTranscripts.find(t => t.tableId === mic.tableId);
          
          // Only consolidate if the existing transcript has actual content and is not empty
          if (existingTranscript && 
              existingTranscript.transcript && 
              existingTranscript.transcript.trim() !== '' && 
              existingTranscript.transcript !== '(Empty transcript)') {
            // Update existing transcript by appending new content
            const updatedTranscript = existingTranscript.transcript + '|||' + transcript;
            await databaseService.updateTranscript(existingTranscript.id, {
              transcript: updatedTranscript,
              timestamp: new Date().toISOString()
            });
            console.log(`Updated existing transcript for table ${mic.tableId}`);
    } else {
            // Create new transcript record
            await databaseService.addTranscript({
              micId: mic.micId,
              zoneId: mic.zoneId,
              tableId: mic.tableId,
              topicId: mic.topicId,
              topicName: mic.topicName,
              transcript: transcript,
              timestamp: new Date().toISOString()
            });
            console.log(`Created new transcript for table ${mic.tableId}`);
          }
          
          // Clear the transcript
          setMicTranscripts(prev => {
            const newMap = new Map(prev);
            newMap.delete(micId);
            return newMap;
          });
          
          // Show success message
          setSuccessMessage('Transcript saved successfully!');
          setTimeout(() => setSuccessMessage(null), 3000); // Auto-hide after 3 seconds
        } catch (error) {
          console.error('Error saving transcript:', error);
          alert('Error saving transcript');
        }
      }
    }
    
    setMicStatuses(prev => new Map(prev).set(micId, { 
      isConnected: true, 
      status: 'Ready to record' 
    }));
  };

  const isRecording = (micId: string) => {
    const status = micStatuses.get(micId);
    return status?.status === 'Recording...';
  };

  const downloadTranscript = (micId: string) => {
    const transcript = micTranscripts.get(micId);
    if (!transcript) {
      alert('No transcript to download');
      return;
    }
    
    const mic = mics.find(m => m.micId === micId);
    const filename = `transcript_${mic?.deviceName || micId}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openTranscriptViewer = async () => {
    try {
      // Force reload from localStorage to ensure we have the latest data
      await databaseService.reloadFromStorage();
      const transcripts = await databaseService.getAllTranscripts();
      
      

      // Create a simple HTML page with the transcript data
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Transcript History Viewer</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                          .controls { display: flex; gap: 10px; }
             button { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; color: white; }
             .refresh { background: #4caf50; }
             .export { background: #2196f3; }
             .import { background: #9c27b0; }
             .send { background: #ff9800; }
             .clear { background: #f44336; }
             #fileInput { display: none; }
                          .transcript { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 4px; position: relative; }
            .transcript-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .transcript-content { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; }
            .transcript-actions { position: absolute; top: 10px; right: 10px; }
            .delete-btn { background: #f44336; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 12px; cursor: pointer; }
            .delete-btn:hover { background: #d32f2f; }
            .summary { background: #e3f2fd; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
            .status { margin-top: 10px; padding: 10px; border-radius: 4px; display: none; }
            .status.success { background: #e8f5e8; color: #2e7d32; border: 1px solid #4caf50; }
            .status.error { background: #ffebee; color: #c62828; border: 1px solid #f44336; }
         </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📝 Transcript History Viewer</h1>
                              <div class="controls">

                 <button class="export" onclick="exportData()">📥 Export JSON</button>
                 <button class="import" onclick="document.getElementById('fileInput').click()">📁 Import JSON</button>
                 <button class="send" onclick="sendToAPI()">📤 Send to API</button>
                 <button class="clear" onclick="clearAll()">🗑️ Clear All</button>
               </div>
               <input type="file" id="fileInput" accept=".json" onchange="importData(event)" />
            </div>
           
                        <div class="summary">
              <strong>Summary:</strong> Total transcripts: ${transcripts.length}
            </div>
            
            <div id="status" class="status"></div>
           
                        <div id="transcripts">
              ${transcripts.map((t: any, index: number) => `
                <div class="transcript" data-transcript-id="${t.id}">
                  <div class="transcript-actions">
                    <button class="delete-btn" onclick="deleteTranscript('${t.id}', ${index})" title="Delete this transcript">🗑️</button>
                  </div>
                  <div class="transcript-header">
                    <div>
                      <strong>Mic ID:</strong> ${t.micId} | 
                      <strong>Zone:</strong> ${t.zoneId} | 
                      <strong>Table:</strong> ${t.tableId} | 
                      <strong>Topic:</strong> ${t.topicName}
                    </div>
                    <div>${new Date(t.timestamp).toLocaleString()}</div>
                  </div>
                  <div class="transcript-content">${t.transcript || '(Empty transcript)'}</div>
                </div>
              `).join('')}
            </div>
         </div>
         
                   <script>
                         function exportData() {
               const data = ${JSON.stringify(transcripts)};
               const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
               const url = URL.createObjectURL(blob);
               const a = document.createElement('a');
               a.href = url;
               a.download = 'transcripts_' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.json';
               document.body.appendChild(a);
               a.click();
               document.body.removeChild(a);
               URL.revokeObjectURL(url);
             }
             
             function importData(event) {
               const file = event.target.files[0];
               if (!file) return;
               
               const reader = new FileReader();
               reader.onload = function(e) {
                 try {
                   const importedData = JSON.parse(e.target.result);
                   const statusDiv = document.getElementById('status');
                   
                   // Validate the imported data structure
                   if (!Array.isArray(importedData)) {
                     throw new Error('Invalid JSON format: Expected an array of transcripts');
                   }
                   
                   // Check if each item has required fields
                   const requiredFields = ['id', 'micId', 'zoneId', 'tableId', 'topicId', 'topicName', 'transcript', 'timestamp'];
                   for (let i = 0; i < importedData.length; i++) {
                     const item = importedData[i];
                     for (let j = 0; j < requiredFields.length; j++) {
                       if (!(requiredFields[j] in item)) {
                         throw new Error('Invalid transcript at index ' + i + ': Missing required field "' + requiredFields[j] + '"');
                       }
                     }
                   }
                   
                   // Get current data from localStorage
                   const stored = localStorage.getItem('sttDatabase');
                   const currentData = stored ? JSON.parse(stored) : { mics: [], transcripts: [] };
                   
                   // Merge imported transcripts with existing ones
                   const existingTranscripts = currentData.transcripts || [];
                   const mergedTranscripts = [...existingTranscripts, ...importedData];
                   
                   // Remove duplicates based on transcript ID
                   const uniqueTranscripts = mergedTranscripts.filter((transcript, index, self) => 
                     index === self.findIndex(t => t.id === transcript.id)
                   );
                   
                   // Update localStorage
                   currentData.transcripts = uniqueTranscripts;
                   localStorage.setItem('sttDatabase', JSON.stringify(currentData));
                   
                   // Show success message
                   statusDiv.textContent = '✅ Successfully imported ' + importedData.length + ' transcripts! Total transcripts: ' + uniqueTranscripts.length;
                   statusDiv.className = 'status success';
                   statusDiv.style.display = 'block';
                   
                   
                   
                   
                 } catch (error) {
                   const statusDiv = document.getElementById('status');
                   statusDiv.textContent = '❌ Import failed: ' + error.message;
                   statusDiv.className = 'status error';
                   statusDiv.style.display = 'block';
                   console.error('Import error:', error);
                 }
               };
               
               reader.readAsText(file);
               
               // Reset the file input
               event.target.value = '';
             }
            
                         async function sendToAPI() {
               const statusDiv = document.getElementById('status');
               const data = ${JSON.stringify(transcripts)};
               
               // Debug: Log what we're sending
               console.log('Sending to API:', data);
               console.log('Data structure:', data[0] ? Object.keys(data[0]) : 'No data');
               
               try {
                 statusDiv.textContent = '📤 Sending transcripts to API...';
                 statusDiv.className = 'status';
                 statusDiv.style.display = 'block';
                 
                 const endpoint = 'http://172.22.225.47:8006/transcripts/batch';
                 
                 // Convert to snake_case format (as shown in the error)
                 const snakeCaseData = data.map(t => ({
                   id: t.id,
                   mic_id: t.micId,
                   zone_id: t.zoneId,
                   table_id: t.tableId,
                   topic_id: t.topicId,
                   topic_name: t.topicName,
                   transcript: t.transcript,
                   timestamp: t.timestamp
                 }));
                 
                 const response = await fetch(endpoint, {
                   method: 'POST',
                   headers: {
                     'Content-Type': 'application/json',
                   },
                   body: JSON.stringify(snakeCaseData)
                 });
                 
                 if (response.ok) {
                   const result = await response.json();
                   statusDiv.textContent = '✅ Successfully sent ' + data.length + ' transcripts to API!';
                   statusDiv.className = 'status success';
                   console.log('API Response:', result);
                 } else {
                   const errorText = await response.text();
                   console.error('API Error Response:', errorText);
                   throw new Error('HTTP ' + response.status + ': ' + response.statusText + ' - ' + errorText);
                 }
               } catch (error) {
                 statusDiv.textContent = '❌ Error sending to API: ' + error.message;
                 statusDiv.className = 'status error';
                 console.error('API Error:', error);
               }
             }
            
                                                                       function deleteTranscript(transcriptId, index) {
                if (confirm('Are you sure you want to delete this transcript? This action cannot be undone.')) {
                  try {
                    // Get current data from localStorage and update it
                    const stored = localStorage.getItem('sttDatabase');
                    if (!stored) {
                      alert('No database found');
                      return;
                    }
                    
                    const data = JSON.parse(stored);
                    const transcripts = data.transcripts || [];
                    
                    // Remove the specific transcript
                    const updatedTranscripts = transcripts.filter(function(t) { return t.id !== transcriptId; });
                    
                    // Update localStorage
                    data.transcripts = updatedTranscripts;
                    localStorage.setItem('sttDatabase', JSON.stringify(data));
                    
                    // Remove from DOM
                    const transcriptElement = document.querySelector('[data-transcript-id="' + transcriptId + '"]');
                    if (transcriptElement) {
                      transcriptElement.remove();
                    }
                    
                    // Update summary
                    const summaryElement = document.querySelector('.summary');
                    if (summaryElement) {
                      summaryElement.innerHTML = '<strong>Summary:</strong> Total transcripts: ' + updatedTranscripts.length;
                    }
                    
                    // Show success message
                    const statusDiv = document.getElementById('status');
                    statusDiv.textContent = '✅ Transcript deleted successfully!';
                    statusDiv.className = 'status success';
                    statusDiv.style.display = 'block';
                    
                    // Hide success message after 3 seconds
                    setTimeout(function() {
                      statusDiv.style.display = 'none';
                    }, 3000);
                    
                  } catch (error) {
                    console.error('Error deleting transcript:', error);
                    alert('Error deleting transcript');
                  }
                }
              }
             
                             function clearAll() {
                 if (confirm('Are you sure you want to delete ALL transcripts? This action cannot be undone.')) {
                   // Clear from localStorage
                   const stored = localStorage.getItem('sttDatabase');
                   if (stored) {
                     const data = JSON.parse(stored);
                     data.transcripts = [];
                     localStorage.setItem('sttDatabase', JSON.stringify(data));
                   }
                   
                   // Clear the display
                   const transcriptsContainer = document.getElementById('transcripts');
                   if (transcriptsContainer) {
                     transcriptsContainer.innerHTML = '';
                   }
                   
                   // Update summary
                   const summaryElement = document.querySelector('.summary');
                   if (summaryElement) {
                     summaryElement.innerHTML = '<strong>Summary:</strong> Total transcripts: 0';
                   }
                   
                   // Show success message
                   const statusDiv = document.getElementById('status');
                   statusDiv.textContent = '✅ All transcripts cleared successfully!';
                   statusDiv.className = 'status success';
                   statusDiv.style.display = 'block';
                   
                   // Hide success message after 3 seconds
                   setTimeout(function() {
                     statusDiv.style.display = 'none';
                   }, 3000);
                   
                   alert('All transcripts cleared. Please close this window and refresh the main application.');
                 }
               }
           </script>
        </body>
        </html>
      `;

      // Open in new tab
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
      } else {
        alert('Please allow popups to view transcript history');
      }
    } catch (error) {
      console.error('Error opening transcript viewer:', error);
      alert('Error opening transcript viewer');
    }
  };

  const startAllRecording = async () => {
    // Get all connected mics that are not currently recording
    const connectedMics = mics.filter(mic => {
      const status = micStatuses.get(mic.micId);
      return status?.isConnected && !isRecording(mic.micId);
    });

    if (connectedMics.length === 0) {
      console.log('No connected mics available to start recording');
      return;
    }
    
    console.log(`Starting recording for ${connectedMics.length} connected mics with 50ms delay between each`);

    // Start recording for each connected mic with 50ms delay
    for (let i = 0; i < connectedMics.length; i++) {
      const mic = connectedMics[i];
      
      // Add delay for all except the first mic
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      try {
        await handleRecording(mic.micId);
        console.log(`Started recording for mic ${mic.micId}`);
      } catch (error) {
        console.error(`Failed to start recording for mic ${mic.micId}:`, error);
      }
    }
  };

  const stopAllRecording = async () => {
    // Get all mics that are currently recording
    const recordingMics = mics.filter(mic => isRecording(mic.micId));

    if (recordingMics.length === 0) {
      console.log('No mics currently recording');
      return;
    }

    console.log(`Stopping recording for ${recordingMics.length} mics with 50ms delay between each`);

    // Stop recording for each mic with 50ms delay
    for (let i = 0; i < recordingMics.length; i++) {
      const mic = recordingMics[i];
      
      // Add delay for all except the first mic
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      try {
        await stopRecording(mic.micId);
        console.log(`Stopped recording for mic ${mic.micId}`);
    } catch (error) {
        console.error(`Failed to stop recording for mic ${mic.micId}:`, error);
      }
    }
  };

  const activateAllMics = async () => {
    // Check if any mics are currently active
    const activeMics = mics.filter(mic => mic.isActive);
    const inactiveMics = mics.filter(mic => !mic.isActive);
    
    // Check if any active mics are disconnected from STT server
    const disconnectedActiveMics = activeMics.filter(mic => {
      const status = micStatuses.get(mic.micId);
      return status?.status === 'Disconnected from STT server';
    });

    if (disconnectedActiveMics.length > 0) {
      // Scenario 2: Some active mics are disconnected from STT server
      // First, deactivate all mics
      console.log('Deactivating all mics due to STT server disconnection...');
      
      for (let i = 0; i < mics.length; i++) {
        const mic = mics[i];
        if (mic.isActive) {
          try {
            await updateMic(mic.micId, { isActive: false });
            // Close connection if it exists
            const connection = micConnections.get(mic.micId);
            if (connection) {
              connection.close();
              setMicConnections(prev => {
                const newMap = new Map(prev);
                newMap.delete(mic.micId);
                return newMap;
              });
            }
            setMicStatuses(prev => new Map(prev).set(mic.micId, { 
              isConnected: false, 
              status: 'Disconnected' 
            }));
          } catch (error) {
            console.error(`Failed to deactivate mic ${mic.micId}:`, error);
          }
        }
      }
      
      // Wait a moment, then activate all mics
      setTimeout(async () => {
        console.log('Reactivating all mics...');
        for (let i = 0; i < mics.length; i++) {
          const mic = mics[i];
          try {
            await updateMic(mic.micId, { isActive: true });
            const connection = await createSTTConnection(mic);
            if (connection) {
              setMicConnections(prev => new Map(prev).set(mic.micId, connection));
            }
          } catch (error) {
            console.error(`Failed to reactivate mic ${mic.micId}:`, error);
          }
          
          // Add delay between activations
          if (i < mics.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      }, 1000);
      
    } else if (inactiveMics.length > 0) {
      // Scenario 1: Some mics are disconnected (inactive)
      // Activate all inactive mics
      console.log('Activating all inactive mics...');
      
      for (let i = 0; i < inactiveMics.length; i++) {
        const mic = inactiveMics[i];
        try {
          await updateMic(mic.micId, { isActive: true });
          const connection = await createSTTConnection(mic);
          if (connection) {
            setMicConnections(prev => new Map(prev).set(mic.micId, connection));
          }
        } catch (error) {
          console.error(`Failed to activate mic ${mic.micId}:`, error);
        }
        
        // Add delay between activations
        if (i < inactiveMics.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    } else {
      // All mics are already active and connected
      console.log('All mics are already active and connected');
    }
  };

  return (
    <div style={{
      maxWidth: 1400,
      margin: '0 auto',
      padding: 20,
      fontFamily: 'Arial, sans-serif'
    }}>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30
      }}>
        <h1 style={{ color: '#333', margin: 0 }}>
          Multi-Microphone STT Transcription System
        </h1>
        
        <button
          onClick={openTranscriptViewer}
          style={{
            background: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '12px 24px',
            fontSize: 16,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          📝 View Transcript History
        </button>
             </div>
       
       {/* Success Message */}
       {successMessage && (
         <div style={{
           position: 'fixed',
           top: 20,
           right: 20,
           background: '#4caf50',
           color: 'white',
           padding: '12px 20px',
           borderRadius: 6,
           fontSize: 14,
           fontWeight: 'bold',
           zIndex: 1000,
           boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
           animation: 'slideIn 0.3s ease-out'
         }}>
           ✅ {successMessage}
         </div>
       )}
       
               {/* Button Container */}
        <div style={{ 
          marginBottom: 20, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <button
            onClick={addMic}
            style={{
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              fontSize: 16,
              cursor: 'pointer'
            }}
          >
            ➕ Add New Microphone
        </button>
        
        <button
            onClick={activateAllMics}
          style={{
            background: '#9c27b0',
            color: 'white',
            border: 'none',
            borderRadius: 8,
              padding: '12px 24px',
              fontSize: 16,
              cursor: 'pointer'
            }}
          >
            🔌 Activate All
          </button>

        <button
            onClick={startAllRecording}
          style={{
            background: '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: 8,
              padding: '12px 24px',
              fontSize: 16,
              cursor: 'pointer'
            }}
          >
            🎙️ Start All Recording
          </button>

          <button
            onClick={stopAllRecording}
            style={{
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
            fontSize: 16,
              cursor: 'pointer'
          }}
        >
            ⏹️ Stop All Recording
        </button>
      </div>
      
      {/* Microphones Table */}
       <div style={{
         background: 'white',
         borderRadius: 8,
        border: '1px solid #ddd',
        overflow: 'hidden'
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr',
          gap: 1,
          background: '#f5f5f5',
          padding: '12px',
          fontWeight: 'bold',
          fontSize: 14,
          borderBottom: '1px solid #ddd'
        }}>
          <div>Device</div>
          <div>Zone</div>
          <div>Table ID</div>
          <div>Topic ID</div>
          <div>Topic Name</div>
          <div>STT Endpoint</div>
          <div>Status</div>
          <div>Actions</div>
          <div>Transcript</div>
        </div>

        {/* Table Rows */}
        {mics.length === 0 ? (
          <div style={{
            padding: 40,
            textAlign: 'center',
            color: '#666',
            fontStyle: 'italic'
          }}>
            No microphones configured. Click "Add New Microphone" to get started.
          </div>
        ) : (
          mics.map(mic => {
            const status = micStatuses.get(mic.micId);
            const transcript = micTranscripts.get(mic.micId);
            const recording = isRecording(mic.micId);
            
            return (
              <div
                key={mic.micId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr',
                  gap: 1,
                  padding: '12px',
                  borderBottom: '1px solid #eee',
                  alignItems: 'center',
                  background: mic.isActive ? '#f8fff8' : '#fff'
                }}
              >
                {/* Device Selection */}
                <div>
                  <select
                    value={mic.deviceId}
                    onChange={(e) => {
                      const device = audioDevices.find(d => d.deviceId === e.target.value);
                      updateMic(mic.micId, { 
                        deviceId: e.target.value,
                        deviceName: device?.label || ''
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: 4,
                      border: '1px solid #ddd',
                      fontSize: 12
                    }}
                  >
                    <option value="">Select device...</option>
                    {audioDevices.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Zone Selection */}
                <div>
                  <select
                    value={mic.zoneId}
                    onChange={(e) => {
                      const newZoneId = parseInt(e.target.value);
                      // Clear topic selections when zone changes
                      updateMic(mic.micId, { 
                        zoneId: newZoneId,
                        topicId: '',
                        topicName: ''
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: 4,
                      border: '1px solid #ddd',
                      fontSize: 12
                    }}
                  >
                    <option value={1}>Digital Transformation and Urban Futures</option>
                    <option value={2}>City Leadership and Economic Development</option>
                    <option value={3}>Quality of Life</option>
                    <option value={4}>Environmental Solutions and Urban Regeneration</option>
                  </select>
                </div>

                                 {/* Table ID */}
                 <div>
                   <select
                     value={mic.tableId}
                     onChange={(e) => updateMic(mic.micId, { tableId: e.target.value })}
                     style={{
                       width: '100%',
                       padding: '6px',
                       borderRadius: 4,
                       border: '1px solid #ddd',
                       fontSize: 12
                     }}
                   >
                                           <option value="">Select Table...</option>
                      <option value="01">01</option>
                      <option value="02">02</option>
                      <option value="03">03</option>
                      <option value="04">04</option>
                      <option value="05">05</option>
                      <option value="06">06</option>
                      <option value="07">07</option>
                      <option value="08">08</option>
                      <option value="09">09</option>
                      <option value="10">10</option>
                      <option value="11">11</option>
                      <option value="12">12</option>
                      <option value="13">13</option>
                      <option value="14">14</option>
                      <option value="15">15</option>
                      <option value="16">16</option>
                      <option value="17">17</option>
                      <option value="18">18</option>
                      <option value="19">19</option>
                      <option value="20">20</option>
                   </select>
                 </div>

                                 {/* Topic ID */}
                 <div>
                   <select
                     value={mic.topicId}
                     onChange={(e) => {
                       const selectedTopicId = e.target.value;
                       const selectedTopic = topicMapping.find(topic => topic.id === selectedTopicId);
                       updateMic(mic.micId, { 
                         topicId: selectedTopicId,
                         topicName: selectedTopic ? selectedTopic.name : ''
                       });
                     }}
                     style={{
                       width: '100%',
                       padding: '6px',
                       borderRadius: 4,
                       border: '1px solid #ddd',
                       fontSize: 12
                     }}
                   >
                     <option value="">Select Topic ID...</option>
                     {topicMapping
                       .filter(topic => topic.zoneId === mic.zoneId)
                       .map(topic => (
                         <option key={topic.id} value={topic.id}>
                           {topic.id}
                         </option>
                       ))}
                   </select>
                 </div>

                                 {/* Topic Name */}
                 <div>
                   <select
                     value={mic.topicName}
                     onChange={(e) => {
                       const selectedTopicName = e.target.value;
                       const selectedTopic = topicMapping.find(topic => topic.name === selectedTopicName);
                       updateMic(mic.micId, { 
                         topicName: selectedTopicName,
                         topicId: selectedTopic ? selectedTopic.id : ''
                       });
                     }}
                     style={{
                       width: '100%',
                       padding: '6px',
                       borderRadius: 4,
                       border: '1px solid #ddd',
                       fontSize: 12
                     }}
                   >
                     <option value="">Select Topic Name...</option>
                     {topicMapping
                       .filter(topic => topic.zoneId === mic.zoneId)
                       .map(topic => (
                         <option key={topic.id} value={topic.name}>
                           {topic.name}
                         </option>
                       ))}
                   </select>
                 </div>

                {/* STT Endpoint */}
                <div>
                  <select
                    value={mic.sttEndpoint}
                    onChange={(e) => updateMic(mic.micId, { sttEndpoint: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: 4,
                      border: '1px solid #ddd',
                      fontSize: 12
                    }}
                  >
                    {sttEndpoints.map(endpoint => (
                      <option key={endpoint.id} value={endpoint.id}>
                        {endpoint.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 'bold',
                    background: status?.isConnected ? '#e8f5e8' : '#ffe8e8',
                    color: status?.isConnected ? '#2e7d32' : '#c62828',
                    border: `1px solid ${status?.isConnected ? '#4caf50' : '#f44336'}`
                  }}>
                    {status?.status || 'Unknown'}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                  <button
                    onClick={() => toggleMicActive(mic.micId)}
                    style={{
                      background: mic.isActive ? '#f44336' : '#4caf50',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      padding: '4px 8px',
                      fontSize: 11,
                      cursor: 'pointer'
                    }}
                    title={mic.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {mic.isActive ? '🔴' : '🟢'}
                  </button>
                  
                  <button
                    onClick={() => handleRecording(mic.micId)}
                    disabled={!mic.isActive || !status?.isConnected}
                    style={{
                      background: recording ? '#f44336' : '#2196f3',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      padding: '4px 8px',
                      fontSize: 11,
                      cursor: (mic.isActive && status?.isConnected) ? 'pointer' : 'not-allowed',
                      opacity: (mic.isActive && status?.isConnected) ? 1 : 0.5
                    }}
                    title={recording ? 'Stop Recording' : 'Start Recording'}
                  >
                    {recording ? '⏹️' : '🎤'}
                  </button>
                  
                  <button
                    onClick={() => deleteMic(mic.micId)}
                    style={{
                      background: '#ff5722',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      padding: '4px 8px',
                      fontSize: 11,
                      cursor: 'pointer'
                    }}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>

                {/* Transcript */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
           <div style={{
                    height: '60px',
                    overflowY: 'auto',
                    padding: '4px',
                    background: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: 'monospace'
                  }}>
                    {transcript ? (
                      <div style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                        {transcript}
                      </div>
                    ) : (
                      <div style={{ color: '#999', fontStyle: 'italic' }}>
                        No transcript...
           </div>
         )}
       </div>
      
                  {transcript && (
                    <button
                      onClick={() => downloadTranscript(mic.micId)}
                      style={{
                        background: '#2196f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        padding: '2px 6px',
                        fontSize: 10,
                        cursor: 'pointer'
                      }}
                    >
                      📥 Download
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default App; 