/**
 * z-DementedMonkey-LiM-CDU hub. Modified from dementedmonkey/cj4-mcdu (GPL-3), 2026-10-10.
 *
 *   HTTP     httpPort   (browser page, default 8126)
 *   WS       simPort    (sim + browser, default 8088)
 *   WS       relayPort  (hardware / SPAD client, default 8089; 0 = off)
 *
 * Every message received on either socket is sent to every client on both
 * sockets, so a hardware CDU and the browser see the same screen and keys.
 *
 * Ports: cdu-server.cfg, then environment (LIM_HTTP_PORT / LIM_WS_PORT /
 * LIM_RELAY_PORT), then --http-port= --sim-port= --relay-port=.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { WebSocketServer, OPEN } = require('ws');

const publicDir = path.join(__dirname, 'public');
const cfgPath = path.join(__dirname, 'cdu-server.cfg');

function readCfg(file) {
  const cfg = { httpPort: 8126, simPort: 8088, relayPort: 8089 };
  if (!fs.existsSync(file)) {
    return cfg;
  }
  const text = fs.readFileSync(file, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (key === 'httpPort') cfg.httpPort = Number(value);
    if (key === 'simPort' || key === 'websocketPort') cfg.simPort = Number(value);
    if (key === 'relayPort') cfg.relayPort = Number(value);
  }
  return cfg;
}

function portOr(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 65535) return fallback;
  return n;
}

const cfg = readCfg(cfgPath);
let httpPort = portOr(process.env.LIM_HTTP_PORT, cfg.httpPort);
let simPort = portOr(process.env.LIM_WS_PORT, cfg.simPort);
let relayPort = portOr(process.env.LIM_RELAY_PORT, cfg.relayPort);

for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--http-port=')) httpPort = portOr(arg.split('=')[1], httpPort);
  else if (arg.startsWith('--sim-port=') || arg.startsWith('--websocket-port=')) simPort = portOr(arg.split('=')[1], simPort);
  else if (arg.startsWith('--relay-port=')) relayPort = portOr(arg.split('=')[1], relayPort);
  else if (arg === '--help' || arg === '-h') {
    console.log('node index.js [--http-port=N] [--sim-port=N] [--relay-port=N]');
    console.log('relay-port=0 disables the hardware relay.');
    process.exit(0);
  } else {
    console.error('Unknown argument: ' + arg);
    process.exit(1);
  }
}

if (!httpPort || !simPort) {
  console.error('httpPort and simPort must be 1-65535.');
  process.exit(1);
}
if (relayPort && (relayPort === simPort || relayPort === httpPort)) {
  console.error('relayPort must be different from httpPort and simPort.');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ttf': 'font/ttf',
};

function localIpv4s() {
  const skip = /virtual|vethernet|vmware|vbox|loopback|wsl|bluetooth|hyper-v|default switch/i;
  const preferred = [];
  const other = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const info of ifaces[name] || []) {
      const family = info.family === 4 || info.family === 'IPv4';
      if (!family || info.internal || !info.address || info.address.startsWith('169.254.')) continue;
      const row = { name, address: info.address };
      if (skip.test(name)) other.push(row);
      else preferred.push(row);
    }
  }
  return preferred.length ? preferred : other;
}

function href(url) {
  return `\u001b]8;;${url}\u001b\\${url}\u001b]8;;\u001b\\`;
}

function checkFree(port) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ port, host: '127.0.0.1' }, () => {
      socket.end();
      reject(new Error('Port ' + port + ' is already in use.'));
    });
    socket.on('error', () => resolve());
  });
}

const blankScreen = { lines: [], scratchpad: '', message: '', title: '', titleLeft: '', page: '', exec: false, power: false };
const powerOffMessage = 'update:*:' + JSON.stringify({ left: blankScreen, right: blankScreen });

const servers = [];

function fanout(message) {
  const text = Buffer.isBuffer(message) ? message.toString() : String(message);
  for (const wss of servers) {
    for (const client of wss.clients) {
      if (client.readyState === OPEN) client.send(text);
    }
  }
}

function attachMirror(wss, label) {
  wss.on('connection', (ws) => {
    let isMcdu = false;
    ws.on('message', (message) => {
      const text = message.toString();
      if (text === 'mcduConnected') isMcdu = true;
      fanout(text);
    });
    ws.on('close', () => {
      if (isMcdu && label === 'sim') fanout(powerOffMessage);
    });
  });
}

function printBanner() {
  const lan = localIpv4s();
  console.log('');
  console.log('z-DementedMonkey-LiM-CDU');
  console.log('');
  console.log('  This PC     ' + href('http://localhost:' + httpPort));
  for (const nic of lan) {
    console.log('  LAN         ' + href('http://' + nic.address + ':' + httpPort) + '   (' + nic.name + ')');
  }
  console.log('  Sim socket  ws://127.0.0.1:' + simPort);
  if (relayPort) console.log('  Relay       ws://127.0.0.1:' + relayPort + '   (SPAD / hardware)');
  else console.log('  Relay       off');
  console.log('');
  console.log('  In the sim: MCDU MENU → WEBSOCKETS> → EXPORT ON.');
  console.log('  Set that page to 127.0.0.1 and port ' + simPort + '.');
  console.log('  Edit web-cdu/cdu-server.cfg to change these ports, then restart.');
  console.log('');
}

async function main() {
  await checkFree(simPort);
  await checkFree(httpPort);
  if (relayPort) await checkFree(relayPort);

  const httpServer = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let rel = urlPath === '/' ? '/index.html' : urlPath;
    if (rel.includes('..')) {
      res.writeHead(400);
      res.end('Bad request');
      return;
    }
    const filePath = path.join(publicDir, rel);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      let body = data;
      if (ext === '.html' || ext === '.js') {
        body = Buffer.from(String(data).replace(/__LIM_WS_PORT__/g, String(simPort)));
      }
      const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
      if (ext === '.html' || ext === '.css' || ext === '.js') headers['Cache-Control'] = 'no-store';
      res.writeHead(200, headers);
      res.end(body);
    });
  });

  httpServer.on('error', (err) => {
    console.error(err.message || err);
    process.exit(1);
  });

  const simWss = new WebSocketServer({ port: simPort });
  servers.push(simWss);
  attachMirror(simWss, 'sim');

  if (relayPort) {
    const relayWss = new WebSocketServer({ port: relayPort });
    servers.push(relayWss);
    attachMirror(relayWss, 'relay');
  }

  httpServer.listen(httpPort, '0.0.0.0', printBanner);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
