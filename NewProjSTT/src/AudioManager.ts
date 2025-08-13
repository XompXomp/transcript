import { MicConfig } from './types';
import { WebSocketManager } from './WebSocketManager';

interface AudioStream {
  micId: string;
  mediaStream: MediaStream;
  audioContext: AudioContext;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  isRecording: boolean;
  sampleRate: number;
  chunkSize: number;
  debugCounter?: number;
}

export class AudioManager {
  private audioStreams: Map<string, AudioStream> = new Map();
  private webSocketManager: WebSocketManager;
  private audioWorker: Worker | null = null;
  private isInitialized = false;

  constructor(webSocketManager: WebSocketManager) {
    this.webSocketManager = webSocketManager;
  }

  /**
   * Initialize the audio manager with Web Workers for processing
   */
  async initialize(): Promise<boolean> {
    try {
      // Create Web Worker for audio processing
      this.audioWorker = new Worker(new URL('./audioWorker.ts', import.meta.url));
      
      this.audioWorker.onmessage = (event) => {
        const { micId, audioData, error } = event.data;
        
        if (error) {
          console.error(`Audio processing error for mic ${micId}:`, error);
          return;
        }
        
        // Send processed audio data to WebSocket manager
        this.webSocketManager.sendAudioData(micId, audioData);
      };

      this.isInitialized = true;
      console.log('✅ Audio Manager initialized with Web Worker');
      return true;
    } catch (error) {
      console.error('Failed to initialize Audio Manager:', error);
      return false;
    }
  }

  /**
   * Validate that a device exists and is accessible
   */
  async validateDevice(deviceId: string): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      const deviceExists = audioDevices.some(device => device.deviceId === deviceId);
      
      if (!deviceExists) {
        console.error(`Device ${deviceId} not found. Available devices:`, audioDevices.map(d => ({ id: d.deviceId, label: d.label })));
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error validating device:', error);
      return false;
    }
  }

  /**
   * Start recording audio for a microphone
   */
  async startRecording(mic: MicConfig): Promise<boolean> {
    if (!this.isInitialized) {
      console.error('Audio Manager not initialized');
      return false;
    }

    try {
      // Validate deviceId
      if (!mic.deviceId || mic.deviceId.trim() === '') {
        console.error(`No device selected for mic ${mic.micId}. Please select a microphone device.`);
        return false;
      }

      // Validate that the device exists
      const deviceValid = await this.validateDevice(mic.deviceId);
      if (!deviceValid) {
        console.error(`Invalid device selected for mic ${mic.micId}. Device ${mic.deviceId} not found.`);
        return false;
      }

      // Get microphone access with specific device
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: mic.deviceId }, // Use exact deviceId to ensure specific microphone
          sampleRate: 24000, // Unmute STT expects 24kHz
          channelCount: 1,   // Mono
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      // Create audio context
      const audioContext = new AudioContext({ sampleRate: 24000 });
      const source = audioContext.createMediaStreamSource(mediaStream);
      
      // Create script processor for audio processing - smaller chunks for lower latency
      const processor = audioContext.createScriptProcessor(1024, 1, 1); // 1024 samples = ~43ms at 24kHz (power of 2)
      
      const audioStream: AudioStream = {
        micId: mic.micId,
        mediaStream,
        audioContext,
        source,
        processor,
        isRecording: false,
        sampleRate: 24000,
        chunkSize: 1024
      };

      // Set up audio processing
      processor.onaudioprocess = (event) => {
        if (!audioStream.isRecording) return;
        
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Debug: Check if we're getting actual audio data
        const maxAmplitude = Math.max(...inputData.map(Math.abs));
        const avgAmplitude = inputData.reduce((sum, val) => sum + Math.abs(val), 0) / inputData.length;
        
        // Log audio levels every 50 chunks (about every 4 seconds)
        if (!audioStream.debugCounter) audioStream.debugCounter = 0;
        audioStream.debugCounter++;
        
        if (audioStream.debugCounter % 50 === 0) {
          console.log(`🎵 Mic ${mic.micId} - Max amplitude: ${maxAmplitude.toFixed(4)}, Avg amplitude: ${avgAmplitude.toFixed(4)}`);
          
          // Check if we're getting silence
          if (maxAmplitude < 0.001) {
            console.warn(`⚠️ Mic ${mic.micId} - Very low audio levels detected! Possible silence or microphone issue.`);
          }
        }
        
        // Send raw Float32Array directly to WebSocket manager
        // Unmute STT expects float32 values, not int16
        this.webSocketManager.sendAudioData(mic.micId, new Uint8Array(inputData.buffer));
      };

      // Connect audio nodes
      source.connect(processor);
      processor.connect(audioContext.destination);

      this.audioStreams.set(mic.micId, audioStream);
      audioStream.isRecording = true;

      console.log(`🎤 Started recording mic ${mic.micId}`);
      return true;

    } catch (error) {
      console.error(`Failed to start recording for mic ${mic.micId}:`, error);
      return false;
    }
  }

  /**
   * Stop recording audio for a microphone
   */
  stopRecording(micId: string): void {
    const audioStream = this.audioStreams.get(micId);
    if (!audioStream) return;

    try {
      audioStream.isRecording = false;
      
      // Stop all tracks
      audioStream.mediaStream.getTracks().forEach(track => track.stop());
      
      // Disconnect audio nodes
      audioStream.source.disconnect();
      audioStream.processor.disconnect();
      
      // Close audio context
      if (audioStream.audioContext.state !== 'closed') {
        audioStream.audioContext.close();
      }
      
      this.audioStreams.delete(micId);
      console.log(`🔇 Stopped recording mic ${micId}`);
      
    } catch (error) {
      console.error(`Error stopping recording for mic ${micId}:`, error);
    }
  }

  /**
   * Start recording for multiple microphones
   */
  async startMultipleRecordings(mics: MicConfig[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    // Start recordings in parallel
    const promises = mics.map(async (mic) => {
      const success = await this.startRecording(mic);
      results.set(mic.micId, success);
      return { micId: mic.micId, success };
    });
    
    await Promise.all(promises);
    return results;
  }

  /**
   * Stop all recordings
   */
  stopAllRecordings(): void {
    this.audioStreams.forEach((audioStream, micId) => {
      this.stopRecording(micId);
    });
  }

  /**
   * Get recording status for a microphone
   */
  getRecordingStatus(micId: string): boolean {
    const audioStream = this.audioStreams.get(micId);
    return audioStream?.isRecording || false;
  }

  /**
   * Get all recording statuses
   */
  getAllRecordingStatuses(): Map<string, boolean> {
    const statuses = new Map();
    this.audioStreams.forEach((audioStream, micId) => {
      statuses.set(micId, audioStream.isRecording);
    });
    return statuses;
  }

  /**
   * Get the number of active recordings
   */
  getActiveRecordingCount(): number {
    return Array.from(this.audioStreams.values()).filter(stream => stream.isRecording).length;
  }

  /**
   * Convert Float32Array to Int16Array (PCM format)
   */
  private float32ToInt16(float32Array: Float32Array): Uint8Array {
    const int16Array = new Int16Array(float32Array.length);
    
    for (let i = 0; i < float32Array.length; i++) {
      // Convert float32 (-1.0 to 1.0) to int16 (-32768 to 32767)
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    
    return new Uint8Array(int16Array.buffer);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAllRecordings();
    
    if (this.audioWorker) {
      this.audioWorker.terminate();
      this.audioWorker = null;
    }
    
    this.isInitialized = false;
    console.log('🧹 Audio Manager destroyed');
  }
}
