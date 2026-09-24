/**
 * Bomberman LAN & Online Multiplayer HTTP + WebSocket Server
 * Enables 2 players on separate computers/phones to battle in real-time!
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
};

// HTTP Static File Server
const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/' || reqUrl === '') reqUrl = '/index.html';

    const safePath = path.normalize(reqUrl).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(PUBLIC_DIR, safePath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache'
        });

        fs.createReadStream(filePath).pipe(res);
    });
});

// WebSocket Multiplayer Server
const wss = new WebSocket.Server({ server });
const rooms = new Map(); // roomId => { p1: ws, p2: ws, seed: number, state: {} }

wss.on('connection', (ws) => {
    let currentRoom = null;
    let playerSlot = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'join_room') {
                const roomId = data.roomId || 'room-1';
                currentRoom = roomId;

                if (!rooms.has(roomId)) {
                    // Create new room with a synchronized random seed for matching maps
                    rooms.set(roomId, {
                        p1: ws,
                        p2: null,
                        seed: Math.floor(Math.random() * 1000000)
                    });
                    playerSlot = 1;
                    ws.send(JSON.stringify({
                        type: 'room_joined',
                        playerNum: 1,
                        roomId: roomId,
                        status: 'waiting_for_opponent',
                        seed: rooms.get(roomId).seed
                    }));
                } else {
                    const room = rooms.get(roomId);
                    if (!room.p2) {
                        room.p2 = ws;
                        playerSlot = 2;
                        ws.send(JSON.stringify({
                            type: 'room_joined',
                            playerNum: 2,
                            roomId: roomId,
                            status: 'ready',
                            seed: room.seed
                        }));

                        // Notify Player 1 that opponent has joined!
                        if (room.p1 && room.p1.readyState === WebSocket.OPEN) {
                            room.p1.send(JSON.stringify({
                                type: 'opponent_connected',
                                roomId: roomId
                            }));
                        }
                    } else {
                        ws.send(JSON.stringify({
                            type: 'room_full',
                            message: 'Room is already full. Try another room ID!'
                        }));
                    }
                }
            }

            // Relay player movement, bomb placement, and game events to opponent in the same room
            if (data.type === 'game_event' && currentRoom && rooms.has(currentRoom)) {
                const room = rooms.get(currentRoom);
                const opponent = (playerSlot === 1) ? room.p2 : room.p1;
                if (opponent && opponent.readyState === WebSocket.OPEN) {
                    opponent.send(JSON.stringify({
                        type: 'opponent_event',
                        event: data.event,
                        payload: data.payload,
                        sender: playerSlot
                    }));
                }
            }
        } catch (e) {
            console.error('WS parse error:', e);
        }
    });

    ws.on('close', () => {
        if (currentRoom && rooms.has(currentRoom)) {
            const room = rooms.get(currentRoom);
            if (room.p1 === ws) room.p1 = null;
            if (room.p2 === ws) room.p2 = null;

            const remaining = room.p1 || room.p2;
            if (remaining && remaining.readyState === WebSocket.OPEN) {
                remaining.send(JSON.stringify({
                    type: 'opponent_disconnected',
                    message: 'Your opponent left the game.'
                }));
            }

            if (!room.p1 && !room.p2) {
                rooms.delete(currentRoom);
            }
        }
    });
});

// Detect Local Network IP Addresses
function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }
    return ips;
}

server.listen(PORT, '0.0.0.0', () => {
    const localIPs = getLocalIPs();
    console.log(`====================================================`);
    console.log(`💣 BOMBERMAN ARCADE SERVER STARTED ON PORT ${PORT} 💣`);
    console.log(`====================================================`);
    console.log(`• Local Browser: http://localhost:${PORT}`);
    if (localIPs.length > 0) {
        console.log(`• LAN / Same IP Access for Friends:`);
        localIPs.forEach(ip => {
            console.log(`    👉 http://${ip}:${PORT}`);
        });
    }
    console.log(`====================================================\n`);
});
