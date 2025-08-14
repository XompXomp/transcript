class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.bufferSize = 1024;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const inputChannel = input[0];
    if (!inputChannel) return true;

    // Add input data to buffer
    this.buffer.push(inputChannel.slice());

    // Process when we have enough samples
    while (this.buffer.reduce((sum, chunk) => sum + chunk.length, 0) >= this.bufferSize) {
      const processedChunk = new Float32Array(this.bufferSize);
      let offset = 0;
      let chunkIndex = 0;

      // Fill the processed chunk
      while (offset < this.bufferSize && chunkIndex < this.buffer.length) {
        const chunk = this.buffer[chunkIndex];
        const remainingInChunk = chunk.length;
        const needed = this.bufferSize - offset;
        const toCopy = Math.min(remainingInChunk, needed);

        processedChunk.set(chunk.slice(0, toCopy), offset);
        offset += toCopy;

        if (toCopy === remainingInChunk) {
          chunkIndex++;
        } else {
          // Update the chunk with remaining data
          this.buffer[chunkIndex] = chunk.slice(toCopy);
        }
      }

      // Remove processed chunks
      this.buffer = this.buffer.slice(chunkIndex);

      // Send processed audio data
      this.port.postMessage({
        type: 'audioData',
        data: processedChunk
      });
    }

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
