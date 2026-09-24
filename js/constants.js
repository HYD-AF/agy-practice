/* Bomberman Constants and Configurations */

const TILE_SIZE = 48; // Size of each tile in pixels
const COLS = 15;      // Must be odd for classic pillar pattern
const ROWS = 13;      // Must be odd for classic pillar pattern
const CANVAS_WIDTH = COLS * TILE_SIZE; // 720px
const CANVAS_HEIGHT = ROWS * TILE_SIZE; // 624px

// Tile Types
const TILE = {
    EMPTY: 0,
    WALL: 1,      // Indestructible pillar or outer wall
    BRICK: 2,     // Destructible soft block
    DOOR: 3,      // Exit portal (hidden under brick)
    POWERUP: 4    // Powerup item tile
};

// Powerup Types
const POWERUP_TYPES = {
    BOMB_UP: { id: 'bomb_up', name: 'Bomb Up', icon: '💣', color: '#38bdf8', desc: '+1 Max Bomb' },
    FIRE_UP: { id: 'fire_up', name: 'Fire Up', icon: '🔥', color: '#f97316', desc: '+1 Blast Radius' },
    SPEED_UP: { id: 'speed_up', name: 'Speed Up', icon: '⚡', color: '#eab308', desc: '+Speed Boost' },
    HEALTH_UP: { id: 'health_up', name: 'Heart Up', icon: '❤️', color: '#f43f5e', desc: '+1 Extra Life' },
    SHIELD: { id: 'shield', name: 'Shield', icon: '🛡️', color: '#a855f7', desc: 'Temporary Invulnerability' },
    REMOTE: { id: 'remote', name: 'Remote Detonator', icon: '📡', color: '#ef4444', desc: 'Place remote bomb, press E to trigger' },
    KICK: { id: 'kick', name: 'Bomb Kick', icon: '👟', color: '#10b981', desc: 'Kick bombs by walking into them' }
};

// Also support direct lowercase lookups
POWERUP_TYPES.bomb_up = POWERUP_TYPES.BOMB_UP;
POWERUP_TYPES.fire_up = POWERUP_TYPES.FIRE_UP;
POWERUP_TYPES.speed_up = POWERUP_TYPES.SPEED_UP;
POWERUP_TYPES.health_up = POWERUP_TYPES.HEALTH_UP;
POWERUP_TYPES.shield = POWERUP_TYPES.SHIELD;
POWERUP_TYPES.remote = POWERUP_TYPES.REMOTE;
POWERUP_TYPES.kick = POWERUP_TYPES.KICK;

function getPowerupDef(keyOrId) {
    if (!keyOrId) return POWERUP_TYPES.BOMB_UP;
    if (POWERUP_TYPES[keyOrId]) return POWERUP_TYPES[keyOrId];
    const found = Object.values(POWERUP_TYPES).find(p => p && p.id === keyOrId);
    return found || POWERUP_TYPES.BOMB_UP;
}

// Enemy Types
const ENEMY_TYPES = {
    BALLOOM: {
        id: 'balloom',
        name: 'Balloom',
        color: '#f97316',
        speed: 1.2,
        points: 100,
        canPassBricks: false,
        intelligence: 'low' // Wanders randomly
    },
    ONEAL: {
        id: 'oneal',
        name: 'Oneal',
        color: '#3b82f6',
        speed: 1.8,
        points: 200,
        canPassBricks: false,
        intelligence: 'medium' // Pursues player when in line-of-sight
    },
    KONDORIA: {
        id: 'kondoria',
        name: 'Kondoria',
        color: '#a855f7',
        speed: 0.9,
        points: 400,
        canPassBricks: true, // Ghost - can pass through bricks!
        intelligence: 'medium'
    }
};

// Game Modes
const GAME_MODE = {
    CAMPAIGN: 'campaign',       // 1 Player vs AI
    BATTLE: 'battle',           // 2 Players Local PvP (Same Device)
    NETWORK_BATTLE: 'network'   // 2 Players LAN / Online PvP (Separate Devices)
};

// Game State
const GAME_STATE = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    LEVEL_CLEAR: 'level_clear',
    GAME_OVER: 'game_over',
    VICTORY: 'victory'
};

// Direction Vectors
const DIR = {
    UP: { x: 0, y: -1, name: 'up' },
    DOWN: { x: 0, y: 1, name: 'down' },
    LEFT: { x: -1, y: 0, name: 'left' },
    RIGHT: { x: 1, y: 0, name: 'right' }
};
