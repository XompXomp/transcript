// Web Worker for audio processing
// This runs in a separate thread to avoid blocking the main UI

interface AudioProcessingMessage {
  type: 'processAudio';
  micId: string;
  audioData: Uint8Array;
  sampleRate: number;
}

interface AudioProcessingResult {
  micId: string;
  audioData: Uint8Array;
  error?: string;
}

// Audio processing buffer for each microphone
const audioBuffers = new Map<string, Int16Array>();

// Process audio data from main thread
self.onmessage = (event: MessageEvent<AudioProcessingMessage>) => {
  const { type, micId, audioData, sampleRate } = event.data;
  
  if (type === 'processAudio') {
    try {
      const processedData = processAudioData(micId, audioData, sampleRate);
      
      const result: AudioProcessingResult = {
        micId,
        audioData: processedData
      };
      
      self.postMessage(result);
    } catch (error) {
      const result: AudioProcessingResult = {
        micId,
        audioData: new Uint8Array(0),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      self.postMessage(result);
    }
  }
};

/**
 * Process audio data for a specific microphone
 */
function processAudioData(micId: string, audioData: Uint8Array, sampleRate: number): Uint8Array {
  // Convert Uint8Array back to Int16Array
  const int16Data = new Int16Array(audioData.buffer, audioData.byteOffset, audioData.length / 2);
  
  // Get or create buffer for this microphone
  let buffer = audioBuffers.get(micId);
  if (!buffer) {
    buffer = new Int16Array(0);
    audioBuffers.set(micId, buffer);
  }
  
  // Combine with existing buffer
  const combinedBuffer = new Int16Array(buffer.length + int16Data.length);
  combinedBuffer.set(buffer);
  combinedBuffer.set(int16Data, buffer.length);
  
  // Update buffer (keep last 1 second of audio to prevent memory overflow)
  const maxSamples = sampleRate; // 1 second
  if (combinedBuffer.length > maxSamples) {
    const trimmedBuffer = new Int16Array(maxSamples);
    trimmedBuffer.set(combinedBuffer.slice(-maxSamples));
    audioBuffers.set(micId, trimmedBuffer);
  } else {
    audioBuffers.set(micId, combinedBuffer);
  }
  
  // Apply audio processing optimizations
  const processedData = applyAudioOptimizations(int16Data, sampleRate);
  
  return new Uint8Array(processedData.buffer);
}

/**
 * Apply minimal audio processing for real-time STT
 * For real-time transcription, we want to send raw audio to the STT server
 * and let it handle noise filtering and processing
 */
function applyAudioOptimizations(audioData: Int16Array, sampleRate: number): Int16Array {
  // For real-time STT, return the audio data as-is
  // The STT server is designed to handle raw audio and apply its own processing
  return audioData;
}

/**
 * Clean up resources when worker is terminated
 */
self.onclose = () => {
  audioBuffers.clear();
};
