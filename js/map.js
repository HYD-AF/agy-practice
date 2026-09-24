/**
 * GameMap handles the 15x13 grid, obstacles, destructible bricks, powerups, and doors.
 */
class GameMap {
    constructor(cols = COLS, rows = ROWS, tileSize = TILE_SIZE) {
        this.cols = cols;
        this.rows = rows;
        this.tileSize = tileSize;
        this.theme = 'grass';

        this.grid = []; // 2D array of TILE constants
        this.powerups = []; // [{r, c, typeKey}]
        this.hiddenPowerups = {}; // 'r,c' => typeKey
        this.door = { r: 0, c: 0, revealed: false, isOpen: false };
        this.crumblingBricks = []; // [{r, c, progress}]

        // Immediately generate initial arena
        this.generate(1);
    }

    generate(stageNum = 1, mode = GAME_MODE.CAMPAIGN) {
        // Theme selection based on stage
        if (stageNum % 3 === 1) this.theme = 'grass';
        else if (stageNum % 3 === 2) this.theme = 'dungeon';
        else this.theme = 'volcano';

        this.grid = [];
        this.powerups = [];
        this.hiddenPowerups = {};
        this.crumblingBricks = [];
        this.door = { r: 0, c: 0, revealed: false, isOpen: false };

        // 1. Fill base grid
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                // Outer boundaries
                if (r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1) {
                    this.grid[r][c] = TILE.WALL;
                }
                // Inner indestructible pillars (odd row and odd col)
                else if (r % 2 === 0 && c % 2 === 0) {
                    this.grid[r][c] = TILE.WALL;
                }
                else {
                    this.grid[r][c] = TILE.EMPTY;
                }
            }
        }

        // 2. Define safe spawn zones (never place bricks here)
        const safeZones = new Set([
            // Top-left (Player 1)
            '1,1', '1,2', '2,1',
            // Bottom-right (Player 2 / Battle)
            '11,13', '10,13', '11,12',
            // Top-right & Bottom-left (Extra battle spawns)
            '1,13', '1,12', '2,13',
            '11,1', '10,1', '11,2'
        ]);

        // 3. Collect candidates for destructible bricks
        const brickCandidates = [];
        for (let r = 1; r < this.rows - 1; r++) {
            for (let c = 1; c < this.cols - 1; c++) {
                if (this.grid[r][c] === TILE.EMPTY && !safeZones.has(`${r},${c}`)) {
                    brickCandidates.push({ r, c });
                }
            }
        }

        // Shuffle candidates
        for (let i = brickCandidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [brickCandidates[i], brickCandidates[j]] = [brickCandidates[j], brickCandidates[i]];
        }

        // Place bricks in ~65% of candidate spots
        const brickCount = Math.floor(brickCandidates.length * 0.65);
        const placedBricks = brickCandidates.slice(0, brickCount);

        placedBricks.forEach(cell => {
            this.grid[cell.r][cell.c] = TILE.BRICK;
        });

        // 4. Place Exit Door under one random brick (Campaign mode)
        if (mode === GAME_MODE.CAMPAIGN && placedBricks.length > 0) {
            const doorIndex = Math.floor(Math.random() * placedBricks.length);
            const doorCell = placedBricks[doorIndex];
            this.door = { r: doorCell.r, c: doorCell.c, revealed: false, isOpen: false };
        }

        // 5. Hide Powerups under a subset of bricks with guaranteed variety
        const guaranteedTypes = [
            POWERUP_TYPES.BOMB_UP.id,
            POWERUP_TYPES.BOMB_UP.id,
            POWERUP_TYPES.FIRE_UP.id,
            POWERUP_TYPES.FIRE_UP.id,
            POWERUP_TYPES.SPEED_UP.id,
            POWERUP_TYPES.HEALTH_UP.id, // ❤️ Extra Life
            POWERUP_TYPES.SHIELD.id,
            POWERUP_TYPES.KICK.id,
            POWERUP_TYPES.REMOTE.id
        ];

        // Shuffle guaranteed items into available bricks (excluding door cell)
        const eligibleBricks = placedBricks.filter(cell => !(cell.r === this.door.r && cell.c === this.door.c));
        
        // Shuffle eligible bricks
        for (let i = eligibleBricks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [eligibleBricks[i], eligibleBricks[j]] = [eligibleBricks[j], eligibleBricks[i]];
        }

        // Assign guaranteed power-ups
        guaranteedTypes.forEach((pType, idx) => {
            if (idx < eligibleBricks.length) {
                const cell = eligibleBricks[idx];
                this.hiddenPowerups[`${cell.r},${cell.c}`] = pType;
            }
        });

        // For remaining bricks, ~40% chance of random extra powerup
        for (let i = guaranteedTypes.length; i < eligibleBricks.length; i++) {
            if (Math.random() < 0.4) {
                const cell = eligibleBricks[i];
                const randomType = guaranteedTypes[Math.floor(Math.random() * guaranteedTypes.length)];
                this.hiddenPowerups[`${cell.r},${cell.c}`] = randomType;
            }
        }
    }

    revealDoor() {
        this.door.revealed = true;
        this.door.isOpen = true;
        // If door was under a brick, clear the brick
        if (this.isBrick(this.door.r, this.door.c)) {
            this.destroyBrick(this.door.r, this.door.c);
        }
    }

    isWall(r, c) {
        if (!this.grid || r < 0 || r >= this.rows || c < 0 || c >= this.cols) return true;
        if (!this.grid[r]) return true;
        return this.grid[r][c] === TILE.WALL;
    }

    isBrick(r, c) {
        if (!this.grid || r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false;
        if (!this.grid[r]) return false;
        return this.grid[r][c] === TILE.BRICK;
    }

    isBlocked(r, c, canPassBricks = false) {
        if (!this.grid || r < 0 || r >= this.rows || c < 0 || c >= this.cols) return true;
        if (!this.grid[r]) return true;
        const tile = this.grid[r][c];
        if (tile === TILE.WALL) return true;
        if (tile === TILE.BRICK && !canPassBricks) return true;
        return false;
    }

    // Trigger brick destruction and reveal hidden contents
    destroyBrick(r, c) {
        if (!this.isBrick(r, c)) return;

        this.grid[r][c] = TILE.EMPTY;
        this.crumblingBricks.push({ r, c, progress: 0 });

        // Check if door was hidden here
        if (this.door.r === r && this.door.c === c) {
            this.door.revealed = true;
            this.door.isOpen = true; // Secret portal is immediately open and usable!
            return;
        }

        // Check if powerup was hidden here
        const key = `${r},${c}`;
        if (this.hiddenPowerups[key]) {
            const typeKey = this.hiddenPowerups[key];
            delete this.hiddenPowerups[key];
            this.powerups.push({ r, c, typeKey });
        }
    }

    // Powerup collection
    collectPowerupAt(r, c) {
        const index = this.powerups.findIndex(p => p.r === r && p.c === c);
        if (index !== -1) {
            const p = this.powerups[index];
            this.powerups.splice(index, 1);
            return p.typeKey;
        }
        return null;
    }

    // Destroy powerup if hit by explosion
    burnPowerupAt(r, c) {
        const index = this.powerups.findIndex(p => p.r === r && p.c === c);
        if (index !== -1) {
            this.powerups.splice(index, 1);
            return true;
        }
        return false;
    }

    update() {
        // Update crumbling brick animations
        for (let i = this.crumblingBricks.length - 1; i >= 0; i--) {
            this.crumblingBricks[i].progress += 0.05;
            if (this.crumblingBricks[i].progress >= 1.0) {
                this.crumblingBricks.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        if (!this.grid || this.grid.length === 0) return;

        // 1. Draw floor tiles
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                sprites.drawFloor(ctx, c, r, this.tileSize, this.theme);
            }
        }

        // 2. Draw revealed exit door
        if (this.door.revealed) {
            sprites.drawDoor(ctx, this.door.c, this.door.r, this.tileSize, this.door.isOpen);
        }

        // 3. Draw powerups
        this.powerups.forEach(p => {
            sprites.drawPowerup(ctx, p.c, p.r, this.tileSize, p.typeKey);
        });

        // 4. Draw walls & bricks
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.grid[r][c];
                if (tile === TILE.WALL) {
                    sprites.drawWall(ctx, c, r, this.tileSize, this.theme);
                } else if (tile === TILE.BRICK) {
                    sprites.drawBrick(ctx, c, r, this.tileSize, 0, this.theme);
                }
            }
        }

        // 5. Draw crumbling bricks
        this.crumblingBricks.forEach(b => {
            sprites.drawBrick(ctx, b.c, b.r, this.tileSize, b.progress, this.theme);
        });
    }
}
