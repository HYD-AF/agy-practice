/**
 * Client-Side Network Multiplayer Manager
 * Synchronizes 2-player battles across separate devices over WebSockets
 */

class NetworkManager {
    constructor(gameEngine) {
        this.game = gameEngine;
        this.ws = null;
        this.roomId = null;
        this.playerNum = null; // 1 (Host/White) or 2 (Guest/Black)
        this.isConnected = false;
        this.lastSyncTime = 0;
    }

    connectAndJoin(roomId = 'room-1') {
        this.roomId = roomId;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;

        this.updateStatusUI(`Connecting to server...`);

        try {
            this.ws = new WebSocket(wsUrl);
        } catch (e) {
            this.updateStatusUI(`Connection failed: ${e.message}`);
            return;
        }

        this.ws.onopen = () => {
            this.isConnected = true;
            this.updateStatusUI(`Connected! Joining room "${roomId}"...`);
            this.send({
                type: 'join_room',
                roomId: roomId
            });
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                this.handleServerMessage(msg);
            } catch (err) {
                console.error('Error handling WS message:', err);
            }
        };

        this.ws.onclose = () => {
            this.isConnected = false;
            this.updateStatusUI('Disconnected from server.');
        };

        this.ws.onerror = (err) => {
            console.error('WebSocket error:', err);
            this.updateStatusUI('Connection error. Is server running?');
        };
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    sendGameEvent(eventName, payload = {}) {
        this.send({
            type: 'game_event',
            event: eventName,
            payload: payload
        });
    }

    handleServerMessage(msg) {
        if (msg.type === 'room_joined') {
            this.playerNum = msg.playerNum;

            if (msg.status === 'waiting_for_opponent') {
                this.updateStatusUI(`Room "${msg.roomId}" created! Waiting for Player 2 to join...`);
                document.getElementById('netShareLink').textContent = `${window.location.href}`;
                document.getElementById('netShareBox').style.display = 'block';
            } else if (msg.status === 'ready') {
                this.updateStatusUI(`Joined as Player 2! Starting online battle...`);
                setTimeout(() => {
                    this.startNetworkMatch();
                }, 1000);
            }
        } else if (msg.type === 'opponent_connected') {
            this.updateStatusUI(`Opponent joined! Starting online battle...`);
            setTimeout(() => {
                this.startNetworkMatch();
            }, 1000);
        } else if (msg.type === 'opponent_event') {
            this.handleOpponentEvent(msg.event, msg.payload, msg.sender);
        } else if (msg.type === 'opponent_disconnected') {
            this.updateStatusUI('Opponent disconnected.');
            alert('Your opponent disconnected from the match.');
        } else if (msg.type === 'room_full') {
            this.updateStatusUI(msg.message);
        }
    }

    startNetworkMatch() {
        this.game.hideAllModals();
        this.game.mode = GAME_MODE.NETWORK_BATTLE;
        this.game.state = GAME_STATE.PLAYING;
        this.game.p1Wins = 0;
        this.game.p2Wins = 0;

        // Player 1 (White Bomberman)
        const p1 = new Player(1, 1, 1, {
            up: ['KeyW', 'ArrowUp', 'w'],
            down: ['KeyS', 'ArrowDown', 's'],
            left: ['KeyA', 'ArrowLeft', 'a'],
            right: ['KeyD', 'ArrowRight', 'd'],
            bomb: ['Space', 'Enter'],
            action: ['KeyE', 'ShiftRight', 'ShiftLeft']
        }, TILE_SIZE);

        // Player 2 (Black Bomberman)
        const p2 = new Player(2, COLS - 2, ROWS - 2, {
            up: ['KeyW', 'ArrowUp', 'w'],
            down: ['KeyS', 'ArrowDown', 's'],
            left: ['KeyA', 'ArrowLeft', 'a'],
            right: ['KeyD', 'ArrowRight', 'd'],
            bomb: ['Space', 'Enter'],
            action: ['KeyE', 'ShiftRight', 'ShiftLeft']
        }, TILE_SIZE);

        this.game.players = [p1, p2];
        this.game.initBattleRound();

        // Inform HUD of network role
        const roleText = (this.playerNum === 1) ? 'YOU ARE PLAYER 1 (WHITE)' : 'YOU ARE PLAYER 2 (BLACK)';
        this.game.particles.spawnScorePop(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, roleText, '#38bdf8');
        audio.startBGM();
    }

    // Called every frame by game loop to broadcast local player's position
    syncLocalPlayer() {
        if (!this.isConnected || this.game.mode !== GAME_MODE.NETWORK_BATTLE || !this.playerNum) return;

        const myIndex = this.playerNum - 1;
        const myPlayer = this.game.players[myIndex];
        if (!myPlayer) return;

        const now = performance.now();
        if (now - this.lastSyncTime > 40) { // ~25 updates/sec
            this.lastSyncTime = now;
            this.sendGameEvent('player_pos', {
                x: myPlayer.x,
                y: myPlayer.y,
                facing: myPlayer.facing,
                isMoving: myPlayer.isMoving,
                isDead: myPlayer.isDead
            });
        }
    }

    broadcastBombDrop(tileC, tileR, isRemote = false) {
        if (this.game.mode === GAME_MODE.NETWORK_BATTLE) {
            this.sendGameEvent('place_bomb', { c: tileC, r: tileR, isRemote });
        }
    }

    broadcastDetonate() {
        if (this.game.mode === GAME_MODE.NETWORK_BATTLE) {
            this.sendGameEvent('detonate', {});
        }
    }

    handleOpponentEvent(event, payload, sender) {
        const oppIndex = sender - 1;
        const oppPlayer = this.game.players[oppIndex];
        if (!oppPlayer) return;

        if (event === 'player_pos') {
            oppPlayer.x = payload.x;
            oppPlayer.y = payload.y;
            oppPlayer.facing = payload.facing;
            oppPlayer.isMoving = payload.isMoving;
            if (payload.isDead && !oppPlayer.isDead) {
                oppPlayer.kill();
            }
        } else if (event === 'place_bomb') {
            this.game.bombManager.placeBomb(payload.c, payload.r, oppPlayer, payload.isRemote);
        } else if (event === 'detonate') {
            this.game.bombManager.detonateRemoteBombs(oppPlayer);
        }
    }

    updateStatusUI(text) {
        const el = document.getElementById('netStatusMsg');
        if (el) el.textContent = text;
    }
}
