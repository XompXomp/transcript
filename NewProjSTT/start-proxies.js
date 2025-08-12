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

// Start sixth proxy server
const proxy6 = spawn('node', ['stt-proxy-6.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start seventh proxy server
const proxy7 = spawn('node', ['stt-proxy-7.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start eighth proxy server
const proxy8 = spawn('node', ['stt-proxy-8.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start ninth proxy server
const proxy9 = spawn('node', ['stt-proxy-9.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start tenth proxy server
const proxy10 = spawn('node', ['stt-proxy-10.js'], {
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
  proxy6.kill('SIGINT');
  proxy7.kill('SIGINT');
  proxy8.kill('SIGINT');
  proxy9.kill('SIGINT');
  proxy10.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down proxy servers...');
  proxy1.kill('SIGTERM');
  proxy2.kill('SIGTERM');
  proxy3.kill('SIGTERM');
  proxy4.kill('SIGTERM');
  proxy5.kill('SIGTERM');
  proxy6.kill('SIGTERM');
  proxy7.kill('SIGTERM');
  proxy8.kill('SIGTERM');
  proxy9.kill('SIGTERM');
  proxy10.kill('SIGTERM');
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

proxy6.on('close', (code) => {
  console.log(`Proxy 6 exited with code ${code}`);
});

proxy7.on('close', (code) => {
  console.log(`Proxy 7 exited with code ${code}`);
});

proxy8.on('close', (code) => {
  console.log(`Proxy 8 exited with code ${code}`);
});

proxy9.on('close', (code) => {
  console.log(`Proxy 9 exited with code ${code}`);
});

proxy10.on('close', (code) => {
  console.log(`Proxy 10 exited with code ${code}`);
});

console.log('All proxy servers are starting...');
console.log('Proxy 1 will run on ws://localhost:8030');
console.log('Proxy 2 will run on ws://localhost:8031');
console.log('Proxy 3 will run on ws://localhost:8032');
console.log('Proxy 4 will run on ws://localhost:8033');
console.log('Proxy 5 will run on ws://localhost:8034');
console.log('Proxy 6 will run on ws://localhost:8035');
console.log('Proxy 7 will run on ws://localhost:8036');
console.log('Proxy 8 will run on ws://localhost:8037');
console.log('Proxy 9 will run on ws://localhost:8038');
console.log('Proxy 10 will run on ws://localhost:8039');
console.log('Press Ctrl+C to stop all servers'); 