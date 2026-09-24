/**
 * Main Bomberman Game Engine and Loop
 */

class InputManager {
    constructor() {
        this.down = {};
        this.justPressed = {};

        const onKeyDown = (e) => {
            // Prevent scrolling on arrow keys and space
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) ||
                [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }

            const keys = [e.code, e.key, e.key?.toLowerCase()].filter(Boolean);
            keys.forEach(k => {
                if (!this.down[k]) {
                    this.justPressed[k] = true;
                }
                this.down[k] = true;
            });
        };

        const onKeyUp = (e) => {
            const keys = [e.code, e.key, e.key?.toLowerCase()].filter(Boolean);
            keys.forEach(k => {
                this.down[k] = false;
            });
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
    }

    isDown(keys) {
        if (!Array.isArray(keys)) keys = [keys];
        return keys.some(k => !!this.down[k]);
    }

    isJustPressed(keys) {
        if (!Array.isArray(keys)) keys = [keys];
        return keys.some(k => !!this.justPressed[k]);
    }

    clearJustPressed() {
        this.justPressed = {};
    }

    // Virtual D-pad / Mobile support
    simulateKeyDown(code) {
        const keys = [code, code.toLowerCase()];
        keys.forEach(k => {
            if (!this.down[k]) {
                this.justPressed[k] = true;
            }
            this.down[k] = true;
        });
    }

