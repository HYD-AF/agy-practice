/**
 * Enemy AI and Monster Logic
 */

class Enemy {
    constructor(type, startC, startR, tileSize = TILE_SIZE) {
        this.type = type;
        this.tileSize = tileSize;
        this.size = tileSize;
        this.hitboxSize = tileSize * 0.7;

        this.x = startC * tileSize;
        this.y = startR * tileSize;
        this.dir = { x: 0, y: 0, name: 'down' };
        this.speed = type.speed;

        this.isDead = false;
        this.deathTimer = 0;
        this.changeDirCooldown = 0;

        // Pick initial direction
        this.chooseRandomDirection();
    }

    getTileCoord() {
        return {
            c: Math.floor((this.x + this.size / 2) / this.tileSize),
            r: Math.floor((this.y + this.size / 2) / this.tileSize)
        };
    }

    getHitbox() {
        const offset = (this.size - this.hitboxSize) / 2;
        return {
            left: this.x + offset,
            right: this.x + offset + this.hitboxSize,
            top: this.y + offset,
            bottom: this.y + offset + this.hitboxSize
        };
    }

    isAlive() {
        return !this.isDead;
    }

    kill() {
        if (this.isDead) return;
        this.isDead = true;
        this.deathTimer = 30;
        audio.playEnemyHit();
    }

    chooseRandomDirection() {
        const dirs = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT];
        this.dir = dirs[Math.floor(Math.random() * dirs.length)];
    }

    update(map, bombs, players) {
        if (this.isDead) {
            this.deathTimer--;
            return;
        }

        if (this.changeDirCooldown > 0) {
            this.changeDirCooldown--;
        }

        // Check if monster is aligned with a tile center
        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const currentC = Math.floor(cx / this.tileSize);
        const currentR = Math.floor(cy / this.tileSize);

        const tileCenterX = currentC * this.tileSize + this.tileSize / 2;
        const tileCenterY = currentR * this.tileSize + this.tileSize / 2;

        const isAtCenter = Math.abs(cx - tileCenterX) < this.speed && Math.abs(cy - tileCenterY) < this.speed;

        // At tile intersections, smart enemies decide where to turn
        if (isAtCenter && this.changeDirCooldown <= 0) {
            this.decideDirectionAtIntersection(currentC, currentR, map, bombs, players);
        }

        // Try to move in current direction
        let nextX = this.x + this.dir.x * this.speed;
        let nextY = this.y + this.dir.y * this.speed;

        if (!this.checkBlocked(nextX, nextY, map, bombs)) {
            this.x = nextX;
            this.y = nextY;
        } else {
            // Hit wall/bomb: snap to center and pick a new valid direction
            this.x = currentC * this.tileSize;
            this.y = currentR * this.tileSize;
            this.pickAlternativeDirection(currentC, currentR, map, bombs);
            this.changeDirCooldown = 15;
        }

        // Check player collision
        const myBox = this.getHitbox();
        players.forEach(p => {
            if (p.isAlive() && !p.isInvulnerable) {
                const pBox = p.getHitbox();
                if (myBox.left < pBox.right && myBox.right > pBox.left &&
                    myBox.top < pBox.bottom && myBox.bottom > pBox.top) {
                    p.kill();
                }
            }
        });
    }

    decideDirectionAtIntersection(c, r, map, bombs, players) {
        const availableDirs = this.getAvailableDirections(c, r, map, bombs);
        if (availableDirs.length === 0) return;

        // Medium intelligence (Oneal / Kondoria): Target nearest alive player
        if (this.type.intelligence === 'medium' && players.length > 0) {
            const alivePlayers = players.filter(p => p.isAlive());
            if (alivePlayers.length > 0) {
                const target = alivePlayers[0];
                const pCoord = target.getTileCoord();

                // Check line-of-sight on row
                if (pCoord.r === r) {
                    const wantDir = pCoord.c < c ? DIR.LEFT : DIR.RIGHT;
                    if (availableDirs.some(d => d.name === wantDir.name)) {
                        this.dir = wantDir;
                        this.changeDirCooldown = 20;
                        return;
                    }
                }
                // Check line-of-sight on col
                if (pCoord.c === c) {
                    const wantDir = pCoord.r < r ? DIR.UP : DIR.DOWN;
                    if (availableDirs.some(d => d.name === wantDir.name)) {
                        this.dir = wantDir;
                        this.changeDirCooldown = 20;
                        return;
                    }
                }

                // Follow general direction with 50% probability
                if (Math.random() < 0.5) {
                    const sorted = availableDirs.slice().sort((a, b) => {
                        const distA = Math.hypot((c + a.x) - pCoord.c, (r + a.y) - pCoord.r);
                        const distB = Math.hypot((c + b.x) - pCoord.c, (r + b.y) - pCoord.r);
                        return distA - distB;
                    });
                    this.dir = sorted[0];
                    this.changeDirCooldown = 20;
                    return;
                }
            }
        }

        // Random intersection choice (with low chance to reverse immediately)
        const nonReverseDirs = availableDirs.filter(d => !(d.x === -this.dir.x && d.y === -this.dir.y));
        if (nonReverseDirs.length > 0 && Math.random() < 0.75) {
            this.dir = nonReverseDirs[Math.floor(Math.random() * nonReverseDirs.length)];
        } else {
            this.dir = availableDirs[Math.floor(Math.random() * availableDirs.length)];
        }
        this.changeDirCooldown = 20;
    }

    pickAlternativeDirection(c, r, map, bombs) {
        const availableDirs = this.getAvailableDirections(c, r, map, bombs);
        if (availableDirs.length > 0) {
            this.dir = availableDirs[Math.floor(Math.random() * availableDirs.length)];
        } else {
            // Reverse
            this.dir = { x: -this.dir.x, y: -this.dir.y, name: 'reverse' };
        }
    }

    getAvailableDirections(c, r, map, bombs) {
        const dirs = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT];
        return dirs.filter(d => {
            const nextC = c + d.x;
            const nextR = r + d.y;
            return !this.isTileBlocked(nextR, nextC, map, bombs);
        });
    }

    isTileBlocked(r, c, map, bombs) {
        if (map.isBlocked(r, c, this.type.canPassBricks)) return true;
        // Blocked by bombs
        if (bombs.some(b => b.c === c && b.r === r)) return true;
        return false;
    }

    checkBlocked(targetX, targetY, map, bombs) {
        const offset = (this.size - this.hitboxSize) / 2;
        const box = {
            left: targetX + offset,
            right: targetX + offset + this.hitboxSize,
            top: targetY + offset,
            bottom: targetY + offset + this.hitboxSize
        };

        const minC = Math.floor(box.left / this.tileSize);
        const maxC = Math.floor(box.right / this.tileSize);
        const minR = Math.floor(box.top / this.tileSize);
        const maxR = Math.floor(box.bottom / this.tileSize);

        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                if (map.isBlocked(r, c, this.type.canPassBricks)) {
                    return true;
                }
            }
        }

        // Bomb collision
        for (const bomb of bombs) {
            const bBox = {
                left: bomb.c * this.tileSize,
                right: (bomb.c + 1) * this.tileSize,
                top: bomb.r * this.tileSize,
                bottom: (bomb.r + 1) * this.tileSize
            };
            if (box.left < bBox.right && box.right > bBox.left &&
                box.top < bBox.bottom && box.bottom > bBox.top) {
                return true;
            }
        }

        return false;
    }

    draw(ctx) {
        sprites.drawEnemy(ctx, this);
    }
}

