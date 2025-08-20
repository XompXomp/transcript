import { MicConfig, STTEndpoint } from './types';
// @ts-ignore
import msgpack from 'msgpack-lite';

interface ConnectionState {
  ws: WebSocket;
  isConnected: boolean;
  isAuthenticated: boolean;
  lastActivity: number;
  reconnectAttempts: number;
  audioQueue: Float32Array[];
  debugCounter?: number;
}

export class WebSocketManager {
  private connections: Map<string, ConnectionState> = new Map();
  private sttEndpoints: STTEndpoint[];
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000; // 1 second
  private maxQueueSize = 10; // Max audio chunks to queue per connection

  constructor(sttEndpoints: STTEndpoint[]) {
    this.sttEndpoints = sttEndpoints;
  }

  /**
   * Create a WebSocket connection directly to Unmute STT server
   */
  async createConnection(mic: MicConfig): Promise<boolean> {
    const endpoint = this.sttEndpoints.find(e => e.id === mic.sttEndpoint);
    if (!endpoint) {
      console.error(`STT endpoint not found for mic: ${mic.micId}`);
      return false;
    }

    // Connect to single efficient proxy server
    const sttUrl = 'ws://localhost:8030';

    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(sttUrl);
        
        const connectionState: ConnectionState = {
          ws,
          isConnected: false,
          isAuthenticated: false,
          lastActivity: Date.now(),
          reconnectAttempts: 0,
          audioQueue: []
        };

        this.connections.set(mic.micId, connectionState);

        ws.onopen = () => {
          console.log(`✅ WebSocket connected for mic ${mic.micId} via proxy`);
          connectionState.isConnected = true;
          connectionState.isAuthenticated = true; // Proxy handles authentication
          connectionState.lastActivity = Date.now();
          
          console.log(`🔐 Authenticated via proxy for mic ${mic.micId}`);
          
          // Send any queued audio data
          this.flushAudioQueue(mic.micId);
          resolve(true);
        };

        ws.onmessage = (event) => {
          connectionState.lastActivity = Date.now();
          this.handleMessage(mic.micId, event.data);
        };

        ws.onerror = (error) => {
          console.error(`❌ WebSocket error for mic ${mic.micId}:`, error);
          connectionState.isConnected = false;
        };

        ws.onclose = () => {
          console.log(`🔌 WebSocket closed for mic ${mic.micId}`);
          connectionState.isConnected = false;
          connectionState.isAuthenticated = false;
          
          // Attempt reconnection if not at max attempts
          if (connectionState.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnect(mic);
            }, this.reconnectDelay * (connectionState.reconnectAttempts + 1));
          }
        };

      } catch (error) {
        console.error(`Failed to create WebSocket for mic ${mic.micId}:`, error);
        resolve(false);
      }
    });
  }

  /**
   * Send authentication message
   * Note: Browser WebSockets don't support custom headers, so we send auth as first message
   */
  private sendAuthentication(micId: string, apiKey: string): void {
    const connection = this.connections.get(micId);
    if (!connection || !connection.isConnected) return;

    try {
      // Send authentication as first message (Unmute STT expects this)
      const authMessage = {
        type: "Auth",
        token: apiKey
      };
      
      connection.ws.send(JSON.stringify(authMessage));
      connection.isAuthenticated = true;
      console.log(`🔐 Authentication sent for mic ${micId}`);
      
      // Send any queued audio data
      this.flushAudioQueue(micId);
    } catch (error) {
      console.error(`Failed to send authentication for mic ${micId}:`, error);
    }
  }

  /**
   * Send audio data directly to Unmute STT server
   */
  sendAudioData(micId: string, audioData: Float32Array): boolean {
    const connection = this.connections.get(micId);
    if (!connection) {
      console.error(`No connection found for mic ${micId}`);
      return false;
    }

    if (!connection.isConnected || !connection.isAuthenticated) {
      // Queue the audio data if connection isn't ready
      if (connection.audioQueue.length < this.maxQueueSize) {
        connection.audioQueue.push(audioData);
      }
      return false;
    }

    try {
      // Debug: Check if we're sending actual audio data
      const maxValue = Math.max(...audioData.map(Math.abs));
      const avgValue = audioData.reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length;
      
      // Log audio levels every 10 sends (about every 0.8 seconds)
      if (!connection.debugCounter) connection.debugCounter = 0;
      connection.debugCounter++;
      
      if (connection.debugCounter % 10 === 0) {
        console.log(`📤 Mic ${micId} - Sending audio: Max=${maxValue.toFixed(4)}, Avg=${avgValue.toFixed(4)}, Samples=${audioData.length}`);
        
        // Check if we're sending silence
        if (maxValue < 0.001) {
          console.warn(`⚠️ Mic ${micId} - Very low audio levels being sent! Possible silence.`);
        }
      }
      
      // The STT server expects a MessagePack-encoded message with structure: { type: 'Audio', pcm: [...] }
      // Match the working implementation from format.txt
      const audioMessage = {
        type: 'Audio',
        pcm: Array.from(audioData) // Convert Float32Array to regular array
      };
      const encoded = msgpack.encode(audioMessage); // MessagePack encoding
      connection.ws.send(encoded); // Send encoded message
      connection.lastActivity = Date.now();
      
      return true;
    } catch (error) {
      console.error(`Failed to send audio data for mic ${micId}:`, error);
      return false;
    }
  }

  /**
   * Flush queued audio data for a connection
   */
  private flushAudioQueue(micId: string): void {
    const connection = this.connections.get(micId);
    if (!connection || !connection.isAuthenticated) return;

    while (connection.audioQueue.length > 0) {
      const audioData = connection.audioQueue.shift();
      if (audioData) {
        this.sendAudioData(micId, audioData);
      }
    }
  }

  /**
   * Handle incoming messages from Unmute STT server
   */
  private handleMessage(micId: string, data: any): void {
    try {
      console.log(`🔍 Raw message received for mic ${micId}:`, data, typeof data);
      
      // Parse the message data
      let parsedData;
      if (typeof data === 'string') {
        parsedData = JSON.parse(data);
        console.log(`📝 Parsed string message for mic ${micId}:`, parsedData);
      } else if (data instanceof Blob) {
        // Handle binary data - decode msgpack
        console.log(`📦 Binary data received for mic ${micId}, size: ${data.size}`);
        data.arrayBuffer().then(buffer => {
          const uint8Array = new Uint8Array(buffer);
          const decoded = msgpack.decode(uint8Array);
          console.log(`✅ Decoded msgpack message for mic ${micId}:`, decoded);
          
          // Emit event for the UI to handle
          const event = new CustomEvent('stt-message', {
            detail: { micId, data: decoded }
          });
          console.log(`📡 Dispatching STT event for mic ${micId}:`, event.detail);
          window.dispatchEvent(event);
        }).catch(error => {
          console.error(`❌ Failed to decode msgpack for mic ${micId}:`, error);
        });
        return;
      } else {
        parsedData = data;
        console.log(`📝 Direct data for mic ${micId}:`, parsedData);
      }
      
      // Emit event for the UI to handle
      const event = new CustomEvent('stt-message', {
        detail: { micId, data: parsedData }
      });
      console.log(`📡 Dispatching STT event for mic ${micId}:`, event.detail);
      window.dispatchEvent(event);
      
      // Additional debug: Check if the event was dispatched
      console.log(`🔍 Event dispatched for mic ${micId}, event detail:`, event.detail);
    } catch (error) {
      console.error(`❌ Error handling STT message for mic ${micId}:`, error);
    }
  }

  /**
   * Reconnect a failed connection
   */
  private async reconnect(mic: MicConfig): Promise<void> {
    const connection = this.connections.get(mic.micId);
    if (!connection) return;

    connection.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect mic ${mic.micId} (attempt ${connection.reconnectAttempts})`);
    
    const success = await this.createConnection(mic);
    if (success) {
      connection.reconnectAttempts = 0;
    }
  }

  /**
   * Close a specific connection
   */
  closeConnection(micId: string): void {
    const connection = this.connections.get(micId);
    if (connection) {
      connection.ws.close();
      this.connections.delete(micId);
      console.log(`🔌 Connection closed for mic ${micId}`);
    }
  }

  /**
   * Close all connections
   */
  closeAllConnections(): void {
    this.connections.forEach((connection, micId) => {
      connection.ws.close();
      console.log(`🔌 Connection closed for mic ${micId}`);
    });
    this.connections.clear();
  }

  /**
   * Get connection status for a microphone
   */
  getConnectionStatus(micId: string): { isConnected: boolean; isAuthenticated: boolean } | null {
    const connection = this.connections.get(micId);
    if (!connection) return null;
    
    return {
      isConnected: connection.isConnected,
      isAuthenticated: connection.isAuthenticated
    };
  }

  /**
   * Get all connection statuses
   */
  getAllConnectionStatuses(): Map<string, { isConnected: boolean; isAuthenticated: boolean }> {
    const statuses = new Map();
    this.connections.forEach((connection, micId) => {
      statuses.set(micId, {
        isConnected: connection.isConnected,
        isAuthenticated: connection.isAuthenticated
      });
    });
    return statuses;
  }

  /**
   * Get the number of active connections
   */
  getActiveConnectionCount(): number {
    return Array.from(this.connections.values()).filter(c => c.isConnected).length;
  }

  /**
   * Create multiple connections in parallel for better performance
   */
  async createMultipleConnections(mics: MicConfig[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    // Create connections in batches to avoid overwhelming the server
    const batchSize = 5;
    for (let i = 0; i < mics.length; i += batchSize) {
      const batch = mics.slice(i, i + batchSize);
      const batchPromises = batch.map(async (mic) => {
        const success = await this.createConnection(mic);
        results.set(mic.micId, success);
        return { micId: mic.micId, success };
      });
      
      await Promise.all(batchPromises);
      
      // Small delay between batches to be nice to the server
      if (i + batchSize < mics.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }
}
