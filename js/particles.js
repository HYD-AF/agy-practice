/**
 * Particle and Floating Text Effects Engine
 */

class Particle {
    constructor(x, y, vx, vy, color, size, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.maxLife = life;
        this.life = life;
        this.gravity = 0.12;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life--;
        return this.life <= 0;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.restore();
    }
}

class FloatingText {
    constructor(x, y, text, color = '#fbbf24') {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 45;
        this.maxLife = 45;
    }

    update() {
        this.y -= 0.8;
        this.life--;
        return this.life <= 0;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

class ParticleManager {
    constructor() {
        this.particles = [];
        this.texts = [];
    }

    reset() {
        this.particles = [];
        this.texts = [];
    }

    spawnExplosionSparks(x, y) {
        const colors = ['#ffffff', '#fde047', '#f97316', '#ef4444'];
        for (let i = 0; i < 24; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 4.5;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 3 + Math.random() * 4;
            const life = 20 + Math.floor(Math.random() * 25);
            this.particles.push(new Particle(x, y, vx, vy, color, size, life));
        }
    }

    spawnBrickDebris(x, y) {
        const colors = ['#b45309', '#d97706', '#92400e', '#78350f'];
        for (let i = 0; i < 14; i++) {
            const vx = (Math.random() - 0.5) * 4;
            const vy = (Math.random() - 0.7) * 4;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 4 + Math.random() * 5;
            const life = 25 + Math.floor(Math.random() * 20);
            this.particles.push(new Particle(x, y, vx, vy, color, size, life));
        }
    }

    spawnScorePop(x, y, text, color = '#fbbf24') {
        this.texts.push(new FloatingText(x, y, text, color));
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            if (this.particles[i].update()) {
                this.particles.splice(i, 1);
            }
        }
        for (let i = this.texts.length - 1; i >= 0; i--) {
            if (this.texts[i].update()) {
                this.texts.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
        this.texts.forEach(t => t.draw(ctx));
    }
}
