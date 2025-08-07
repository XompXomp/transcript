const WebSocket = require('ws');
const http = require('http');

// Create WebSocket server for second endpoint
const wss = new WebSocket.Server({ port: 8031 });

console.log('🚀 STT Proxy Server 2 started on ws://localhost:8031');
console.log('📡 Connecting to STT Server: Ankur Laptop');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

wss.on('connection', (ws) => {
  const clientId = Math.random().toString(36).substr(2, 9);
  console.log(`🔌 [Proxy 2] Client ${clientId} connected to proxy`);
  
  // Connect to second STT server with authentication headers
  const sttWs = new WebSocket('ws://172.22.225.47:11000/api/asr-streaming', {
    headers: {
      'kyutai-api-key': 'public_token'
    }
  });
  
  sttWs.on('open', () => {
    console.log(`✅ [Proxy 2] Client ${clientId} connected to STT Server 2 (Ankur laptop)`);
    console.log(`📊 [Proxy 2] Total clients connected: ${wss.clients.size}`);
  });
  
  sttWs.on('message', (data) => {
    // Forward STT responses to client
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
  
  sttWs.on('error', (error) => {
    console.error(`❌ [Proxy 2] Client ${clientId} STT server error:`, error);
    ws.close();
  });
  
  sttWs.on('close', () => {
    console.log(`🔌 [Proxy 2] Client ${clientId} STT server connection closed`);
    ws.close();
  });
  
  // Forward client messages to STT server
  ws.on('message', (data) => {
    if (sttWs.readyState === WebSocket.OPEN) {
      sttWs.send(data);
    }
  });
  
  ws.on('close', () => {
    console.log(`🔌 [Proxy 2] Client ${clientId} disconnected`);
    sttWs.close();
  });
  
  ws.on('error', (error) => {
    console.error(`❌ [Proxy 2] Client ${clientId} error:`, error);
    sttWs.close();
  });
}); 