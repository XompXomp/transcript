const WebSocket = require('ws');
const http = require('http');

// Create WebSocket server for twelfth endpoint
const wss = new WebSocket.Server({ port: 8041 });

console.log('🚀 STT Proxy Server 12 started on ws://localhost:8041');
console.log('📡 Connecting to STT Server: ws://172.22.225.146:11000/api/asr-streaming');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

wss.on('connection', (ws) => {
  const clientId = Math.random().toString(36).substr(2, 9);
  console.log(`🔌 [Proxy 12] Client ${clientId} connected to proxy`);
  
  const sttWs = new WebSocket('ws://172.22.225.146:11000/api/asr-streaming', {
    headers: {
      'kyutai-api-key': 'public_token'
    }
  });
  
  sttWs.on('open', () => {
    console.log(`✅ [Proxy 12] Client ${clientId} connected to STT Server 12`);
    console.log(`📊 [Proxy 12] Total clients connected: ${wss.clients.size}`);
  });
  
  sttWs.on('message', (data) => {
    // Forward STT responses to client
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
  
  sttWs.on('error', (error) => {
    console.error(`❌ [Proxy 12] Client ${clientId} STT server error:`, error);
    ws.close();
  });
  
  sttWs.on('close', () => {
    console.log(`🔌 [Proxy 12] Client ${clientId} STT server connection closed`);
    ws.close();
  });
  
  // Forward client messages to STT server
  ws.on('message', (data) => {
    if (sttWs.readyState === WebSocket.OPEN) {
      sttWs.send(data);
    }
  });
  
  ws.on('close', () => {
    console.log(`🔌 [Proxy 12] Client ${clientId} disconnected`);
    sttWs.close();
  });
  
  ws.on('error', (error) => {
    console.error(`❌ [Proxy 12] Client ${clientId} error:`, error);
    sttWs.close();
  });
});
