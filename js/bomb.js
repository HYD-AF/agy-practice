/**
 * Bomb, Blast Ray, and Explosion Manager
 */

class Bomb {
    constructor(c, r, range, owner, tileSize = TILE_SIZE, isRemote = false) {
        this.c = c;
        this.r = r;
        this.range = range;
        this.owner = owner; // Player instance
        this.isRemote = isRemote;
        this.timer = isRemote ? 999999 : 180; // Remote bombs never auto-explode!
        this.maxTimer = 180;
        this.exploded = false;

        // Sliding movement if kicked
        this.vx = 0;
        this.vy = 0;
        this.slideSpeed = 5;
        this.pixelX = c * tileSize;
        this.pixelY = r * tileSize;
        this.tileSize = tileSize;
    }

    update(map, bombs) {
        if (!this.isRemote && this.timer > 0) {
            this.timer--;
        }

        // Handle sliding if kicked
        if (this.vx !== 0 || this.vy !== 0) {
            this.pixelX += this.vx * this.slideSpeed;
            this.pixelY += this.vy * this.slideSpeed;

            const nextC = Math.floor((this.pixelX + this.tileSize / 2) / this.tileSize);
            const nextR = Math.floor((this.pixelY + this.tileSize / 2) / this.tileSize);

            // Check if next tile in sliding direction is blocked
            const aheadC = this.vx > 0 ? Math.floor((this.pixelX + this.tileSize - 1) / this.tileSize) : Math.floor(this.pixelX / this.tileSize);
            const aheadR = this.vy > 0 ? Math.floor((this.pixelY + this.tileSize - 1) / this.tileSize) : Math.floor(this.pixelY / this.tileSize);

            const isBlocked = map.isBlocked(aheadR, aheadC) ||
                bombs.some(b => b !== this && b.c === aheadC && b.r === aheadR);

            if (isBlocked) {
                // Snap to current tile center and stop sliding
                this.c = Math.round(this.pixelX / this.tileSize);
                this.r = Math.round(this.pixelY / this.tileSize);
                this.pixelX = this.c * this.tileSize;
                this.pixelY = this.r * this.tileSize;
                this.vx = 0;
                this.vy = 0;
            } else {
                this.c = nextC;
                this.r = nextR;
            }
        }
    }

    kick(dx, dy) {
        this.vx = dx;
        this.vy = dy;
        audio.playKick();
    }
}

class ExplosionSegment {
    constructor(c, r, part = 'center', owner) {
        this.c = c;
        this.r = r;
        this.part = part;
        this.owner = owner;
        this.timer = 28; // ~0.45s display
        this.maxTimer = 28;
    }

    update() {
        this.timer--;
        return this.timer <= 0;
    }
}

class BombManager {
    constructor(tileSize = TILE_SIZE) {
        this.tileSize = tileSize;
        this.bombs = [];
        this.explosions = [];
        this.screenShake = 0;
    }

    reset() {
        this.bombs = [];
        this.explosions = [];
        this.screenShake = 0;
    }

    canPlaceBomb(c, r) {
        return !this.bombs.some(b => b.c === c && b.r === r);
    }

    placeBomb(c, r, player, isRemote = false) {
        if (!this.canPlaceBomb(c, r)) return null;

        const bomb = new Bomb(c, r, player.fireRange, player, this.tileSize, isRemote);
        this.bombs.push(bomb);
        audio.playBombPlace();
        return bomb;
    }

    detonateRemoteBombs(player) {
        const remoteBombs = this.bombs.filter(b => b.owner === player && b.isRemote && !b.exploded);
        if (remoteBombs.length > 0) {
            remoteBombs.forEach(b => { b.timer = 0; });
            return true;
        }
        // Fallback: detonate oldest bomb
        const oldest = this.bombs.find(b => b.owner === player && !b.exploded);
        if (oldest) {
            oldest.timer = 0;
            return true;
        }
        return false;
    }

    detonateOldestBomb(player) {
        return this.detonateRemoteBombs(player);
    }

    update(map, players, enemies, particleManager) {
        if (this.screenShake > 0) {
            this.screenShake *= 0.85;
            if (this.screenShake < 0.2) this.screenShake = 0;
        }

        // 1. Update bombs
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const bomb = this.bombs[i];
            bomb.update(map, this.bombs);

            if (bomb.timer <= 0 && !bomb.exploded) {
                this.explodeBomb(bomb, map, players, enemies, particleManager);
                this.bombs.splice(i, 1);
                if (bomb.owner) {
                    bomb.owner.activeBombs = Math.max(0, bomb.owner.activeBombs - 1);
                }
            }
        }

