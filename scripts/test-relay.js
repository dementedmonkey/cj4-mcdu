/**
 * Proves the sim socket and the relay socket share one fan-out.
 * A message sent on either port must arrive on the other.
 */
'use strict';

const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');

const HTTP = 18126;
const SIM = 18088;
const RELAY = 18089;
const serverPath = path.join(__dirname, '..', '1 - Src', 'z-DementedMonkey-LiM-CDU', 'web-cdu', 'index.js');

function waitForOpen(url) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tryConnect = () => {
      const ws = new WebSocket(url);
      ws.on('open', () => resolve(ws));
      ws.on('error', () => {
        ws.close();
        if (Date.now() - started > 8000) reject(new Error('Timed out connecting to ' + url));
        else setTimeout(tryConnect, 150);
      });
    };
    tryConnect();
  });
}

function onceMessage(ws) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for a message')), 4000);
    ws.once('message', (data) => {
      clearTimeout(timer);
      resolve(String(data));
    });
  });
}

async function testListen() {
  const child = spawn(process.execPath, [
    serverPath,
    '--http-port=' + HTTP,
    '--sim-port=' + SIM,
    '--relay-port=' + RELAY,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let stderr = '';
  child.stderr.on('data', (buf) => { stderr += buf.toString(); });

  try {
    const sim = await waitForOpen('ws://127.0.0.1:' + SIM);
    const relay = await waitForOpen('ws://127.0.0.1:' + RELAY);

    const fromRelay = onceMessage(relay);
    sim.send('update:wt21:{"aircraft":"C25C","left":{"power":true,"lines":[]}}');
    const relaySaw = await fromRelay;
    if (relaySaw.indexOf('update:wt21:') !== 0) {
      throw new Error('Relay did not receive the sim update: ' + relaySaw);
    }

    const fromSim = onceMessage(sim);
    relay.send('event:wt21:1:L1');
    const simSaw = await fromSim;
    if (simSaw !== 'event:wt21:1:L1') {
      throw new Error('Sim socket did not receive the relay key: ' + simSaw);
    }

    sim.close();
    relay.close();
    console.log('Relay fan-out OK (sim ' + SIM + ' <-> relay ' + RELAY + ').');
  } catch (err) {
    console.error(err.message || err);
    if (stderr) console.error(stderr);
    process.exitCode = 1;
  } finally {
    child.kill();
  }
}

async function testOutbound() {
  const outHttp = 18127;
  const outSim = 18091;
  const outRelay = 18090;
  const remote = new WebSocket.Server({ host: '127.0.0.2', port: outRelay });
  const child = spawn(process.execPath, [
    serverPath,
    '--http-port=' + outHttp,
    '--sim-port=' + outSim,
    '--relay-port=' + outRelay,
    '--relay-ip=127.0.0.2',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (buf) => { stderr += buf.toString(); });

  const incoming = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Hub did not connect out to the relay')), 8000);
    remote.on('connection', (ws) => {
      clearTimeout(timer);
      resolve(ws);
    });
  });

  try {
    const peer = await incoming;
    const sim = await waitForOpen('ws://127.0.0.1:' + outSim);
    const fromPeer = onceMessage(peer);
    sim.send('update:wt21:{"aircraft":"C25C","left":{"power":true,"lines":[]}}');
    const peerSaw = await fromPeer;
    if (peerSaw.indexOf('update:wt21:') !== 0) {
      throw new Error('Outbound relay did not receive the sim update: ' + peerSaw);
    }
    const fromSim = onceMessage(sim);
    peer.send('event:wt21:1:L1');
    const simSaw = await fromSim;
    if (simSaw !== 'event:wt21:1:L1') {
      throw new Error('Sim socket did not receive the outbound relay key: ' + simSaw);
    }
    sim.close();
    peer.close();
    console.log('Relay outbound OK (hub dialed 127.0.0.2:' + outRelay + ').');
  } catch (err) {
    console.error(err.message || err);
    if (stderr) console.error(stderr);
    process.exitCode = 1;
  } finally {
    child.kill();
    remote.close();
  }
}

async function main() {
  await testListen();
  if (!process.exitCode) await testOutbound();
}

main();
