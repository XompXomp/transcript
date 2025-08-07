import React, { useState, useRef, useEffect } from 'react';
// @ts-ignore
import msgpack from 'msgpack-lite';

// STT WebSocket endpoint (same as in your example)
const STT_PROXY_URL = 'ws://localhost:8030';

const App: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [status, setStatus] = useState('Ready to record');
  const [isConnected, setIsConnected] = useState(false);
  
  const sttWsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<any>(null);
  const hasConnectedRef = useRef<boolean>(false);

  // Connect to STT server on component mount
  useEffect(() => {
    if (!hasConnectedRef.current) {
      hasConnectedRef.current = true;
      createSTTConnection();
    }
    
    return () => {
      closeSTTConnection();
      if (recorderRef.current) {
        recorderRef.current.disconnect();
      }
    };
  }, []);

  // Function to create and setup STT WebSocket connection
  const createSTTConnection = () => {
    if (sttWsRef.current && sttWsRef.current.readyState === WebSocket.OPEN) {
      console.log('STT WebSocket already connected');
      return;
    }
    
    console.log('Creating new STT WebSocket connection');
    const sttWs = new WebSocket(STT_PROXY_URL);
    sttWsRef.current = sttWs;
    
    sttWs.onopen = () => {
      console.log('STT WebSocket connected');
      setIsConnected(true);
      setStatus('Connected to STT server');
      
      // Send authentication token
      try {
        const authMessage = {
          type: "Auth",
          token: "public_token"
        };
        const encoded = msgpack.encode(authMessage);
        sttWs.send(encoded);
        console.log('Sent authentication message');
      } catch (e) {
        console.log('Could not send auth message:', e);
      }
    };
    
    sttWs.onmessage = (event) => {
      try {
        if (event.data instanceof Blob) {
          event.data.arrayBuffer().then(buffer => {
            try {
              const uint8Array = new Uint8Array(buffer);
              const data = msgpack.decode(uint8Array);
              console.log('STT MessagePack decoded:', data);
              handleSTTMessage(data);
            } catch (e) {
              console.error('Failed to decode MessagePack:', e);
            }
          });
        } else {
          console.log('STT text message:', event.data);
        }
      } catch (e: any) {
        console.error('STT WebSocket message handling error:', e);
      }
    };
    
    sttWs.onerror = (error) => {
      console.error('STT WebSocket error:', error);
      setStatus('Connection error');
      setIsConnected(false);
    };
    
    sttWs.onclose = () => {
      console.log('STT WebSocket closed');
      sttWsRef.current = null;
      setIsConnected(false);
      setStatus('Disconnected from STT server');
    };
  };
  
  // Function to close STT WebSocket connection
  const closeSTTConnection = () => {
    if (sttWsRef.current && sttWsRef.current.readyState === WebSocket.OPEN) {
      console.log('Closing STT WebSocket connection');
      sttWsRef.current.close();
      sttWsRef.current = null;
    }
  };

  // Handle STT messages and accumulate transcription
  const handleSTTMessage = (data: any) => {
    console.log('Processing STT message:', data);
    
    if (data.type === 'Word' && data.text) {
      // TEMPORARY LOGGING - Text being received
      console.log('📝 TEXT RECEIVED:', {
        type: 'Word',
        text: data.text,
        timestamp: new Date().toISOString(),
        fullMessage: data
      });
      
      // Simply add the word to transcription with a space
      setTranscription(prev => prev + (prev ? ' ' : '') + data.text);
      setStatus('Recording...');
      
    } else if (data.type === 'Marker') {
      console.log('STT Marker received - ignoring');
      
    } else if (data.type === 'EndWord') {
      console.log('STT Word ended at time:', data.stop_time);
      
    } else if (data.type === 'Step') {
      console.log('STT Step received:', data.step_idx, 'pause prediction:', data.prs);
      
    } else if (data.type === 'Ready') {
      console.log('STT Ready message received');
      setStatus('STT server ready');
      
    } else if (data.type === 'Error') {
      console.error('STT Error:', data.message);
      setStatus(`STT Error: ${data.message}`);
      
      // If it's a "no free channels" error, try to reconnect after a delay
      if (data.message === 'no free channels') {
        setStatus('Server busy, retrying in 5 seconds...');
        setTimeout(() => {
          console.log('Retrying connection after server busy error');
          closeSTTConnection();
          setTimeout(() => createSTTConnection(), 1000);
        }, 5000);
      }
      
    } else {
      console.log('Unknown message type:', data.type);
    }
  };



  // Function to download all transcription
  const downloadAllTranscription = () => {
    if (!transcription) {
      alert('No transcription to download');
      return;
    }
    
    const blob = new Blob([transcription], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `full_transcription_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Function to clear transcription
  const clearTranscription = () => {
    setTranscription('');
  };

  // Handle microphone recording
  const handleRecording = async () => {
    if (isRecording) {
      // Stop recording
      console.log('Stopping recording');
      
      if (recorderRef.current) {
        const processor = recorderRef.current;
        if (processor.disconnect) {
          processor.disconnect();
        }
        recorderRef.current = null;
      }
      
      setIsRecording(false);
      setStatus('Recording stopped');
      
      // Close STT WebSocket connection
      closeSTTConnection();
      
      
      
      return;
    }
    
    try {
      console.log('Starting recording');
      
             // Ensure STT WebSocket connection exists
       if (!sttWsRef.current || sttWsRef.current.readyState !== WebSocket.OPEN) {
         console.log('No active connection, creating new one');
         createSTTConnection();
       } else {
         console.log('Using existing connection');
       }
      
      // Use Web Audio API to get raw PCM data
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext({ sampleRate: 24000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(1024, 1, 1);
      
             processor.onaudioprocess = (event) => {
         if (sttWsRef.current && sttWsRef.current.readyState === 1) {
           // Get raw PCM data
           const inputData = event.inputBuffer.getChannelData(0);
           const pcmData = Array.from(inputData);
           
           // TEMPORARY LOGGING - Audio being sent
           console.log('🎤 AUDIO SENT:', {
             sampleRate: 24000,
             channels: 1,
             bitDepth: '32-bit float',
             dataLength: pcmData.length,
             firstFewSamples: pcmData.slice(0, 5),
             lastFewSamples: pcmData.slice(-5),
             minValue: Math.min(...pcmData),
             maxValue: Math.max(...pcmData),
             messageType: 'Audio'
           });
           
           // Send PCM data to STT
           const message = {
             type: 'Audio',
             pcm: pcmData
           };
           const encoded = msgpack.encode(message);
           sttWsRef.current.send(encoded);
         }
       };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      recorderRef.current = processor;
      setIsRecording(true);
      setStatus('Recording...');
      
    } catch (error) {
      console.error('Audio recording error:', error);
      alert('Error accessing microphone. Please check permissions.');
      setStatus('Recording failed');
    }
  };

  return (
    <div style={{
      maxWidth: 800,
      margin: '0 auto',
      padding: 20,
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: 30, color: '#333' }}>
        STT Transcription App
      </h1>
      
      {/* Status Display */}
      <div style={{
        background: isConnected ? '#e8f5e8' : '#ffe8e8',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        border: `2px solid ${isConnected ? '#4caf50' : '#f44336'}`
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 5 }}>
          Status: {status}
        </div>
        <div style={{ fontSize: 14, color: '#666' }}>
          Connection: {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      
      {/* Recording Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 30
      }}>
        <button
          onClick={handleRecording}
          disabled={!isConnected && !isRecording}
          style={{
            background: isRecording ? '#f44336' : '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: 80,
            height: 80,
            fontSize: 24,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}
          title={isRecording ? 'Stop Recording' : 'Start Recording'}
        >
          {isRecording ? '⏹️' : '🎤'}
        </button>
        
        <button
          onClick={downloadAllTranscription}
          disabled={!transcription}
          style={{
            background: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '12px 20px',
            fontSize: 16,
            cursor: 'pointer',
            opacity: transcription ? 1 : 0.5
          }}
        >
          📥 Download All
        </button>
        
        <button
          onClick={clearTranscription}
          disabled={!transcription}
          style={{
            background: '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '12px 20px',
            fontSize: 16,
            cursor: 'pointer',
            opacity: transcription ? 1 : 0.5
          }}
        >
          🗑️ Clear
        </button>
      </div>
      
             {/* Transcription Display */}
       <div style={{
         background: 'white',
         border: '2px solid #ddd',
         borderRadius: 8,
         padding: 20,
         minHeight: 400,
         maxHeight: 600,
         overflowY: 'auto'
       }}>
         <h3 style={{ marginBottom: 15, color: '#333' }}>Live Transcription</h3>
         
         {transcription ? (
           <pre style={{
             whiteSpace: 'pre-wrap',
             wordWrap: 'break-word',
             fontFamily: 'monospace',
             fontSize: 14,
             lineHeight: 1.5,
             color: '#333'
           }}>
             {transcription}
           </pre>
         ) : (
           <div style={{
             textAlign: 'center',
             color: '#999',
             fontStyle: 'italic',
             marginTop: 50
           }}>
             No transcription yet. Click the microphone button to start recording.
           </div>
         )}
       </div>
      
      {/* Instructions */}
      <div style={{
        background: '#f5f5f5',
        padding: 15,
        borderRadius: 8,
        marginTop: 20,
        fontSize: 14,
        color: '#666'
      }}>
        <h4 style={{ marginBottom: 10 }}>How to use:</h4>
        <ul style={{ marginLeft: 20 }}>
          <li>Click the microphone button to start recording</li>
          <li>Speak clearly into your microphone</li>
          <li>Each sentence will be automatically saved to a text file</li>
          <li>Click the microphone again to stop recording</li>
          <li>Use "Download All" to get the complete transcription</li>
        </ul>
      </div>
    </div>
  );
};

export default App; 