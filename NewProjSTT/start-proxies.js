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

// Start third proxy server
const proxy3 = spawn('node', ['stt-proxy-3.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start fourth proxy server
const proxy4 = spawn('node', ['stt-proxy-4.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start fifth proxy server
const proxy5 = spawn('node', ['stt-proxy-5.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down proxy servers...');
  proxy1.kill('SIGINT');
  proxy2.kill('SIGINT');
  proxy3.kill('SIGINT');
  proxy4.kill('SIGINT');
  proxy5.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down proxy servers...');
  proxy1.kill('SIGTERM');
  proxy2.kill('SIGTERM');
  proxy3.kill('SIGTERM');
  proxy4.kill('SIGTERM');
  proxy5.kill('SIGTERM');
  process.exit(0);
});

// Handle proxy server exits
proxy1.on('close', (code) => {
  console.log(`Proxy 1 exited with code ${code}`);
});

proxy2.on('close', (code) => {
  console.log(`Proxy 2 exited with code ${code}`);
});

proxy3.on('close', (code) => {
  console.log(`Proxy 3 exited with code ${code}`);
});

proxy4.on('close', (code) => {
  console.log(`Proxy 4 exited with code ${code}`);
});

proxy5.on('close', (code) => {
  console.log(`Proxy 5 exited with code ${code}`);
});

console.log('All proxy servers are starting...');
console.log('Proxy 1 will run on ws://localhost:8030');
console.log('Proxy 2 will run on ws://localhost:8031');
console.log('Proxy 3 will run on ws://localhost:8032');
console.log('Proxy 4 will run on ws://localhost:8033');
console.log('Proxy 5 will run on ws://localhost:8034');
console.log('Press Ctrl+C to stop all servers'); 