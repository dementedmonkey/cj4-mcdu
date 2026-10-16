/**
 * z-DementedMonkey-LiM-CDU hub. Modified from dementedmonkey/cj4-mcdu (GPL-3), 2026-10-10.
 *
 *   HTTP     httpPort   (browser page, default 8126)
 *   WS       simPort    (sim + browser, default 8088)
 *   WS       relayPort  (hardware / SPAD, default 8089; 0 = off)
 *   host     relayIp    (the PC where SPAD is listening)
 *
 * The sim connects in on simPort. This hub then connects out to
 * relayIp:relayPort and speaks as the plane: mcduConnected, then the
 * same update and key messages. SPAD listens. The hub dials.
 *
 * Ports: cdu-server.cfg, then environment (LIM_HTTP_PORT / LIM_WS_PORT /
 * LIM_RELAY_PORT / LIM_RELAY_IP), then --http-port= --sim-port=
 * --relay-port= --relay-ip=.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { WebSocketServer, WebSocket, OPEN } = require('ws');

const publicDir = path.join(__dirname, 'public');
const cfgPath = path.join(__dirname, 'cdu-server.cfg');

function readCfg(file) {
  const cfg = { httpPort: 8126, simPort: 8088, relayPort: 8089, relayIp: '127.0.0.1' };
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
    if (key === 'relayIp' || key === 'relayHost') cfg.relayIp = value;
  }
  return cfg;
}

function relayHostOr(value, fallback) {
  const host = String(value == null ? '' : value).trim();
  if (!host || !/^[A-Za-z0-9._:-]+$/.test(host)) return fallback;
  return host;
}

function relayIsLocal(host) {
  const h = String(host || '').trim().toLowerCase();
  return h === '' || h === '127.0.0.1' || h === 'localhost' || h === '::1' || h === '0.0.0.0' || h === '*';
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
let relayIp = relayHostOr(process.env.LIM_RELAY_IP, cfg.relayIp || '127.0.0.1');

for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--http-port=')) httpPort = portOr(arg.split('=')[1], httpPort);
  else if (arg.startsWith('--sim-port=') || arg.startsWith('--websocket-port=')) simPort = portOr(arg.split('=')[1], simPort);
  else if (arg.startsWith('--relay-port=')) relayPort = portOr(arg.split('=')[1], relayPort);
  else if (arg.startsWith('--relay-ip=')) relayIp = relayHostOr(arg.split('=').slice(1).join('='), relayIp);
  else if (arg === '--help' || arg === '-h') {
    console.log('node index.js [--http-port=N] [--sim-port=N] [--relay-port=N] [--relay-ip=ADDR]');
    console.log('relay-port=0 disables the hardware relay.');
    console.log('SPAD listens on relay-ip:relay-port. This hub connects out and speaks as the plane.');
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
const extraClients = new Set();

function fanout(message, skip) {
  const text = Buffer.isBuffer(message) ? message.toString() : String(message);
  for (const wss of servers) {
    for (const client of wss.clients) {
      if (client !== skip && client.readyState === OPEN) client.send(text);
    }
  }
  for (const client of extraClients) {
    if (client !== skip && client.readyState === OPEN) client.send(text);
  }
}

let simClients = 0;
let lastFromSim = '';

function roleOf(text) {
  if (text === 'mcduConnected' || text.indexOf('update:') === 0) return 'sim';
  if (text === 'requestUpdate' || text.indexOf('event:') === 0) return 'browser';
  return null;
}

function planeFromUpdate(text) {
  if (text.indexOf('update:') !== 0) return null;
  const colon = text.indexOf(':', 7);
  if (colon < 0) return null;
  const protocol = text.slice(7, colon);
  if (!protocol || protocol === '*') return null;
  let aircraft = '';
  let face = '';
  try {
    const json = JSON.parse(text.slice(colon + 1));
    aircraft = String(json.aircraft || '').trim();
    if (json.face === '4in' || json.face === '5in') face = json.face;
  } catch (e) {
    return null;
  }
  const kind = protocol === 'wt737/wt747' ? '747'
    : protocol === 'wt737/uns1' ? 'UNS-1'
    : protocol === 'wt737' ? '737'
    : protocol === 'wt21' ? 'WT21'
    : protocol;
  const family = kind + (face ? ' ' + face : '');
  const label = aircraft && family ? aircraft + ' — ' + family : (aircraft || family);
  return label || null;
}

function attachMirror(wss, label) {
  wss.on('connection', (ws) => {
    let role = label === 'relay' ? 'relay' : null;
    let plane = '';
    if (role === 'relay') console.log('Relay connected');
    ws.on('message', (message) => {
      const text = message.toString();
      if (!role) {
        role = roleOf(text);
        if (role === 'sim') {
          simClients += 1;
          console.log('Sim connected');
        } else if (role === 'browser') {
          console.log('Browser connected');
        }
      }
      if (role === 'sim' && text.indexOf('update:') === 0) {
        lastFromSim = text;
        const next = planeFromUpdate(text);
        if (next && next !== plane) {
          plane = next;
          console.log('Aircraft: ' + plane);
        }
      }
      fanout(text);
    });
    ws.on('close', () => {
      if (role === 'sim') {
        simClients = Math.max(0, simClients - 1);
        console.log(plane ? 'Sim disconnected: ' + plane : 'Sim disconnected');
        if (simClients === 0) console.log('Waiting for simulator...');
        fanout(powerOffMessage);
      } else if (role === 'browser') {
        console.log('Browser disconnected');
      } else if (role === 'relay') {
        console.log('Relay disconnected');
      }
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
  if (!relayPort) {
    console.log('  Relay       off');
  } else {
    console.log('  Relay out   ws://' + relayIp + ':' + relayPort + '   (SPAD listens, this hub connects like the plane)');
  }
  console.log('');
  console.log('  Turn export on in the sim the first time. IP 127.0.0.1, port ' + simPort + '.');
  console.log('');
  console.log('  WT21       CJ4, King Air, P180, Hawker');
  console.log('             IDX, page 2, RSK 5    WEBSOCKETS>');
  console.log('  Honeywell  Citation X (C750)');
  console.log('             NAV, SETTINGS, RSK 1  WEBSOCKETS>');
  console.log('  737        MENU, RSK 5           WEBSOCKETS>');
  console.log('  747        MENU, RSK 5           WEBSOCKETS>');
  console.log('  UNS-1      DATA page 1, RSK 5 MAINT, then RSK 1 WEBSOCKETS');
  console.log('             Export on the UNS-1 starts ON.');
  console.log('');
  console.log('  Edit web-cdu/cdu-server.cfg to change these ports, then restart.');
  console.log('  SPAD listens on relayPort. This hub connects out and sends the plane\'s messages.');
  console.log('');
  console.log('Waiting for simulator...');
  console.log('');
}

let relayOutTimer = null;

function connectRelayOut() {
  const url = 'ws://' + relayIp + ':' + relayPort;
  const ws = new WebSocket(url);
  extraClients.add(ws);
  ws.on('open', () => {
    console.log('Relay connected ' + url);
    try { ws.send('mcduConnected'); } catch (e) { /* ignore */ }
    if (lastFromSim) {
      try { ws.send(lastFromSim); } catch (e2) { /* ignore */ }
    }
  });
  ws.on('message', (message) => fanout(message.toString(), ws));
  ws.on('close', () => {
    extraClients.delete(ws);
    console.log('Relay disconnected');
    relayOutTimer = setTimeout(connectRelayOut, 2000);
  });
  ws.on('error', (err) => {
    console.log('Relay ' + url + ' — ' + (err && err.message ? err.message : err));
  });
}

async function main() {
  await checkFree(simPort);
  await checkFree(httpPort);

  const httpServer = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    // Landing page routes to 747 / 737 / UNS / WT21 faces from the first sim update.
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

  if (relayPort) connectRelayOut();

  httpServer.listen(httpPort, '0.0.0.0', printBanner);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
