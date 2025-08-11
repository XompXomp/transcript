const WebSocket = require('ws');
const http = require('http');

// Create WebSocket server for thirteenth endpoint
const wss = new WebSocket.Server({ port: 8042 });

console.log('🚀 STT Proxy Server 13 started on ws://localhost:8042');
console.log('📡 Connecting to STT Server: [To be configured]');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

wss.on('connection', (ws) => {
  const clientId = Math.random().toString(36).substr(2, 9);
  console.log(`🔌 [Proxy 13] Client ${clientId} connected to proxy`);
  
  // Connect to thirteenth STT server with authentication headers
  const sttWs = new WebSocket('ws://172.22.225.146:11001/api/asr-streaming', {
    headers: {
      'kyutai-api-key': 'public_token'
    }
  });
  
  sttWs.on('open', () => {
    console.log(`✅ [Proxy 13] Client ${clientId} connected to STT Server 13`);
    console.log(`📊 [Proxy 13] Total clients connected: ${wss.clients.size}`);
  });
  
  sttWs.on('message', (data) => {
    // Forward STT responses to client
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
  
  sttWs.on('error', (error) => {
    console.error(`❌ [Proxy 13] Client ${clientId} STT server error:`, error);
    ws.close();
  });
  
  sttWs.on('close', () => {
    console.log(`🔌 [Proxy 13] Client ${clientId} STT server connection closed`);
    ws.close();
  });
  
  // Forward client messages to STT server
  ws.on('message', (data) => {
    if (sttWs.readyState === WebSocket.OPEN) {
      sttWs.send(data);
    }
  });
  
  ws.on('close', () => {
    console.log(`🔌 [Proxy 13] Client ${clientId} disconnected`);
    sttWs.close();
  });
  
  ws.on('error', (error) => {
    console.error(`❌ [Proxy 13] Client ${clientId} error:`, error);
    sttWs.close();
  });
});
