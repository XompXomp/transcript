import { MicConfig } from './types';
import { WebSocketManager } from './WebSocketManager';
import { backendAudioService, BackendAudioDevice } from './BackendAudioService';

interface BackendAudioStream {
  micId: string;
  streamId: string;
  deviceId: number;
  isRecording: boolean;
  sampleRate: number;
  chunkSize: number;
  debugCounter?: number;
}

export class BackendAudioManager {
  private audioStreams: Map<string, BackendAudioStream> = new Map();
  private webSocketManager: WebSocketManager;
  private isInitialized = false;
  private availableDevices: BackendAudioDevice[] = [];

  constructor(webSocketManager: WebSocketManager) {
    this.webSocketManager = webSocketManager;
  }

  /**
   * Initialize the audio manager
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔄 BackendAudioManager: Starting initialization...');
      
      // Initialize the backend audio service first
      console.log('🔄 BackendAudioManager: Initializing BackendAudioService...');
      const serviceInitialized = await backendAudioService.initialize();
      if (!serviceInitialized) {
        console.error('❌ BackendAudioService initialization failed');
        return false;
      }
      
      // Check backend health
      console.log('🔄 BackendAudioManager: Checking backend health...');
      const isHealthy = await backendAudioService.checkHealth();
      console.log('🔄 BackendAudioManager: Health check result:', isHealthy);
      
      if (!isHealthy) {
        console.error('❌ WDM Audio Backend is not healthy');
        return false;
      }

      // Load available devices
      console.log('🔄 BackendAudioManager: Loading devices...');
      await this.loadDevices();

      this.isInitialized = true;
      console.log('✅ Backend Audio Manager initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Backend Audio Manager:', error);
      return false;
    }
  }

  /**
   * Load available WDM audio devices from backend
   */
  async loadDevices(): Promise<BackendAudioDevice[]> {
    try {
      this.availableDevices = await backendAudioService.getDevices();
      console.log(`📋 Loaded ${this.availableDevices.length} WDM audio devices`);
      return this.availableDevices;
    } catch (error) {
      console.error('❌ Error loading WDM devices:', error);
      throw error;
    }
  }

  /**
   * Get available WDM audio devices
   */
  getAvailableDevices(): BackendAudioDevice[] {
    return this.availableDevices;
  }

