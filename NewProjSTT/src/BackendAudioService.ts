export interface BackendAudioDevice {
  id: number;
  name: string;
  maxInputs: number;
  defaultSampleRate: number;
  hostAPIName: string;
}

export interface AudioStream {
  streamId: string;
  deviceId: number;
  startTime: number;
  isActive: boolean;
}

export class BackendAudioService {
  private baseUrl = 'http://localhost:3001';
  private wsUrl = 'ws://localhost:3002';
  private ws: WebSocket | null = null;
  private audioCallbacks: Map<string, (audioData: Int16Array) => void> = new Map();
  private isConnected = false;

  constructor() {
    // Don't auto-connect, wait for explicit initialization
  }

  async initialize(): Promise<boolean> {
    try {
      // Check backend health first
      const isHealthy = await this.checkHealth();
      if (!isHealthy) {
        console.error('❌ Backend health check failed');
        return false;
      }

      // Connect to WebSocket
      await this.connectWebSocket();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize BackendAudioService:', error);
      return false;
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);
        
        this.ws.onopen = () => {
          console.log('✅ Connected to WDM Audio Backend WebSocket');
          this.isConnected = true;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('🔌 Disconnected from WDM Audio Backend WebSocket');
          this.isConnected = false;
          // Attempt to reconnect after 5 seconds
          setTimeout(() => this.connectWebSocket(), 5000);
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.isConnected = false;
          reject(error);
        };

      } catch (error) {
        console.error('❌ Failed to connect to WebSocket:', error);
        this.isConnected = false;
        reject(error);
      }
    });
  }

  private handleWebSocketMessage(data: any) {
    if (data.type === 'audio') {
      const { streamId, data: audioDataBase64 } = data;
      const callback = this.audioCallbacks.get(streamId);
      
      if (callback) {
        try {
          // Convert base64 to Int16Array (not Uint8Array)
          const audioDataBytes = Uint8Array.from(atob(audioDataBase64), c => c.charCodeAt(0));
          const audioData = new Int16Array(audioDataBytes.buffer);
          callback(audioData);
        } catch (error) {
          console.error('❌ Error processing audio data:', error);
        }
      }
    } else if (data.type === 'subscribed') {
      console.log(`✅ Subscribed to audio stream: ${data.streamId}`);
    } else if (data.type === 'unsubscribed') {
      console.log(`📡 Unsubscribed from audio stream: ${data.streamId}`);
    } else if (data.type === 'error') {
      console.error('❌ Backend error:', data.message);
    }
  }

  async getDevices(): Promise<BackendAudioDevice[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/devices`);
      const result = await response.json();
      
      if (result.success) {
        console.log(`📋 Found ${result.devices.length} WDM audio devices`);
        return result.devices;
      } else {
        throw new Error(result.error || 'Failed to get devices');
      }
    } catch (error) {
      console.error('❌ Error fetching devices:', error);
      throw error;
    }
  }

  async startStream(deviceId: number, streamId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/streams/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId, streamId })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`🎤 Started WDM audio stream: ${streamId} from device ${deviceId}`);
        return true;
      } else {
        throw new Error(result.error || 'Failed to start stream');
      }
    } catch (error) {
      console.error('❌ Error starting stream:', error);
      throw error;
    }
  }

  async stopStream(streamId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/streams/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ streamId })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`⏹️ Stopped WDM audio stream: ${streamId}`);
        return true;
      } else {
        throw new Error(result.error || 'Failed to stop stream');
      }
    } catch (error) {
      console.error('❌ Error stopping stream:', error);
      throw error;
    }
  }

  async getStreamStatus(): Promise<AudioStream[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/streams/status`);
      const result = await response.json();
      
      if (result.success) {
        return result.streams;
      } else {
        throw new Error(result.error || 'Failed to get stream status');
      }
    } catch (error) {
      console.error('❌ Error getting stream status:', error);
      throw error;
    }
  }

  subscribeToAudio(streamId: string, callback: (audioData: Int16Array) => void) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    // Store the callback
    this.audioCallbacks.set(streamId, callback);

    // Send subscription message
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      streamId
    }));

    console.log(`📡 Subscribing to audio stream: ${streamId}`);
  }

  unsubscribeFromAudio(streamId: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Remove the callback
    this.audioCallbacks.delete(streamId);

    // Send unsubscription message
    this.ws.send(JSON.stringify({
      type: 'unsubscribe',
      streamId
    }));

    console.log(`📡 Unsubscribing from audio stream: ${streamId}`);
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const result = await response.json();
      return result.status === 'healthy';
    } catch (error) {
      console.error('❌ Backend health check failed:', error);
      return false;
    }
  }

  isWebSocketConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.audioCallbacks.clear();
    this.isConnected = false;
  }
}

// Export singleton instance
export const backendAudioService = new BackendAudioService();

