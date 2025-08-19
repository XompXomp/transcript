const WebSocket = require('ws');
const http = require('http');

// Create WebSocket server for direct STT connections
const wss = new WebSocket.Server({ port: 8030 });

console.log('🚀 Direct STT Proxy Server started on ws://localhost:8030');
console.log('📡 Connecting to STT Server: ws://172.22.225.146:11000/api/asr-streaming');
console.log('🔐 Using API Key: public_token');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

wss.on('connection', (ws) => {
  const clientId = Math.random().toString(36).substr(2, 9);
  console.log(`🔌 [Direct Proxy] Client ${clientId} connected to proxy`);
  
  // Connect to futureos STT server 
  const sttWs = new WebSocket('ws://172.22.225.146:11000/api/asr-streaming', {
    headers: {
      'kyutai-api-key': 'public_token'
    }
  });

  // Connect to ankur STT server 
  //
  /*
  const sttWs = new WebSocket('ws://192.168.1.48:11000/api/asr-streaming', {
    headers: {
      'kyutai-api-key': 'public_token'
    }
  });*/
  
  sttWs.on('open', () => {
    console.log(`✅ [Direct Proxy] Client ${clientId} connected to STT Server`);
    console.log(`📊 [Direct Proxy] Total clients connected: ${wss.clients.size}`);
  });
  
  sttWs.on('message', (data) => {
    // Forward STT responses to client
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
  
  sttWs.on('error', (error) => {
    console.error(`❌ [Direct Proxy] Client ${clientId} STT server error:`, error);
    ws.close();
  });
  
  sttWs.on('close', () => {
    console.log(`🔌 [Direct Proxy] Client ${clientId} STT server connection closed`);
    ws.close();
  });
  
  // Forward client messages to STT server
  ws.on('message', (data) => {
    if (sttWs.readyState === WebSocket.OPEN) {
      sttWs.send(data);
    }
  });
  
  ws.on('close', () => {
    console.log(`🔌 [Direct Proxy] Client ${clientId} disconnected`);
    sttWs.close();
  });
  
  ws.on('error', (error) => {
    console.error(`❌ [Direct Proxy] Client ${clientId} error:`, error);
    sttWs.close();
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Direct STT Proxy Server...');
  wss.close(() => {
    console.log('✅ Direct STT Proxy Server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Direct STT Proxy Server...');
  wss.close(() => {
    console.log('✅ Direct STT Proxy Server stopped');
    process.exit(0);
  });
});