    simulateKeyUp(code) {
        const keys = [code, code.toLowerCase()];
        keys.forEach(k => {
            this.down[k] = false;
        });
    }
}

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.input = new InputManager();

        // Canvas dimensions
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;

        // Systems
        this.map = new GameMap(COLS, ROWS, TILE_SIZE);
        this.bombManager = new BombManager(TILE_SIZE);
        this.enemyManager = new EnemyManager(TILE_SIZE);
        this.particles = new ParticleManager();

        // Game Configuration & State
        this.state = GAME_STATE.MENU;
        this.mode = GAME_MODE.CAMPAIGN;
        this.stage = 1;
        this.timeRemaining = 200; // seconds
        this.timeTickCounter = 0;
        this.highScore = parseInt(localStorage.getItem('bomberman_highscore') || '0', 10);

        // Pre-create Player 1 so players array is never empty
        const initialP1 = new Player(1, 1, 1, {
            up: ['KeyW', 'ArrowUp', 'w', 'W'],
            down: ['KeyS', 'ArrowDown', 's', 'S'],
            left: ['KeyA', 'ArrowLeft', 'a', 'A'],
            right: ['KeyD', 'ArrowRight', 'd', 'D'],
            bomb: ['Space', ' ', 'Enter', 'KeyJ', 'j'],
            action: ['KeyE', 'e', 'ShiftLeft', 'ShiftRight', 'KeyK', 'k']
        }, TILE_SIZE);

        this.players = [initialP1];
        this.p1Wins = 0;
        this.p2Wins = 0;

        // Transition timers
        this.stateTimer = 0;

        this.bindUI();
        this.setupLoop();
    }

    bindUI() {
        // Menu Start Buttons
        document.getElementById('btnStartCampaign')?.addEventListener('click', () => {
            this.startCampaign();
        });

        document.getElementById('btnStartBattle')?.addEventListener('click', () => {
            this.startBattle();
        });

        document.getElementById('btnRestart')?.addEventListener('click', () => {
            if (this.mode === GAME_MODE.CAMPAIGN) {
                this.startCampaign();
            } else {
                this.startBattle();
            }
        });

        document.getElementById('btnResume')?.addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('btnResumeModal')?.addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('btnBackToMenu')?.addEventListener('click', () => {
            this.returnToMenu();
        });

        document.getElementById('btnVictoryMenu')?.addEventListener('click', () => {
            this.returnToMenu();
        });

        document.getElementById('btnNextStage')?.addEventListener('click', () => {
            this.advanceToNextStage();
        });

        document.getElementById('btnStageClearMenu')?.addEventListener('click', () => {
            this.returnToMenu();
        });

        // Sound / Music Toggles
        document.getElementById('btnToggleMute')?.addEventListener('click', () => {
            const muted = audio.toggleMute();
            const btn = document.getElementById('btnToggleMute');
            if (btn) btn.textContent = muted ? '🔇 Sound: OFF' : '🔊 Sound: ON';
        });

        document.getElementById('btnToggleBGM')?.addEventListener('click', () => {
            if (audio.isPlayingBGM) {
                audio.stopBGM();
                const btn = document.getElementById('btnToggleBGM');
                if (btn) btn.textContent = '🎵 Music: OFF';
            } else {
                audio.startBGM();
                const btn = document.getElementById('btnToggleBGM');
                if (btn) btn.textContent = '🎵 Music: ON';
            }
        });

        // Virtual Controls for Mobile / On-Screen touch
        const touchMappings = {
            'btnTouchUp': 'KeyW',
            'btnTouchDown': 'KeyS',
            'btnTouchLeft': 'KeyA',
            'btnTouchRight': 'KeyD',
            'btnTouchBomb': 'Space',
            'btnTouchAction': 'KeyE'
        };

        Object.entries(touchMappings).forEach(([btnId, code]) => {
            const el = document.getElementById(btnId);
            if (!el) return;

            const press = (e) => {
                e.preventDefault();
                this.input.simulateKeyDown(code);
            };
            const release = (e) => {
                e.preventDefault();
                this.input.simulateKeyUp(code);
            };

            el.addEventListener('pointerdown', press);
            el.addEventListener('pointerup', release);
            el.addEventListener('pointercancel', release);
        });

        // Keyboard pause listener
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.PAUSED) {
                    this.togglePause();
                }
            }
        });
    }

    startCampaign() {
        this.mode = GAME_MODE.CAMPAIGN;
        this.stage = 1;
        this.state = GAME_STATE.PLAYING;

        // Create Player 1 (White Bomberman - WASD or Arrows)
        const p1 = new Player(1, 1, 1, {
            up: ['KeyW', 'ArrowUp', 'w', 'W'],
            down: ['KeyS', 'ArrowDown', 's', 'S'],
            left: ['KeyA', 'ArrowLeft', 'a', 'A'],
            right: ['KeyD', 'ArrowRight', 'd', 'D'],
            bomb: ['Space', ' ', 'Enter', 'KeyJ', 'j'],
            action: ['KeyE', 'e', 'ShiftLeft', 'ShiftRight', 'KeyK', 'k']
        }, TILE_SIZE);
        p1.lives = 3;
        p1.score = 0;
        this.players = [p1];

        this.initStage(this.stage);
        this.hideAllModals();
        audio.startBGM();
    }

    startBattle() {
        this.mode = GAME_MODE.BATTLE;
        this.state = GAME_STATE.PLAYING;
        this.p1Wins = 0;
        this.p2Wins = 0;

        // Player 1 (White Bomberman - WASD + Space + E)
        const p1 = new Player(1, 1, 1, {
            up: 'KeyW',
            down: 'KeyS',
            left: 'KeyA',
            right: 'KeyD',
            bomb: 'Space',
            action: 'KeyE'
        }, TILE_SIZE);

        // Player 2 (Black Bomberman - Arrows + Enter + Shift)
        const p2 = new Player(2, COLS - 2, ROWS - 2, {
            up: 'ArrowUp',
            down: 'ArrowDown',
            left: 'ArrowLeft',
            right: 'ArrowRight',
            bomb: 'Enter',
            action: 'ShiftRight'
        }, TILE_SIZE);

        this.players = [p1, p2];
        this.initBattleRound();
        this.hideAllModals();
        audio.startBGM();
    }

    initStage(stageNum) {
        this.stage = stageNum;
        this.timeRemaining = 200;
        this.timeTickCounter = 0;
        this.stateTimer = 0;

        this.bombManager.reset();
        this.particles.reset();
        this.map.generate(stageNum, GAME_MODE.CAMPAIGN);

        // Reset player position
        const p1 = this.players[0];
        p1.resetPosition(1, 1);

        // Spawn monsters
        this.enemyManager.spawnStageEnemies(stageNum, this.map);
    }

    initBattleRound() {
        this.timeRemaining = 90; // 90 seconds battle timer
        this.timeTickCounter = 0;
        this.stateTimer = 0;

        this.bombManager.reset();
        this.particles.reset();
        this.enemyManager.reset();
        this.map.generate(1, GAME_MODE.BATTLE);

        // Spawn P1 top-left, P2 bottom-right
        this.players[0].resetPosition(1, 1);
        this.players[1].resetPosition(COLS - 2, ROWS - 2);
    }

    togglePause() {
        if (this.state === GAME_STATE.PLAYING) {
            this.state = GAME_STATE.PAUSED;
            this.showModal('modalPause');
            audio.pauseBGM();
        } else if (this.state === GAME_STATE.PAUSED) {
            this.state = GAME_STATE.PLAYING;
            this.hideAllModals();
            audio.startBGM();
        }
    }

    returnToMenu() {
        this.state = GAME_STATE.MENU;
        this.hideAllModals();
        this.showModal('modalMenu');
        audio.stopBGM();
    }

    update() {
        sprites.tick();

        if (this.state === GAME_STATE.PLAYING) {
            this.updatePlaying();
        } else if (this.state === GAME_STATE.LEVEL_CLEAR) {
            // Keep background animations and particles alive while score modal is active
            this.map.update();
            this.particles.update();
        }

        this.input.clearJustPressed();
    }

    updatePlaying() {
        // 1. Level Timer Tick (every 60 frames = 1 second)
        this.timeTickCounter++;
        if (this.timeTickCounter >= 60) {
            this.timeTickCounter = 0;
            if (this.timeRemaining > 0) {
                this.timeRemaining--;
            } else {
                // Time up! In Campaign, player loses a life. In Battle, sudden death!
                if (this.mode === GAME_MODE.CAMPAIGN) {
                    this.players[0].kill();
                }
            }
        }

        // 2. Update Map, Bombs, Particles
        this.map.update();
        this.bombManager.update(this.map, this.players, this.enemyManager.enemies, this.particles);
        this.particles.update();

        // 3. Update Players (pass particle manager for powerup popups)
        this.players.forEach(p => {
            p.update(this.input, this.map, this.bombManager, this.enemyManager.enemies, this.particles);
        });

        // 4. Update AI Enemies (Campaign mode)
        if (this.mode === GAME_MODE.CAMPAIGN) {
            this.enemyManager.update(this.map, this.bombManager, this.players);

            const p1 = this.players[0];

            // 1. Check Exit Door condition (usable at ANY time once uncovered!)
            if (this.map.door.revealed && this.map.door.isOpen && p1.isAlive() && this.state === GAME_STATE.PLAYING) {
                const pTile = p1.getTileCoord();
                if (pTile.c === this.map.door.c && pTile.r === this.map.door.r) {
                    const isSecretEscape = (this.enemyManager.enemies.length > 0);
                    this.triggerLevelClear(isSecretEscape);
                    return;
                }
            }

            // 2. Check if all enemies are defeated -> automatically reveal exit portal & trigger victory!
            if (this.enemyManager.enemies.length === 0 && this.state === GAME_STATE.PLAYING) {
                this.map.revealDoor();
                this.triggerLevelClear(false);
                return;
            }

            // Check Player Death in Campaign
            if (p1.isDead && p1.deathTimer <= 0) {
                if (p1.lives > 0) {
                    // Respawn player at start tile with remaining powerups intact
                    p1.resetPosition(1, 1);
                } else {
                    this.triggerGameOver();
                    return;
                }
            }

            // Update High Score
            if (p1.score > this.highScore) {
                this.highScore = p1.score;
                localStorage.setItem('bomberman_highscore', this.highScore.toString());
            }

        } else if (this.mode === GAME_MODE.BATTLE) {
            // Battle PvP Mode checks
            const p1 = this.players[0];
            const p2 = this.players[1];

            if (p1.isDead && p1.deathTimer <= 0 && p2.isAlive()) {
                this.p2Wins++;
                this.checkBattleRoundEnd('Player 2 Wins Round!');
            } else if (p2.isDead && p2.deathTimer <= 0 && p1.isAlive()) {
                this.p1Wins++;
                this.checkBattleRoundEnd('Player 1 Wins Round!');
            } else if (p1.isDead && p2.isDead && p1.deathTimer <= 0 && p2.deathTimer <= 0) {
                this.checkBattleRoundEnd('Draw Round!');
            }
        }
    }

    triggerLevelClear(isSecretEscape = false) {
        if (this.state === GAME_STATE.LEVEL_CLEAR) return;
        this.state = GAME_STATE.LEVEL_CLEAR;
        audio.pauseBGM();
        audio.playLevelClear();

        const p1 = this.players[0];
        const enemyBonus = isSecretEscape ? 0 : 1000;
        const secretBonus = isSecretEscape ? 500 : 0;
        const timeBonus = Math.max(0, this.timeRemaining * 10);
        const totalBonus = enemyBonus + secretBonus + timeBonus;
        p1.addScore(totalBonus);

        // Update high score
        if (p1.score > this.highScore) {
            this.highScore = p1.score;
            localStorage.setItem('bomberman_highscore', this.highScore.toString());
        }

        // Spawn particle banner
        const banner = isSecretEscape ? `🚪 SECRET PORTAL ESCAPE! +${totalBonus} PTS` : `🎉 STAGE ${this.stage} CLEAR! +${totalBonus} PTS`;
        this.particles.spawnScorePop(
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2 - 25,
            banner,
            '#4ade80'
        );

        // Populate Stage Clear / Well Done Modal
        const titleEl = document.getElementById('stageClearTitle');
        if (titleEl) {
            titleEl.textContent = isSecretEscape ? `🚪 SECRET SHORTCUT ESCAPE!` : `STAGE ${this.stage} COMPLETE!`;
        }

        const enemyBonusEl = document.getElementById('stageEnemyBonus');
        if (enemyBonusEl) {
            enemyBonusEl.textContent = isSecretEscape ? `+500 PTS (SECRET)` : `+1000 PTS (CLEARED)`;
        }

        const timeBonusEl = document.getElementById('stageTimeBonus');
        if (timeBonusEl) timeBonusEl.textContent = `+${timeBonus} PTS (${this.timeRemaining}s)`;

        const totalScoreEl = document.getElementById('stageTotalScore');
        if (totalScoreEl) totalScoreEl.textContent = p1.score.toString().padStart(6, '0');

        const loadoutEl = document.getElementById('stageLoadout');
        if (loadoutEl) {
            const speedPct = Math.round((p1.speed / p1.baseSpeed) * 100);
            loadoutEl.textContent = `❤️ Lives: ${p1.lives} | 💣 Bombs: ${p1.maxBombs} | 🔥 Fire: ${p1.fireRange} | ⚡ Speed: ${speedPct}%`;
        }

        const btnNext = document.getElementById('btnNextStage');
        if (btnNext) {
            if (this.stage >= 5) {
                btnNext.textContent = '🏆 VICTORY CEREMONY';
            } else {
                btnNext.textContent = `▶ NEXT STAGE (STAGE ${this.stage + 1})`;
            }
        }

        // Show modal after brief 500ms fanfare delay
        setTimeout(() => {
            if (this.state === GAME_STATE.LEVEL_CLEAR) {
                this.showModal('modalStageClear');
            }
        }, 500);
    }

    advanceToNextStage() {
        this.hideAllModals();

        if (this.stage >= 5) {
            this.state = GAME_STATE.VICTORY;
            const p1 = this.players[0];
            document.getElementById('victoryTitle').textContent = '🏆 BOMBER CHAMPION!';
            document.getElementById('victoryDetails').textContent = `All 5 Stages Conquered! Final Score: ${p1.score} PTS!`;
            this.showModal('modalVictory');
            return;
        }

        this.initStage(this.stage + 1);
        this.state = GAME_STATE.PLAYING;
        audio.startBGM();
    }

    triggerGameOver() {
        this.state = GAME_STATE.GAME_OVER;
        audio.stopBGM();
        document.getElementById('finalScore').textContent = this.players[0].score.toString();
        this.showModal('modalGameOver');
    }

    checkBattleRoundEnd(title) {
        if (this.p1Wins >= 3 || this.p2Wins >= 3) {
            this.state = GAME_STATE.VICTORY;
            audio.stopBGM();
            const winner = this.p1Wins >= 3 ? 'Player 1 (White)' : 'Player 2 (Black)';
            document.getElementById('victoryTitle').textContent = `${winner} Champions!`;
            document.getElementById('victoryDetails').textContent = `Score: P1 ${this.p1Wins} - ${this.p2Wins} P2`;
            this.showModal('modalVictory');
        } else {
            // Next round
            this.particles.spawnScorePop(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, title, '#38bdf8');
            setTimeout(() => {
                this.initBattleRound();
            }, 1800);
        }
    }

    render() {
        this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        this.ctx.save();
        // Screen Shake effect on explosions
        if (this.bombManager.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * this.bombManager.screenShake;
            const shakeY = (Math.random() - 0.5) * this.bombManager.screenShake;
            this.ctx.translate(shakeX, shakeY);
        }

        // 1. Draw Map (Floors, Walls, Bricks, Powerups, Door)
        this.map.draw(this.ctx);

        // 2. Draw Bombs and Explosions
        this.bombManager.draw(this.ctx);

        // 3. Draw Enemies
        this.enemyManager.draw(this.ctx);

        // 4. Draw Players
        this.players.forEach(p => p.draw(this.ctx));

        // 5. Draw Particles and Floating Score numbers
        this.particles.draw(this.ctx);

        this.ctx.restore();

        // 6. Update HTML HUD
        this.updateHUD();
    }

    updateHUD() {
        if (this.mode === GAME_MODE.CAMPAIGN) {
            const p1 = this.players[0] || {};
            document.getElementById('hudScore').textContent = (p1.score || 0).toString().padStart(6, '0');
            document.getElementById('hudHighScore').textContent = this.highScore.toString().padStart(6, '0');
            document.getElementById('hudLives').textContent = '❤️'.repeat(Math.max(0, p1.lives || 0));
            document.getElementById('hudStage').textContent = this.stage.toString();
            document.getElementById('hudTime').textContent = this.timeRemaining.toString();

            // Stats row
            document.getElementById('hudBombs').textContent = `${p1.activeBombs || 0}/${p1.maxBombs || 1}`;
            document.getElementById('hudFire').textContent = (p1.fireRange || 1).toString();
            document.getElementById('hudSpeed').textContent = `${Math.round(((p1.speed || 2.5) / 2.5) * 100)}%`;

            const badges = [];
            if (p1.hasKick) badges.push('👟 KICK');
            if (p1.hasRemote) badges.push('📡 DETONATOR');
            if (p1.isInvulnerable) badges.push('🛡️ SHIELD');
            document.getElementById('hudBadges').textContent = badges.join(' ') || 'NONE';

            document.getElementById('campaignHUD').style.display = 'flex';
            document.getElementById('battleHUD').style.display = 'none';
        } else {
            // Battle HUD
            document.getElementById('battleP1Score').textContent = this.p1Wins.toString();
            document.getElementById('battleP2Score').textContent = this.p2Wins.toString();
            document.getElementById('battleTime').textContent = this.timeRemaining.toString();

            document.getElementById('campaignHUD').style.display = 'none';
            document.getElementById('battleHUD').style.display = 'flex';
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'flex';
    }

    hideAllModals() {
        const modals = ['modalMenu', 'modalPause', 'modalGameOver', 'modalVictory', 'modalStageClear'];
        modals.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }

    setupLoop() {
        const loop = () => {
            try {
                this.update();
                this.render();
            } catch (err) {
                console.error('Game loop error:', err);
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
}

// Instantiate game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    window.game = new GameEngine();
});
