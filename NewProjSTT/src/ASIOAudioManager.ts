import { WebSocketManager } from './WebSocketManager';

export interface ASIOChannel {
  id: number;
  name: string;
}

export interface ASIOAudioStream {
  channelId: number;
  audioData: Float32Array;
  sampleRate: number;
}

export class ASIOAudioManager {
  private websocket: WebSocket | null = null;
  private webSocketManager: WebSocketManager;
  private isConnected = false;
  private audioContext: AudioContext | null = null;
  private activeRecordings = new Map<number, boolean>();
  private channelNames: string[] = [];

  constructor(webSocketManager: WebSocketManager) {
    this.webSocketManager = webSocketManager;
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.websocket = new WebSocket('ws://localhost:8080');
        
        this.websocket.onopen = () => {
          console.log('Connected to ASIO Bridge');
          this.isConnected = true;
          resolve(true);
        };

        this.websocket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.websocket.onerror = (error) => {
          console.error('ASIO Bridge WebSocket error:', error);
          this.isConnected = false;
          resolve(false);
        };

        this.websocket.onclose = () => {
          console.log('Disconnected from ASIO Bridge');
          this.isConnected = false;
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            console.error('Failed to connect to ASIO Bridge');
            resolve(false);
          }
        }, 5000);

      } catch (error) {
        console.error('Failed to connect to ASIO Bridge:', error);
        resolve(false);
      }
    });
  }

  private handleMessage(data: any) {
    if (typeof data === 'string') {
      // Handle text messages (like channel list)
      if (data.startsWith('CHANNELS:')) {
        const channelsStr = data.substring(9);
        this.channelNames = channelsStr.split(',').filter(name => name.trim() !== '');
        console.log('Received ASIO channels:', this.channelNames);
      }
    } else if (data instanceof ArrayBuffer) {
      // Handle binary audio data
      this.handleAudioData(data);
    }
  }

  private handleAudioData(buffer: ArrayBuffer) {
    // Convert ArrayBuffer to string to parse the simple format
    const decoder = new TextDecoder();
    const dataView = new DataView(buffer);
    
    // Read the first few bytes to check if it's our simple format
    const headerBytes = new Uint8Array(buffer.slice(0, 20));
    const headerStr = decoder.decode(headerBytes);
    
    if (headerStr.startsWith('CHANNEL:')) {
      // Parse simple format: CHANNEL:X|audio_data
      const pipeIndex = headerStr.indexOf('|');
      if (pipeIndex !== -1) {
        const channelIdStr = headerStr.substring(8, pipeIndex);
        const channelId = parseInt(channelIdStr);
        
        // Extract audio data (everything after the pipe)
        const audioDataStart = pipeIndex + 1;
        const audioDataBuffer = buffer.slice(audioDataStart);
        
        // Convert to Float32Array
        const floatArray = new Float32Array(audioDataBuffer.buffer, audioDataBuffer.byteOffset, audioDataBuffer.byteLength / 4);
        
        // Only process if this channel is being recorded
        if (this.activeRecordings.get(channelId)) {
          // Convert to Uint8Array for WebSocketManager
          const uint8Array = new Uint8Array(floatArray.buffer, floatArray.byteOffset, floatArray.byteLength * 4);
          
          // Send to STT server via WebSocketManager
          this.webSocketManager.sendAudioData(uint8Array, channelId.toString());
        }
      }
    }
  }

  async getChannels(): Promise<ASIOChannel[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to ASIO Bridge');
    }

    // The simplified bridge streams all channels continuously
    // We'll create channel objects based on what we receive
    const channels: ASIOChannel[] = [];
    
    // If we have channel names from previous messages, use them
    if (this.channelNames.length > 0) {
      for (let i = 0; i < this.channelNames.length; i++) {
        channels.push({
          id: i,
          name: this.channelNames[i]
        });
      }
    } else {
      // Fallback: create generic channel names
      // The bridge will start streaming and we'll get channel names in messages
      for (let i = 0; i < 64; i++) { // Assume up to 64 channels
        channels.push({
          id: i,
          name: `ASIO Channel ${i + 1}`
        });
      }
    }

    return channels;
  }

  async startRecording(channel: ASIOChannel): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to ASIO Bridge');
    }

    console.log(`Starting recording for ASIO channel ${channel.id}: ${channel.name}`);
    this.activeRecordings.set(channel.id, true);
  }

  async stopRecording(channel: ASIOChannel): Promise<void> {
    console.log(`Stopping recording for ASIO channel ${channel.id}: ${channel.name}`);
    this.activeRecordings.set(channel.id, false);
  }

  async stopAllRecordings(): Promise<void> {
    console.log('Stopping all ASIO recordings');
    this.activeRecordings.clear();
  }

  isRecording(channelId: number): boolean {
    return this.activeRecordings.get(channelId) || false;
  }

  destroy(): void {
    this.stopAllRecordings();
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.isConnected = false;
  }
}
