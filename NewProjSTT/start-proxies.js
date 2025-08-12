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

// Start eleventh proxy server
const proxy11 = spawn('node', ['stt-proxy-11.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start twelfth proxy server
const proxy12 = spawn('node', ['stt-proxy-12.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start thirteenth proxy server
const proxy13 = spawn('node', ['stt-proxy-13.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start fourteenth proxy server
const proxy14 = spawn('node', ['stt-proxy-14.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start fifteenth proxy server
const proxy15 = spawn('node', ['stt-proxy-15.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start sixteenth proxy server
const proxy16 = spawn('node', ['stt-proxy-16.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start seventeenth proxy server
const proxy17 = spawn('node', ['stt-proxy-17.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start eighteenth proxy server
const proxy18 = spawn('node', ['stt-proxy-18.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start nineteenth proxy server
const proxy19 = spawn('node', ['stt-proxy-19.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start twentieth proxy server
const proxy20 = spawn('node', ['stt-proxy-20.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start twenty-first proxy server
const proxy21 = spawn('node', ['stt-proxy-21.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start twenty-second proxy server
const proxy22 = spawn('node', ['stt-proxy-22.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start twenty-third proxy server
const proxy23 = spawn('node', ['stt-proxy-23.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start twenty-fourth proxy server
const proxy24 = spawn('node', ['stt-proxy-24.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start twenty-fifth proxy server
const proxy25 = spawn('node', ['stt-proxy-25.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start twenty-sixth proxy server
const proxy26 = spawn('node', ['stt-proxy-26.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start twenty-seventh proxy server
const proxy27 = spawn('node', ['stt-proxy-27.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start twenty-eighth proxy server
const proxy28 = spawn('node', ['stt-proxy-28.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start twenty-ninth proxy server
const proxy29 = spawn('node', ['stt-proxy-29.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Start thirtieth proxy server
const proxy30 = spawn('node', ['stt-proxy-30.js'], {
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
  proxy11.kill('SIGINT');
  proxy12.kill('SIGINT');
  proxy13.kill('SIGINT');
  proxy14.kill('SIGINT');
  proxy15.kill('SIGINT');
  proxy16.kill('SIGINT');
  proxy17.kill('SIGINT');
  proxy18.kill('SIGINT');
  proxy19.kill('SIGINT');
  proxy20.kill('SIGINT');
  proxy21.kill('SIGINT');
  proxy22.kill('SIGINT');
  proxy23.kill('SIGINT');
  proxy24.kill('SIGINT');
  proxy25.kill('SIGINT');
  proxy26.kill('SIGINT');
  proxy27.kill('SIGINT');
  proxy28.kill('SIGINT');
  proxy29.kill('SIGINT');
  proxy30.kill('SIGINT');
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
  proxy11.kill('SIGTERM');
  proxy12.kill('SIGTERM');
  proxy13.kill('SIGTERM');
  proxy14.kill('SIGTERM');
  proxy15.kill('SIGTERM');
  proxy16.kill('SIGTERM');
  proxy17.kill('SIGTERM');
  proxy18.kill('SIGTERM');
  proxy19.kill('SIGTERM');
  proxy20.kill('SIGTERM');
  proxy21.kill('SIGTERM');
  proxy22.kill('SIGTERM');
  proxy23.kill('SIGTERM');
  proxy24.kill('SIGTERM');
  proxy25.kill('SIGTERM');
  proxy26.kill('SIGTERM');
  proxy27.kill('SIGTERM');
  proxy28.kill('SIGTERM');
  proxy29.kill('SIGTERM');
  proxy30.kill('SIGTERM');
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

proxy11.on('close', (code) => {
  console.log(`Proxy 11 exited with code ${code}`);
});

proxy12.on('close', (code) => {
  console.log(`Proxy 12 exited with code ${code}`);
});

proxy13.on('close', (code) => {
  console.log(`Proxy 13 exited with code ${code}`);
});

proxy14.on('close', (code) => {
  console.log(`Proxy 14 exited with code ${code}`);
});

proxy15.on('close', (code) => {
  console.log(`Proxy 15 exited with code ${code}`);
});

proxy16.on('close', (code) => {
  console.log(`Proxy 16 exited with code ${code}`);
});

proxy17.on('close', (code) => {
  console.log(`Proxy 17 exited with code ${code}`);
});

proxy18.on('close', (code) => {
  console.log(`Proxy 18 exited with code ${code}`);
});

proxy19.on('close', (code) => {
  console.log(`Proxy 19 exited with code ${code}`);
});

proxy20.on('close', (code) => {
  console.log(`Proxy 20 exited with code ${code}`);
});

proxy21.on('close', (code) => {
  console.log(`Proxy 21 exited with code ${code}`);
});

proxy22.on('close', (code) => {
  console.log(`Proxy 22 exited with code ${code}`);
});

proxy23.on('close', (code) => {
  console.log(`Proxy 23 exited with code ${code}`);
});

proxy24.on('close', (code) => {
  console.log(`Proxy 24 exited with code ${code}`);
});

proxy25.on('close', (code) => {
  console.log(`Proxy 25 exited with code ${code}`);
});

proxy26.on('close', (code) => {
  console.log(`Proxy 26 exited with code ${code}`);
});

proxy27.on('close', (code) => {
  console.log(`Proxy 27 exited with code ${code}`);
});

proxy28.on('close', (code) => {
  console.log(`Proxy 28 exited with code ${code}`);
});

proxy29.on('close', (code) => {
  console.log(`Proxy 29 exited with code ${code}`);
});

proxy30.on('close', (code) => {
  console.log(`Proxy 30 exited with code ${code}`);
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
console.log('Proxy 11 will run on ws://localhost:8040');
console.log('Proxy 12 will run on ws://localhost:8041');
console.log('Proxy 13 will run on ws://localhost:8042');
console.log('Proxy 14 will run on ws://localhost:8043');
console.log('Proxy 15 will run on ws://localhost:8044');
console.log('Proxy 16 will run on ws://localhost:8045');
console.log('Proxy 17 will run on ws://localhost:8046');
console.log('Proxy 18 will run on ws://localhost:8047');
console.log('Proxy 19 will run on ws://localhost:8048');
console.log('Proxy 20 will run on ws://localhost:8049');
console.log('Proxy 21 will run on ws://localhost:8050');
console.log('Proxy 22 will run on ws://localhost:8051');
console.log('Proxy 23 will run on ws://localhost:8052');
console.log('Proxy 24 will run on ws://localhost:8053');
console.log('Proxy 25 will run on ws://localhost:8054');
console.log('Proxy 26 will run on ws://localhost:8055');
console.log('Proxy 27 will run on ws://localhost:8056');
console.log('Proxy 28 will run on ws://localhost:8057');
console.log('Proxy 29 will run on ws://localhost:8058');
console.log('Proxy 30 will run on ws://localhost:8059');
console.log('Press Ctrl+C to stop all servers'); 