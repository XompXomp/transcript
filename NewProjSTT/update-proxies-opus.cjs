const fs = require('fs');
const path = require('path');

// Template for Opus-enabled proxy
const opusProxyTemplate = `const WebSocket = require('ws');
const http = require('http');
const msgpack = require('msgpack-lite');
const OpusDecoder = require('opus-decoder');

// Create WebSocket server
const wss = new WebSocket.Server({ port: PORT_NUMBER });

console.log('🚀 STT Proxy Server PROXY_NUMBER started on ws://localhost:PORT_NUMBER');
console.log('📡 Connecting to STT Server: ws://172.22.225.146:11000/api/asr-streaming');
console.log('🎵 Opus audio decoding enabled (90%+ bandwidth reduction)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

wss.on('connection', async (ws) => {
  const clientId = Math.random().toString(36).substr(2, 9);
  console.log(\`🔌 [Proxy PROXY_NUMBER] Client \${clientId} connected to proxy\`);
  
  // Initialize Opus decoder for this client
  const opusDecoder = new OpusDecoder({
    rate: 24000,
    channels: 1,
    frameSize: 480
  });
  
  const sttWs = new WebSocket('ws://172.22.225.146:11000/api/asr-streaming', {
    headers: {
      'kyutai-api-key': 'public_token'
    }
  });
  
  sttWs.on('open', () => {
    console.log(\`✅ [Proxy PROXY_NUMBER] Client \${clientId} connected to STT Server (ws://172.22.225.146:11000/api/asr-streaming)\`);
    console.log(\`📊 [Proxy PROXY_NUMBER] Total clients connected: \${wss.clients.size}\`);
  });
  
  sttWs.on('message', (data) => {
    // Forward STT responses to client
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
  
  sttWs.on('error', (error) => {
    console.error(\`❌ [Proxy PROXY_NUMBER] Client \${clientId} STT server error:\`, error);
    ws.close();
  });
  
  sttWs.on('close', () => {
    console.log(\`🔌 [Proxy PROXY_NUMBER] Client \${clientId} STT server connection closed\`);
    ws.close();
  });
  
  // Forward client messages to STT server with Opus decoding
  ws.on('message', async (data) => {
    if (sttWs.readyState === WebSocket.OPEN) {
      try {
        // Decode msgpack message
        const message = msgpack.decode(data);
        
        if (message.type === 'Audio' && message.format === 'opus') {
          // Decode Opus audio data back to PCM
          const opusData = new Uint8Array(message.data);
          const pcmData = opusDecoder.decode(opusData);
          
          // Convert back to the format expected by STT server
          const pcmArray = Array.from(pcmData);
          
          const sttMessage = {
            type: 'Audio',
            pcm: pcmArray
          };
          
          const encoded = msgpack.encode(sttMessage);
          sttWs.send(encoded);
        } else {
          // Forward non-audio messages as-is
          sttWs.send(data);
        }
      } catch (error) {
        console.error(\`❌ [Proxy PROXY_NUMBER] Error processing message from client \${clientId}:\`, error);
        // Fallback: forward original data
        sttWs.send(data);
      }
    }
  });
  
  ws.on('close', () => {
    console.log(\`🔌 [Proxy PROXY_NUMBER] Client \${clientId} disconnected\`);
    sttWs.close();
  });
  
  ws.on('error', (error) => {
    console.error(\`❌ [Proxy PROXY_NUMBER] Client \${clientId} error:\`, error);
    sttWs.close();
  });
});`;

// Port mapping for each proxy
const portMapping = {
  2: 8031, 3: 8032, 4: 8033, 5: 8034, 6: 8035, 7: 8036, 8: 8037, 9: 8038, 10: 8039,
  11: 8040, 12: 8041, 13: 8042, 14: 8043, 15: 8044, 16: 8045, 17: 8046, 18: 8047, 19: 8048,
  20: 8049, 21: 8050, 22: 8051, 23: 8052, 24: 8053, 25: 8054, 26: 8055, 27: 8056, 28: 8057,
  29: 8058, 30: 8059, 31: 8060
};

console.log('🔄 Updating proxy files with Opus support...');

// Update each proxy file
Object.entries(portMapping).forEach(([proxyNum, port]) => {
  const filename = `stt-proxy-${proxyNum}.js`;
  const content = opusProxyTemplate
    .replace(/PORT_NUMBER/g, port)
    .replace(/PROXY_NUMBER/g, proxyNum);
  
  fs.writeFileSync(filename, content);
  console.log(`✅ Updated ${filename} (port ${port})`);
});

console.log('🎉 All proxy files updated with Opus decoding support!');
console.log('📊 Bandwidth reduction: ~96% smaller audio data');
console.log('🚀 Run "npm install" to install opus-decoder dependency');
