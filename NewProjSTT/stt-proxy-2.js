const WebSocket = require('ws');
const http = require('http');

// Create WebSocket server for second endpoint
const wss = new WebSocket.Server({ port: 8031 });

console.log('STT Proxy Server 2 running on ws://localhost:8031');

wss.on('connection', (ws) => {
  console.log('Client connected to proxy 2');
  
  // Connect to second STT server with authentication headers
  const sttWs = new WebSocket('ws://172.22.225.139:11004/api/asr-streaming', {
    headers: {
      'kyutai-api-key': 'public_token'
    }
  });
  
  sttWs.on('open', () => {
    console.log('Connected to STT server 2');
    console.log('Number of clients connected to proxy 2:', wss.clients.size);
  });
  
  sttWs.on('message', (data) => {
    // Forward STT responses to client
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
  
  sttWs.on('error', (error) => {
    console.error('STT server 2 error:', error);
    ws.close();
  });
  
  sttWs.on('close', () => {
    console.log('STT server 2 connection closed');
    ws.close();
  });
  
  // Forward client messages to STT server
  ws.on('message', (data) => {
    if (sttWs.readyState === WebSocket.OPEN) {
      sttWs.send(data);
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected from proxy 2');
    sttWs.close();
  });
  
  ws.on('error', (error) => {
    console.error('Client error on proxy 2:', error);
    sttWs.close();
  });
}); 