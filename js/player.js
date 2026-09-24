/**
 * Bomberman Player Class
 * Handles input, smooth corner-sliding movement, powerup stats, bomb placement, and animation.
 */
class Player {
    constructor(playerNum = 1, startC = 1, startR = 1, controls = {}, tileSize = TILE_SIZE) {
        this.playerNum = playerNum;
        this.tileSize = tileSize;
        this.startC = startC;
        this.startR = startR;

        // Visual and collision size
        this.size = tileSize;
        this.hitboxSize = tileSize * 0.72; // forgiving hitbox for smooth movement
        this.x = startC * tileSize;
        this.y = startR * tileSize;

        // Movement
        this.baseSpeed = 2.5;
        this.speed = this.baseSpeed;
        this.facing = 'down';
        this.isMoving = false;

        // Powerups & Stats
        this.maxBombs = 1;
        this.activeBombs = 0;
        this.fireRange = 1;
        this.hasKick = false;
        this.hasRemote = false;

        // State
        this.lives = 3;
        this.score = 0;
        this.isDead = false;
        this.deathTimer = 0;
        this.isInvulnerable = false;
        this.invulnerableTimer = 0;

        // Bomb tile overlap tracking (so player can walk off the bomb they just placed)
        this.overlappingBombs = new Set();

        // Control key codes
        this.controls = Object.assign({
            up: 'KeyW',
            down: 'KeyS',
            left: 'KeyA',
            right: 'KeyD',
            bomb: 'Space',
            action: 'KeyE'
        }, controls);
    }

    resetPosition(c = this.startC, r = this.startR) {
        this.x = c * this.tileSize;
        this.y = r * this.tileSize;
        this.facing = 'down';
        this.isMoving = false;
        this.isDead = false;
        this.deathTimer = 0;
        this.activeBombs = 0;
        this.overlappingBombs.clear();
        this.setInvulnerable(120); // 2 seconds spawn grace period
    }

    resetStats() {
        this.maxBombs = 1;
        this.activeBombs = 0;
        this.fireRange = 1;
        this.speed = this.baseSpeed;
        this.hasKick = false;
        this.hasRemote = false;
        this.lives = 3;
        this.score = 0;
        this.resetPosition();
    }

    setInvulnerable(frames = 120) {
        this.isInvulnerable = true;
        this.invulnerableTimer = frames;
    }

    isAlive() {
        return !this.isDead;
    }

    kill() {
        if (this.isDead || this.isInvulnerable) return;
        this.isDead = true;
        this.deathTimer = 60;
        this.lives--;
        audio.playPlayerDeath();
    }

