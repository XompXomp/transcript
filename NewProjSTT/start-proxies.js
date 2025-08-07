const { spawn } = require('child_process');
const path = require('path');

console.log('Starting STT Proxy Servers...');

// Start first proxy server
const proxy1 = spawn('node', ['stt-proxy.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start second proxy server
const proxy2 = spawn('node', ['stt-proxy-2.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down proxy servers...');
  proxy1.kill('SIGINT');
  proxy2.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down proxy servers...');
  proxy1.kill('SIGTERM');
  proxy2.kill('SIGTERM');
  process.exit(0);
});

// Handle proxy server exits
proxy1.on('close', (code) => {
  console.log(`Proxy 1 exited with code ${code}`);
});

proxy2.on('close', (code) => {
  console.log(`Proxy 2 exited with code ${code}`);
});

console.log('Both proxy servers are starting...');
console.log('Proxy 1 will run on ws://localhost:8030');
console.log('Proxy 2 will run on ws://localhost:8031');
console.log('Press Ctrl+C to stop all servers'); 