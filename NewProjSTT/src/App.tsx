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

  const sttEndpoints: STTEndpoint[] = [
    {
      id: 'endpoint1',
      name: 'STT Server 1',
      url: 'ws://172.22.225.138:11004/api/asr-streaming',
      apiKey: 'public_token'
    },
    {
      id: 'endpoint2',
      name: 'STT Server 2',
      url: 'ws://172.22.225.139:11004/api/asr-streaming',
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
      
      // Initialize status for all mics
      const newStatuses = new Map();
      allMics.forEach(mic => {
        newStatuses.set(mic.micId, { isConnected: false, status: 'Disconnected' });
      });
      setMicStatuses(newStatuses);
    } catch (error) {
      console.error('Error loading mics:', error);
    }
  };

  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
          groupId: device.groupId
        }));
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

    const proxyUrl = `ws://localhost:8030`;
    
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
      sttEndpoint: 'endpoint1',
      isActive: false
    };

    try {
      const micId = await databaseService.addMic(newMic);
      await loadMics();
    } catch (error) {
      console.error('Error adding mic:', error);
      alert('Error adding microphone');
    }
  };

  const updateMic = async (micId: string, updates: Partial<MicConfig>) => {
    try {
      await databaseService.updateMic(micId, updates);
      await loadMics();
    } catch (error) {
      console.error('Error updating mic:', error);
    }
  };

  const deleteMic = async (micId: string) => {
    if (window.confirm('Are you sure you want to delete this microphone?')) {
      try {
        await databaseService.deleteMic(micId);
        await loadMics();
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
        
        // Handle STT responses
        connection.onmessage = (event) => {
          try {
            if (event.data instanceof Blob) {
              event.data.arrayBuffer().then(buffer => {
                const uint8Array = new Uint8Array(buffer);
                const data = msgpack.decode(uint8Array);
                
                if (data.type === 'Word' && data.text) {
                  transcript += (transcript ? ' ' : '') + data.text;
                  setMicTranscripts(prev => new Map(prev).set(micId, transcript));
                }
              });
            }
          } catch (e) {
            console.error('Error processing STT message:', e);
          }
        };
        
        source.connect(processor);
        processor.connect(audioContext.destination);
        
        // Store the processor for cleanup
        setMicConnections(prev => {
          const newMap = new Map(prev);
          const connection = newMap.get(micId);
          if (connection) {
            (connection as any).processor = processor;
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
    if (connection && (connection as any).processor) {
      const processor = (connection as any).processor;
      processor.disconnect();
      (connection as any).processor = null;
    }
    
    const transcript = micTranscripts.get(micId);
    if (transcript) {
      const mic = mics.find(m => m.micId === micId);
      if (mic) {
        try {
          await databaseService.addTranscript({
            micId: mic.micId,
            zoneId: mic.zoneId,
            tableId: mic.tableId,
            topicId: mic.topicId,
            topicName: mic.topicName,
            transcript: transcript,
            timestamp: new Date().toISOString()
          });
          
          // Clear the transcript
          setMicTranscripts(prev => {
            const newMap = new Map(prev);
            newMap.delete(micId);
            return newMap;
          });
          
          alert('Transcript saved successfully!');
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
      // Get all transcripts from localStorage
      const stored = localStorage.getItem('sttDatabase');
      if (!stored) {
        alert('No transcripts found in database');
        return;
      }

      const data = JSON.parse(stored);
      const transcripts = data.transcripts || [];
      
      if (transcripts.length === 0) {
        alert('No transcripts found in database');
        return;
      }

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
            .clear { background: #f44336; }
            .transcript { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 4px; }
            .transcript-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .transcript-content { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; }
            .summary { background: #e3f2fd; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📝 Transcript History Viewer</h1>
              <div class="controls">
                <button class="refresh" onclick="location.reload()">🔄 Refresh</button>
                <button class="export" onclick="exportData()">📥 Export JSON</button>
                <button class="clear" onclick="clearAll()">🗑️ Clear All</button>
              </div>
            </div>
            
            <div class="summary">
              <strong>Summary:</strong> Total transcripts: ${transcripts.length}
            </div>
            
            <div id="transcripts">
              ${transcripts.map((t: any) => `
                <div class="transcript">
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
            
            function clearAll() {
              if (confirm('Are you sure you want to delete ALL transcripts? This action cannot be undone.')) {
                localStorage.removeItem('sttDatabase');
                alert('All transcripts cleared. Please close this window and refresh the main application.');
              }
            }
          </script>
        </body>
        </html>
      `;

      // Open in new window
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

  return (
    <div style={{
      maxWidth: 1400,
      margin: '0 auto',
      padding: 20,
      fontFamily: 'Arial, sans-serif'
    }}>
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
      
      {/* Add Mic Button */}
      <div style={{ marginBottom: 20 }}>
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
                    onChange={(e) => updateMic(mic.micId, { zoneId: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: 4,
                      border: '1px solid #ddd',
                      fontSize: 12
                    }}
                  >
                    <option value={1}>Zone 1</option>
                    <option value={2}>Zone 2</option>
                    <option value={3}>Zone 3</option>
                    <option value={4}>Zone 4</option>
                  </select>
                </div>

                {/* Table ID */}
                <div>
                  <input
                    type="text"
                    value={mic.tableId}
                    onChange={(e) => updateMic(mic.micId, { tableId: e.target.value })}
                    placeholder="Table ID"
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: 4,
                      border: '1px solid #ddd',
                      fontSize: 12
                    }}
                  />
                </div>

                {/* Topic ID */}
                <div>
                  <input
                    type="text"
                    value={mic.topicId}
                    onChange={(e) => updateMic(mic.micId, { topicId: e.target.value })}
                    placeholder="Topic ID"
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: 4,
                      border: '1px solid #ddd',
                      fontSize: 12
                    }}
                  />
                </div>

                {/* Topic Name */}
                <div>
                  <input
                    type="text"
                    value={mic.topicName}
                    onChange={(e) => updateMic(mic.micId, { topicName: e.target.value })}
                    placeholder="Topic Name"
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: 4,
                      border: '1px solid #ddd',
                      fontSize: 12
                    }}
                  />
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