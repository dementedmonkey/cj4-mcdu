/* eslint-disable no-console */

'use strict';

const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const network = require('network');
const os = require('os');


const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
});

const readNumber = (prompt, min, max, callback) => {
    readline.question(`${prompt} (${min}-${max}):`, (response) => {
        const number = parseInt(response, 10);
        if (number != null && number >= min && number <= max) {
            callback(number);
        } else {
            readNumber(prompt, min, max, callback);
        }
    });
};

// Parse command line args
let httpPort = 8126;
let websocketPort = 8088;
let debug = false;

const args = [...process.argv];
args.splice(0, 2);

const blankScreen = {
    lines: [
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
    ],
    scratchpad: '',
    message: '',
    title: '',
    titleLeft: '',
    page: '',
    exec: false,
    power: false,
};

const powerOffMessage = "update:" + JSON.stringify({ left: blankScreen, right: blankScreen });

for (const arg of args) {
    if (arg.startsWith('--http-port=')) {
        httpPort = parseInt(arg.split('=')[1], 10);
        if (!httpPort || httpPort < 0 || httpPort > 65353) {
            console.error(`Invalid http port: ${arg}`);
            process.exit(1);
        }
        continue;
    }
    if (arg.startsWith('--websocket-port=')) {
        websocketPort = parseInt(arg.split('=')[1], 10);
        if (!websocketPort || websocketPort < 0 || websocketPort > 65353) {
            console.error(`Invalid websocket port: ${arg}`);
            process.exit(1);
        }
        continue;
    }
    if (arg === '--debug') {
        debug = true;
        continue;
    }
    if (arg === '-h' || arg === '--help') {
        printUsage();
        process.exit(0);
    }
    console.error(`Unknown argument: ${arg}`);
    printUsage();
    process.exit(1);
}

start();

function start() {
    console.log('Starting server...');

    // Simple HTTP server for the web-based client
    http.createServer((request, response) => {
        let filePath = `.${request.url}`;
        if (filePath === './') filePath = './index.html';

        const extname = path.extname(filePath);
        let contentType = 'text/html';
        switch (extname) {
            case '.js':
                contentType = 'text/javascript';
                break;
            case '.css':
                contentType = 'text/css';
                break;
            case '.json':
                contentType = 'application/json';
                break;
            case '.png':
                contentType = 'image/png';
                break;
            case '.jpg':
                contentType = 'image/jpg';
                break;
            case '.mp3':
                contentType = 'audio/mpeg';
                break;
            default:
                break;
        }

        fs.readFile(path.join(__dirname, './client/build/', filePath), (error, content) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    fs.readFile(path.join(__dirname, './client/build/index.html'), (error, content) => {
                        response.writeHead(200, { 'Content-Type': 'text/html' });
                        if (contentType === 'text/javascript') {
                            content = content.toString('utf8').replace(/__WEBSOCKET_PORT__/g, websocketPort);
                        }
                        response.end(content, 'utf-8');
                    });
                } else {
                    response.writeHead(500);
                    response.end(`Error: ${error.code}`);
                    response.end();
                }
            } else {
                response.writeHead(200, { 'Content-Type': contentType });
                if (contentType === 'text/javascript') {
                    content = content.toString('utf8').replace(/__WEBSOCKET_PORT__/g, websocketPort);
                }
                response.end(content, 'utf-8');
            }
        });
    }).listen(httpPort);

    network.get_private_ip((err, ip) => {
        // Create websocket server
        let wss = null;

        wss = new WebSocket.Server({ port: websocketPort }, () => {
            console.clear();
            console.log('External MCDU server started.\n');
            console.log('Waiting for simulator...');
        });

        wss.on('error', (err) => {
            console.error(`${err}`);
            setTimeout(() => {
            }, 5000);
        });

        wss.on('connection', (ws) => {
            let isMcdu = false;
            ws.on('message', (message) => {
                message = message.toString();
                if (message === 'mcduConnected') {
                    console.clear();
                    console.log('\x1b[32mSimulator connected!\x1b[0m\n');
                    if (err) {
                        console.log(`To control the MCDU from this device, open \x1b[47m\x1b[30mhttp://localhost:${httpPort}\x1b[0m in your browser.`);
                        console.log('\nTo control the MCDU from another device on your network, replace localhost with your local IP address.');
                        // eslint-disable-next-line max-len
                        console.log('To find your local IP address, see here: \x1b[47m\x1b[30mhttps://support.microsoft.com/en-us/windows/find-your-ip-address-in-windows-f21a9bbc-c582-55cd-35e0-73431160a1b9\x1b[0m');
                    } else {
                        console.log(`To control the MCDU from another device on your network, open \x1b[47m\x1b[30mhttp://${ip}:${httpPort}\x1b[0m in your browser.`);
                        console.log(`To control the MCDU from this device, open \x1b[47m\x1b[30mhttp://localhost:${httpPort}\x1b[0m in your browser.`);
                    }
                    console.log(`\nCan't connect? You may need to open TCP ports ${httpPort} and ${websocketPort} on your firewall.\n`);
                    console.log('Add "/sound" to your browser´s URL to get click sounds.');
                    isMcdu = true;
                    return;
                }
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(message);
                    }
                });
                if (debug) {
                    console.log(message);
                }
            });
            ws.on('close', () => {
                if (isMcdu) {
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(powerOffMessage);
                        }
                    });
                    console.clear();
                    console.log('\x1b[31mLost connection to simulator.\x1b[0m\n\nWaiting for simulator...');
                }
            });
        });
    });
}

function printUsage() {
    console.log('\nUsage:');
    console.log('server [options]');
    console.log('\nOptions:');
    console.log('--debug              enables debug mode');
    console.log('-h, --help           print command line options');
    console.log('--http-port=...      sets port for http server (default: 8126)');
    console.log('--websocket-port=... sets port for websocket server (default: 8088)');
}