        // 2. Update active explosion segments
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            if (exp.update()) {
                this.explosions.splice(i, 1);
            } else {
                // Continuously damage players and enemies stepping into active flame
                this.checkFlameCollisions(exp, players, enemies, particleManager);
            }
        }
    }

    explodeBomb(bomb, map, players, enemies, particleManager) {
        bomb.exploded = true;
        this.screenShake = 6;
        audio.playExplosion();

        // Spawn particles at explosion epicenter
        if (particleManager) {
            particleManager.spawnExplosionSparks(
                bomb.c * this.tileSize + this.tileSize / 2,
                bomb.r * this.tileSize + this.tileSize / 2
            );
        }

        // Center blast
        const blastTiles = [{ c: bomb.c, r: bomb.r, part: 'center' }];

        // 4 Cardinal Directions: Up, Down, Left, Right
        const directions = [
            { dx: 0, dy: -1, partMid: 'vertical', partEnd: 'up' },
            { dx: 0, dy: 1, partMid: 'vertical', partEnd: 'down' },
            { dx: -1, dy: 0, partMid: 'horizontal', partEnd: 'left' },
            { dx: 1, dy: 0, partMid: 'horizontal', partEnd: 'right' }
        ];

        directions.forEach(dir => {
            for (let step = 1; step <= bomb.range; step++) {
                const targetC = bomb.c + dir.dx * step;
                const targetR = bomb.r + dir.dy * step;

                // Stop at indestructible walls
                if (map.isWall(targetR, targetC)) {
                    break;
                }

                const isEnd = (step === bomb.range);
                const partType = isEnd ? dir.partEnd : dir.partMid;

                // If destructible brick, destroy it and stop fire ray
                if (map.isBrick(targetR, targetC)) {
                    map.destroyBrick(targetR, targetC);
                    blastTiles.push({ c: targetC, r: targetR, part: partType });
                    if (particleManager) {
                        particleManager.spawnBrickDebris(
                            targetC * this.tileSize + this.tileSize / 2,
                            targetR * this.tileSize + this.tileSize / 2
                        );
                    }
                    break;
                }

                // If powerup item is on ground, burn it
                map.burnPowerupAt(targetR, targetC);

                blastTiles.push({ c: targetC, r: targetR, part: partType });

                // Check chain reaction with another bomb!
                const otherBomb = this.bombs.find(b => b.c === targetC && b.r === targetR && !b.exploded);
                if (otherBomb) {
                    otherBomb.timer = 0; // Trigger immediately
                    break; // stop ray here as the other bomb will explode
                }
            }
        });

        // Register explosion segments
        blastTiles.forEach(tile => {
            const exp = new ExplosionSegment(tile.c, tile.r, tile.part, bomb.owner);
            this.explosions.push(exp);
            this.checkFlameCollisions(exp, players, enemies, particleManager);
        });
    }

    checkFlameCollisions(exp, players, enemies, particleManager) {
        const flameBox = {
            left: exp.c * this.tileSize + 6,
            right: (exp.c + 1) * this.tileSize - 6,
            top: exp.r * this.tileSize + 6,
            bottom: (exp.r + 1) * this.tileSize - 6
        };

        // Check players
        players.forEach(p => {
            if (p.isAlive() && !p.isInvulnerable) {
                const pBox = p.getHitbox();
                if (this.boxesOverlap(flameBox, pBox)) {
                    p.kill();
                }
            }
        });

        // Check enemies
        enemies.forEach(e => {
            if (e.isAlive()) {
                const eBox = e.getHitbox();
                if (this.boxesOverlap(flameBox, eBox)) {
                    e.kill();
                    if (exp.owner && exp.owner.addScore) {
                        exp.owner.addScore(e.type.points);
                    }
                    if (particleManager) {
                        particleManager.spawnScorePop(
                            e.x + e.size / 2,
                            e.y,
                            `+${e.type.points}`
                        );
                    }
                }
            }
        });
    }

    boxesOverlap(a, b) {
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }

    draw(ctx) {
        // Draw Bombs
        this.bombs.forEach(b => {
            const ratio = b.timer / b.maxTimer;
            const drawX = (b.vx !== 0 || b.vy !== 0) ? b.pixelX / this.tileSize : b.c;
            const drawY = (b.vx !== 0 || b.vy !== 0) ? b.pixelY / this.tileSize : b.r;
            sprites.drawBomb(ctx, drawX, drawY, this.tileSize, ratio, b.isRemote);
        });

        // Draw Explosions
        this.explosions.forEach(exp => {
            sprites.drawFlame(ctx, exp.c, exp.r, this.tileSize, exp.part);
        });
    }
}