  /**
   * Validate that a device exists and is accessible
   */
  async validateDevice(deviceId: number): Promise<boolean> {
    try {
      const deviceExists = this.availableDevices.some(device => device.id === deviceId);
      
      if (!deviceExists) {
        console.error(`Device ${deviceId} not found. Available devices:`, this.availableDevices.map(d => ({ id: d.id, name: d.name })));
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error validating device:', error);
      return false;
    }
  }

  /**
   * Start recording audio for a microphone using WDM backend
   */
  async startRecording(mic: MicConfig): Promise<boolean> {
    if (!this.isInitialized) {
      console.error('Backend Audio Manager not initialized');
      return false;
    }

    try {
      // Validate deviceId (convert string to number for backend)
      const deviceId = parseInt(mic.deviceId);
      if (isNaN(deviceId)) {
        console.error(`Invalid device ID for mic ${mic.micId}. Please select a WDM audio device.`);
        return false;
      }

      // Validate that the device exists
      const deviceValid = await this.validateDevice(deviceId);
      if (!deviceValid) {
        console.error(`Invalid device selected for mic ${mic.micId}. Device ${deviceId} not found.`);
        return false;
      }

      // Check if already recording
      if (this.audioStreams.has(mic.micId)) {
        const existingStream = this.audioStreams.get(mic.micId)!;
        if (existingStream.isRecording) {
          console.log(`Already recording for mic ${mic.micId}`);
          return true;
        }
      }

      // Create stream ID
      const streamId = `mic-${mic.micId}`;

      // Start WDM audio stream on backend
      const streamStarted = await backendAudioService.startStream(deviceId, streamId);
      if (!streamStarted) {
        console.error(`Failed to start WDM audio stream for mic ${mic.micId}`);
        return false;
      }

      // Subscribe to audio data from backend
      backendAudioService.subscribeToAudio(streamId, (audioData: Int16Array) => {
        this.handleAudioData(mic.micId, audioData);
      });

      // Store stream information
      const audioStream: BackendAudioStream = {
        micId: mic.micId,
        streamId: streamId,
        deviceId: deviceId,
        isRecording: true,
        sampleRate: 16000, // Backend provides 16kHz
        chunkSize: 1024,
        debugCounter: 0
      };

      this.audioStreams.set(mic.micId, audioStream);

      console.log(`🎤 Started WDM recording for mic ${mic.micId} using device ${deviceId}`);
      return true;

    } catch (error) {
      console.error(`Error starting WDM recording for mic ${mic.micId}:`, error);
      return false;
    }
  }

  /**
   * Stop recording audio for a microphone
   */
  async stopRecording(micId: string): Promise<boolean> {
    try {
      const audioStream = this.audioStreams.get(micId);
      if (!audioStream) {
        console.log(`No active stream found for mic ${micId}`);
        return true;
      }

      // Unsubscribe from audio data
      backendAudioService.unsubscribeFromAudio(audioStream.streamId);

      // Stop WDM audio stream on backend
      await backendAudioService.stopStream(audioStream.streamId);

      // Update stream status
      audioStream.isRecording = false;
      this.audioStreams.set(micId, audioStream);

      console.log(`⏹️ Stopped WDM recording for mic ${micId}`);
      return true;

    } catch (error) {
      console.error(`Error stopping WDM recording for mic ${micId}:`, error);
      return false;
    }
  }

  /**
   * Handle incoming audio data from WDM backend
   */
  private handleAudioData(micId: string, audioData: Int16Array): void {
    try {
      const audioStream = this.audioStreams.get(micId);
      if (!audioStream || !audioStream.isRecording) {
        return;
      }

      // Debug: Log audio levels every 100 chunks (about every 6 seconds at 16kHz)
      if (!audioStream.debugCounter) audioStream.debugCounter = 0;
      audioStream.debugCounter++;

      if (audioStream.debugCounter % 100 === 0) {
        const maxValue = Math.max(...audioData);
        const avgValue = audioData.reduce((sum, val) => sum + val, 0) / audioData.length;
        console.log(`📤 Mic ${micId} - WDM Audio: Max=${maxValue}, Avg=${avgValue.toFixed(2)}, Samples=${audioData.length}`);
        
        // Enhanced Dante debugging
        const device = this.availableDevices.find(d => d.id === audioStream.deviceId);
        if (device && device.name.toLowerCase().includes('dante')) {
          console.log(`🎵 Dante Frontend Debug - Device: ${device.name}`);
          console.log(`🎵 Audio Data Analysis: Min=${Math.min(...audioData)}, Max=${maxValue}, NonZero=${audioData.filter(x => x !== 0).length}/${audioData.length}`);
          console.log(`🎵 Sample Rate: ${device.defaultSampleRate}, Max Inputs: ${device.maxInputs}`);
        }
        
        // Check if we're receiving silence
        if (maxValue < 10) {
          console.warn(`⚠️ Mic ${micId} - Very low audio levels from WDM! Possible silence.`);
        }
      }

      // Send audio data to STT server via WebSocket manager
      // Convert Int16Array to Float32Array for WebSocketManager (normalize to -1.0 to 1.0)
      const float32Data = new Float32Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        float32Data[i] = audioData[i] / 32768.0; // Convert Int16 to Float32
      }
      const uint8Data = new Uint8Array(float32Data.buffer);
      const success = this.webSocketManager.sendAudioData(micId, uint8Data);
      if (!success) {
        console.warn(`⚠️ Failed to send WDM audio data to STT for mic ${micId}`);
      }

    } catch (error) {
      console.error(`Error handling WDM audio data for mic ${micId}:`, error);
    }
  }

  /**
   * Check if a microphone is currently recording
   */
  isRecording(micId: string): boolean {
    const audioStream = this.audioStreams.get(micId);
    return audioStream ? audioStream.isRecording : false;
  }

  /**
   * Get all active audio streams
   */
  getActiveStreams(): BackendAudioStream[] {
    return Array.from(this.audioStreams.values()).filter(stream => stream.isRecording);
  }

  /**
   * Get stream information for a specific microphone
   */
  getStreamInfo(micId: string): BackendAudioStream | null {
    return this.audioStreams.get(micId) || null;
  }

  /**
   * Check if WebSocket connection to backend is healthy
   */
  isBackendConnected(): boolean {
    return backendAudioService.isWebSocketConnected();
  }

  /**
   * Get backend connection status
   */
  async getBackendStatus(): Promise<{ healthy: boolean; activeStreams: number }> {
    try {
      const isHealthy = await backendAudioService.checkHealth();
      const streams = await backendAudioService.getStreamStatus();
      return {
        healthy: isHealthy,
        activeStreams: streams.length
      };
    } catch (error) {
      console.error('Error getting backend status:', error);
      return {
        healthy: false,
        activeStreams: 0
      };
    }
  }

  /**
   * Destroy the audio manager and clean up resources
   */
  destroy(): void {
    try {
      // Stop all active recordings
      for (const [micId, audioStream] of this.audioStreams) {
        if (audioStream.isRecording) {
          this.stopRecording(micId);
        }
      }

      // Clear all streams
      this.audioStreams.clear();

      // Disconnect from backend
      backendAudioService.disconnect();

      this.isInitialized = false;
      console.log('✅ Backend Audio Manager destroyed');
    } catch (error) {
      console.error('Error destroying Backend Audio Manager:', error);
    }
  }
}