    addScore(pts) {
        this.score += pts;
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
            top: this.y + offset + 4, // slight top offset for head
            bottom: this.y + offset + this.hitboxSize
        };
    }

    // Apply collected powerup
    applyPowerup(typeKey, particleManager) {
        audio.playPowerup();
        const pDef = (typeof getPowerupDef === 'function') ? getPowerupDef(typeKey) : POWERUP_TYPES.BOMB_UP;
        let popText = pDef.name.toUpperCase() + '!';

        switch (typeKey) {
            case POWERUP_TYPES.BOMB_UP.id:
                this.maxBombs = Math.min(8, this.maxBombs + 1);
                this.addScore(100);
                popText = `+1 BOMB! (CAP: ${this.maxBombs})`;
                break;
            case POWERUP_TYPES.FIRE_UP.id:
                this.fireRange = Math.min(8, this.fireRange + 1);
                this.addScore(100);
                popText = `FIRE RANGE +1! (${this.fireRange})`;
                break;
            case POWERUP_TYPES.SPEED_UP.id:
                this.speed = Math.min(4.8, this.speed + 0.45);
                this.addScore(100);
                popText = 'SPEED UP!';
                break;
            case POWERUP_TYPES.HEALTH_UP.id:
                this.lives = Math.min(5, this.lives + 1);
                this.addScore(200);
                popText = `❤️ EXTRA LIFE! (${this.lives} LIVES)`;
                break;
            case POWERUP_TYPES.SHIELD.id:
                this.setInvulnerable(600); // 10 seconds of shield!
                this.addScore(200);
                popText = 'SHIELD ACTIVE!';
                break;
            case POWERUP_TYPES.KICK.id:
                this.hasKick = true;
                this.addScore(200);
                popText = 'BOMB KICK!';
                break;
            case POWERUP_TYPES.REMOTE.id:
                this.hasRemote = true;
                this.addScore(200);
                popText = 'REMOTE DETONATOR! [E]';
                break;
        }

        if (particleManager) {
            particleManager.spawnScorePop(this.x + this.size / 2, this.y - 12, popText, pDef.color);
        }
    }

    update(inputManager, map, bombManager, enemies, particleManager) {
        // Keep activeBombs strictly synchronized with actual live bombs on map
        this.activeBombs = bombManager.bombs.filter(b => b.owner === this && !b.exploded).length;

        // Invulnerability countdown
        if (this.isInvulnerable) {
            this.invulnerableTimer--;
            if (this.invulnerableTimer <= 0) {
                this.isInvulnerable = false;
            }
        }

        // Death countdown
        if (this.isDead) {
            this.deathTimer--;
            return;
        }

        // Determine intended movement
        let dx = 0;
        let dy = 0;

        if (inputManager.isDown(this.controls.up)) {
            dy -= 1;
            this.facing = 'up';
        } else if (inputManager.isDown(this.controls.down)) {
            dy += 1;
            this.facing = 'down';
        } else if (inputManager.isDown(this.controls.left)) {
            dx -= 1;
            this.facing = 'left';
        } else if (inputManager.isDown(this.controls.right)) {
            dx += 1;
            this.facing = 'right';
        }

        this.isMoving = (dx !== 0 || dy !== 0);

        if (this.isMoving) {
            this.move(dx, dy, map, bombManager);
        }

        // Check powerup pickup
        const currentTile = this.getTileCoord();
        const collected = map.collectPowerupAt(currentTile.r, currentTile.c);
        if (collected) {
            this.applyPowerup(collected, particleManager);
        }

        // Standard timed bomb placement
        if (inputManager.isJustPressed(this.controls.bomb)) {
            this.tryDropBomb(bombManager, false);
        }

        // Remote weapon action: if player has Remote Detonator
        if (this.hasRemote && inputManager.isJustPressed(this.controls.action)) {
            const hasLiveRemote = bombManager.bombs.some(b => b.owner === this && b.isRemote && !b.exploded);
            if (hasLiveRemote) {
                // Detonate the placed remote bomb!
                bombManager.detonateRemoteBombs(this);
            } else {
                // Plant a specialized Remote Bomb!
                this.tryDropBomb(bombManager, true);
            }
        }

        // Clean up overlapping bombs once player walks off them
        this.updateOverlappingBombs(bombManager.bombs);
    }

    tryDropBomb(bombManager, isRemote = false) {
        // Recount live bombs placed by this player
        this.activeBombs = bombManager.bombs.filter(b => b.owner === this && !b.exploded).length;
        if (this.activeBombs >= this.maxBombs) return;

        const tile = this.getTileCoord();
        const bomb = bombManager.placeBomb(tile.c, tile.r, this, isRemote);
        if (bomb) {
            this.overlappingBombs.add(bomb);
            this.activeBombs = bombManager.bombs.filter(b => b.owner === this && !b.exploded).length;
        }
    }

    updateOverlappingBombs(bombs) {
        const pBox = this.getHitbox();
        for (const bomb of Array.from(this.overlappingBombs)) {
            const bBox = {
                left: bomb.c * this.tileSize,
                right: (bomb.c + 1) * this.tileSize,
                top: bomb.r * this.tileSize,
                bottom: (bomb.r + 1) * this.tileSize
            };
            // If player has stepped completely off the bomb tile, remove from safe overlap
            if (pBox.right <= bBox.left || pBox.left >= bBox.right ||
                pBox.bottom <= bBox.top || pBox.top >= bBox.bottom) {
                this.overlappingBombs.delete(bomb);
            }
        }
    }

    // Smooth movement with corner sliding
    move(dx, dy, map, bombManager) {
        const moveDist = this.speed;

        // Axis-independent movement
        if (dx !== 0) {
            const newX = this.x + dx * moveDist;
            if (!this.checkCollision(newX, this.y, map, bombManager, dx, 0)) {
                this.x = newX;
            } else {
                // Corner-sliding helper for horizontal movement
                const currentCenterY = this.y + this.size / 2;
                const tileCenterY = Math.floor(currentCenterY / this.tileSize) * this.tileSize + this.tileSize / 2;
                const diffY = currentCenterY - tileCenterY;
                const slideThreshold = this.tileSize * 0.38;

                if (Math.abs(diffY) > 2 && Math.abs(diffY) < slideThreshold) {
                    // Slide vertically towards center to turn the corner!
                    const slideDir = diffY > 0 ? -1 : 1;
                    const slideY = this.y + slideDir * Math.min(this.speed * 0.8, Math.abs(diffY));
                    if (!this.checkCollision(this.x, slideY, map, bombManager, 0, 0)) {
                        this.y = slideY;
                    }
                }
            }
        }

        if (dy !== 0) {
            const newY = this.y + dy * moveDist;
            if (!this.checkCollision(this.x, newY, map, bombManager, 0, dy)) {
                this.y = newY;
            } else {
                // Corner-sliding helper for vertical movement
                const currentCenterX = this.x + this.size / 2;
                const tileCenterX = Math.floor(currentCenterX / this.tileSize) * this.tileSize + this.tileSize / 2;
                const diffX = currentCenterX - tileCenterX;
                const slideThreshold = this.tileSize * 0.38;

                if (Math.abs(diffX) > 2 && Math.abs(diffX) < slideThreshold) {
                    // Slide horizontally towards center to turn the corner!
                    const slideDir = diffX > 0 ? -1 : 1;
                    const slideX = this.x + slideDir * Math.min(this.speed * 0.8, Math.abs(diffX));
                    if (!this.checkCollision(slideX, this.y, map, bombManager, 0, 0)) {
                        this.x = slideX;
                    }
                }
            }
        }
    }

    checkCollision(targetX, targetY, map, bombManager, moveDx = 0, moveDy = 0) {
        const offset = (this.size - this.hitboxSize) / 2;
        const box = {
            left: targetX + offset,
            right: targetX + offset + this.hitboxSize,
            top: targetY + offset + 4,
            bottom: targetY + offset + this.hitboxSize
        };

        const minC = Math.floor(box.left / this.tileSize);
        const maxC = Math.floor(box.right / this.tileSize);
        const minR = Math.floor(box.top / this.tileSize);
        const maxR = Math.floor(box.bottom / this.tileSize);

        // Check map boundaries & walls/bricks
        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                if (map.isBlocked(r, c)) {
                    return true;
                }
            }
        }

        // Check solid bombs
        for (const bomb of bombManager.bombs) {
            // Ignore bombs the player is still standing inside after dropping
            if (this.overlappingBombs.has(bomb)) continue;

            const bBox = {
                left: bomb.c * this.tileSize,
                right: (bomb.c + 1) * this.tileSize,
                top: bomb.r * this.tileSize,
                bottom: (bomb.r + 1) * this.tileSize
            };

            const overlaps = (box.left < bBox.right && box.right > bBox.left &&
                              box.top < bBox.bottom && box.bottom > bBox.top);

            if (overlaps) {
                // If player has Kick ability and runs directly into a bomb, kick it!
                if (this.hasKick && (moveDx !== 0 || moveDy !== 0) && bomb.vx === 0 && bomb.vy === 0) {
                    bomb.kick(moveDx, moveDy);
                }
                return true;
            }
        }

        return false;
    }

    draw(ctx) {
        sprites.drawPlayer(ctx, this);
    }
}