class EnemyManager {
    constructor(tileSize = TILE_SIZE) {
        this.tileSize = tileSize;
        this.enemies = [];
    }

    reset() {
        this.enemies = [];
    }

    spawnStageEnemies(stageNum = 1, map) {
        this.enemies = [];

        // Determine enemy composition by stage
        const roster = [];
        if (stageNum === 1) {
            roster.push(ENEMY_TYPES.BALLOOM, ENEMY_TYPES.BALLOOM, ENEMY_TYPES.BALLOOM);
        } else if (stageNum === 2) {
            roster.push(ENEMY_TYPES.BALLOOM, ENEMY_TYPES.BALLOOM, ENEMY_TYPES.ONEAL, ENEMY_TYPES.ONEAL);
        } else if (stageNum === 3) {
            roster.push(ENEMY_TYPES.BALLOOM, ENEMY_TYPES.ONEAL, ENEMY_TYPES.ONEAL, ENEMY_TYPES.KONDORIA);
        } else {
            // Stage 4+
            roster.push(
                ENEMY_TYPES.BALLOOM,
                ENEMY_TYPES.ONEAL,
                ENEMY_TYPES.ONEAL,
                ENEMY_TYPES.KONDORIA,
                ENEMY_TYPES.KONDORIA
            );
        }

        // Find available empty tiles that are at least 5 tiles away from top-left (Player 1 spawn)
        const validTiles = [];
        for (let r = 1; r < map.rows - 1; r++) {
            for (let c = 1; c < map.cols - 1; c++) {
                if (map.grid[r][c] === TILE.EMPTY) {
                    const dist = Math.hypot(c - 1, r - 1);
                    if (dist >= 5) {
                        validTiles.push({ r, c });
                    }
                }
            }
        }

        // Shuffle tiles
        for (let i = validTiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validTiles[i], validTiles[j]] = [validTiles[j], validTiles[i]];
        }

        // Fallback if needed
        if (validTiles.length === 0) {
            for (let r = 1; r < map.rows - 1; r++) {
                for (let c = 1; c < map.cols - 1; c++) {
                    if (map.grid[r][c] === TILE.EMPTY && (r > 2 || c > 2)) {
                        validTiles.push({ r, c });
                    }
                }
            }
        }

        // Instantiate enemies without stacking on exact same tile if possible
        roster.forEach((type, idx) => {
            const tile = validTiles[idx % Math.max(1, validTiles.length)];
            if (tile) {
                this.enemies.push(new Enemy(type, tile.c, tile.r, this.tileSize));
            }
        });
    }

    update(map, bombManager, players) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(map, bombManager.bombs, players);

            if (enemy.isDead && enemy.deathTimer <= 0) {
                this.enemies.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.enemies.forEach(e => e.draw(ctx));
    }
}
