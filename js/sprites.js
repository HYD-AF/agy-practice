// Ensure roundRect compatibility for all canvas contexts
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r = 0) {
        if (typeof r === 'number') r = [r, r, r, r];
        this.rect(x, y, w, h);
    };
}

class SpriteRenderer {
    constructor() {
        this.frameCounter = 0;
    }

    tick() {
        this.frameCounter++;
    }

    // Floor tile
    drawFloor(ctx, x, y, size, theme = 'grass') {
        const px = x * size;
        const py = y * size;

        if (theme === 'grass') {
            const isAlt = (x + y) % 2 === 0;
            ctx.fillStyle = isAlt ? '#3ea055' : '#38944d';
            ctx.fillRect(px, py, size, size);

            // Subtle grass tufts
            ctx.fillStyle = isAlt ? '#46b260' : '#338545';
            ctx.fillRect(px + 8, py + 12, 4, 3);
            ctx.fillRect(px + 28, py + 26, 3, 4);
        } else if (theme === 'dungeon') {
            const isAlt = (x + y) % 2 === 0;
            ctx.fillStyle = isAlt ? '#334155' : '#1e293b';
            ctx.fillRect(px, py, size, size);

            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 0.5, py + 0.5, size, size);
        } else if (theme === 'volcano') {
            const isAlt = (x + y) % 2 === 0;
            ctx.fillStyle = isAlt ? '#451a03' : '#3b1603';
            ctx.fillRect(px, py, size, size);

            // Subtle lava veins
            ctx.fillStyle = '#78350f';
            ctx.fillRect(px + 10, py + 18, 6, 2);
            ctx.fillRect(px + 30, py + 8, 4, 2);
        }
    }

    // Indestructible Hard Wall
    drawWall(ctx, x, y, size, theme = 'grass') {
        const px = x * size;
        const py = y * size;

        // Base 3D block
        ctx.fillStyle = '#64748b'; // Main slate
        ctx.fillRect(px, py, size, size);

        // Highlight top and left
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(px, py, size, 4);
        ctx.fillRect(px, py, 4, size);

        // Shadow bottom and right
        ctx.fillStyle = '#334155';
        ctx.fillRect(px, py + size - 4, size, 4);
        ctx.fillRect(px + size - 4, py, 4, size);

        // Center rivet / metal plate or cross
        ctx.fillStyle = '#475569';
        ctx.fillRect(px + 8, py + 8, size - 16, size - 16);

        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(px + 12, py + 12, 4, 4);
        ctx.fillRect(px + size - 16, py + 12, 4, 4);
        ctx.fillRect(px + 12, py + size - 16, 4, 4);
        ctx.fillRect(px + size - 16, py + size - 16, 4, 4);
    }

    // Destructible Soft Brick / Crate
    drawBrick(ctx, x, y, size, crumbleProgress = 0, theme = 'grass') {
        const px = x * size;
        const py = y * size;

        if (crumbleProgress > 0) {
            // Crumbling animation
            ctx.save();
            ctx.globalAlpha = Math.max(0, 1 - crumbleProgress);
            const offset = crumbleProgress * 10;
            ctx.fillStyle = '#b45309';
            ctx.fillRect(px + offset, py - offset * 0.5, size * 0.5, size * 0.5);
            ctx.fillStyle = '#d97706';
            ctx.fillRect(px - offset * 0.5, py + offset, size * 0.5, size * 0.5);
            ctx.restore();
            return;
        }

        // Brick body
        ctx.fillStyle = '#b45309'; // Brick red-brown
        ctx.fillRect(px, py, size, size);

        // Mortar lines (3 rows)
        ctx.fillStyle = '#78350f';
        const rowH = size / 3;
        ctx.fillRect(px, py + rowH - 2, size, 2);
        ctx.fillRect(px, py + rowH * 2 - 2, size, 2);

        // Vertical brick dividers
        ctx.fillRect(px + size / 2, py, 2, rowH);
        ctx.fillRect(px + size / 4, py + rowH, 2, rowH);
        ctx.fillRect(px + (size * 3) / 4, py + rowH, 2, rowH);
        ctx.fillRect(px + size / 2, py + rowH * 2, 2, rowH);

        // Highlights for 3D look
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(px + 2, py + 2, size / 2 - 4, 3);
        ctx.fillRect(px + size / 2 + 2, py + 2, size / 2 - 4, 3);
        ctx.fillRect(px + 2, py + rowH + 2, size / 4 - 4, 3);
        ctx.fillRect(px + size / 4 + 2, py + rowH + 2, size / 2 - 4, 3);
        ctx.fillRect(px + (size * 3) / 4 + 2, py + rowH + 2, size / 4 - 4, 3);
    }

    // Exit Door / Portal
    drawDoor(ctx, x, y, size, isOpen = false) {
        const px = x * size;
        const py = y * size;

        // Door frame
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(px + 4, py + 2, size - 8, size - 2);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 4, py + 2, size - 8, size - 2);

        // Door panel / portal interior
        if (isOpen) {
            // Cosmic swirling portal gradient
            const grad = ctx.createRadialGradient(
                px + size / 2, py + size / 2, 2,
                px + size / 2, py + size / 2, size * 0.45
            );
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.35, '#34d399');
            grad.addColorStop(0.7, '#059669');
            grad.addColorStop(1, '#022c22');

            ctx.fillStyle = grad;
            ctx.fillRect(px + 8, py + 6, size - 16, size - 8);

            // Swirling portal vortex
            const angle = this.frameCounter * 0.08;
            ctx.save();
            ctx.translate(px + size / 2, py + size / 2);
            ctx.rotate(angle);
            ctx.strokeStyle = '#a7f3d0';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, 9, 0, Math.PI * 1.5);
            ctx.stroke();
            ctx.restore();

            // Floating Arrow / Beacon indicator above door
            const bob = Math.sin(this.frameCounter * 0.15) * 3;
            ctx.fillStyle = '#fde047';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.fillText('▼ EXIT', px + size / 2, py - 4 + bob);
            ctx.shadowBlur = 0;
        } else {
            // Locked steel door
            ctx.fillStyle = '#374151';
            ctx.fillRect(px + 8, py + 6, size - 16, size - 8);

            // Lock icon
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(px + size / 2 - 3, py + size / 2, 6, 8);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px + size / 2, py + size / 2 - 1, 4, Math.PI, 0);
            ctx.stroke();
        }
    }

    // Powerup Item
    drawPowerup(ctx, x, y, size, typeKey) {
        const px = x * size;
        const py = y * size;
        const pDef = (typeof getPowerupDef === 'function') ? getPowerupDef(typeKey) : (POWERUP_TYPES[typeKey] || POWERUP_TYPES.BOMB_UP);

        // Floating bounce animation
        const bob = Math.sin(this.frameCounter * 0.12) * 3.5;

        // Outer badge
        ctx.save();
        ctx.shadowColor = pDef.color;
        ctx.shadowBlur = 10;

        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = pDef.color;
        ctx.lineWidth = 3;

        const pad = 7;
        const bx = px + pad;
        const by = py + pad + bob;
        const bSize = size - pad * 2;

        ctx.beginPath();
        ctx.roundRect(bx, by, bSize, bSize, 7);
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // Powerup Icon (Emoji)
        ctx.font = `${Math.floor(size * 0.46)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pDef.icon, px + size / 2, py + size / 2 + bob);
    }

    // Bomb
    drawBomb(ctx, x, y, size, fuseRatio = 1.0, isRemote = false) {
        const px = x * size;
        const py = y * size;
        const centerX = px + size / 2;
        const centerY = py + size / 2 + 3;

        // Pulse scale
        const pulse = 1.0 + Math.sin(this.frameCounter * (isRemote ? 0.35 : 0.25)) * 0.08 * (isRemote ? 1.4 : (1.5 - fuseRatio));
        const radius = (size * 0.36) * pulse;

        // Bomb Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(centerX, py + size - 6, radius * 0.9, radius * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        if (isRemote) {
            // High-Tech Cyber Bomb Body
            const grad = ctx.createRadialGradient(
                centerX - radius * 0.35, centerY - radius * 0.35, radius * 0.1,
                centerX, centerY, radius
            );
            grad.addColorStop(0, '#818cf8');
            grad.addColorStop(0.4, '#4338ca');
            grad.addColorStop(1, '#1e1b4b');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();

            // Glowing Cyber Line
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 0.65, 0, Math.PI * 2);
            ctx.stroke();

            // Remote Antenna Tower
            ctx.fillStyle = '#64748b';
            ctx.fillRect(centerX - 3, centerY - radius - 7, 6, 8);

            // Blinking Beacon LED on antenna tip
            const ledFlash = Math.floor(this.frameCounter / 8) % 2 === 0;
            ctx.fillStyle = ledFlash ? '#ef4444' : '#fde047';
            ctx.shadowColor = ledFlash ? '#ef4444' : '#fde047';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(centerX, centerY - radius - 8, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Signal wave rings expanding outwards
            const ringPulse = (this.frameCounter % 30) / 30;
            ctx.strokeStyle = `rgba(239, 68, 68, ${1 - ringPulse})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(centerX, centerY - radius - 8, 4 + ringPulse * 12, 0, Math.PI * 2);
            ctx.stroke();

            return;
        }

        // Standard timed bomb body gradient (3D sphere)
        const grad = ctx.createRadialGradient(
            centerX - radius * 0.35, centerY - radius * 0.35, radius * 0.1,
            centerX, centerY, radius
        );

        if (fuseRatio < 0.25 && Math.floor(this.frameCounter / 4) % 2 === 0) {
            // Flashing red critical alert
            grad.addColorStop(0, '#fca5a5');
            grad.addColorStop(0.4, '#ef4444');
            grad.addColorStop(1, '#7f1d1d');
        } else {
            grad.addColorStop(0, '#94a3b8');
            grad.addColorStop(0.35, '#334155');
            grad.addColorStop(1, '#020617');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Bomb Cap
        ctx.fillStyle = '#64748b';
        ctx.fillRect(centerX - 4, centerY - radius - 3, 8, 4);

        // Fuse cord
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius);
        ctx.quadraticCurveTo(centerX + 6, centerY - radius - 8, centerX + 10, centerY - radius - 5);
        ctx.stroke();

        // Spark / Flame on fuse
        const sparkColors = ['#fef08a', '#f97316', '#ef4444'];
        const sColor = sparkColors[Math.floor(Math.random() * sparkColors.length)];
        ctx.fillStyle = sColor;
        ctx.beginPath();
        ctx.arc(centerX + 10, centerY - radius - 5, 3 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Explosion Flame Tile
    drawFlame(ctx, x, y, size, part = 'center') {
        const px = x * size;
        const py = y * size;
        const cx = px + size / 2;
        const cy = py + size / 2;

        const flicker = Math.sin(this.frameCounter * 0.5) * 2;

        // Outer Fire gradient
        const grad = ctx.createRadialGradient(cx, cy, 3, cx, cy, size * 0.55);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.25, '#fef08a'); // Yellow
        grad.addColorStop(0.65, '#f97316'); // Orange
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)'); // Red fading to transparent

        ctx.fillStyle = grad;

        if (part === 'center') {
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.48 + flicker, 0, Math.PI * 2);
            ctx.fill();
        } else if (part === 'horizontal' || part === 'left' || part === 'right') {
            const h = size * 0.55 + flicker;
            ctx.fillRect(px, cy - h / 2, size, h);
        } else if (part === 'vertical' || part === 'up' || part === 'down') {
            const w = size * 0.55 + flicker;
            ctx.fillRect(cx - w / 2, py, w, size);
        }

        // Hot center spark
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(cx, cy, 5 + flicker, 0, Math.PI * 2);
        ctx.fill();
    }

    // High-Fidelity Bomberman Player Character
    drawPlayer(ctx, player) {
        const { x, y, size, facing, isMoving, isDead, deathTimer, isInvulnerable, playerNum } = player;

        ctx.save();

        // Invulnerability flashing
        if (isInvulnerable && Math.floor(this.frameCounter / 5) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        // Death spinning/scaling animation
        if (isDead) {
            const progress = deathTimer / 60; // 0 to 1
            ctx.translate(x + size / 2, y + size / 2);
            ctx.rotate(progress * Math.PI * 6);
            ctx.scale(Math.max(0, 1 - progress), Math.max(0, 1 - progress));
            ctx.translate(-(x + size / 2), -(y + size / 2));
        }

        const cx = x + size / 2;
        const cy = y + size / 2;

        // Drop Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(cx, y + size - 3, size * 0.36, size * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();

        // Idle breathing squish & stretch
        const idleBounce = isMoving ? 0 : Math.sin(this.frameCounter * 0.1) * 1;
        const walkCycle = isMoving ? Math.sin(this.frameCounter * 0.35) * 6 : 0;

        // Color palettes
        const isP1 = (playerNum === 1);
        const suitBase = isP1 ? '#f8fafc' : '#0f172a';
        const suitHighlight = isP1 ? '#ffffff' : '#334155';
        const overallColor = isP1 ? '#2563eb' : '#dc2626';
        const accentGlove = isP1 ? '#ef4444' : '#f59e0b';
        const faceSkinColor = '#fed7aa';

        // 1. Shoes / Feet (3D rounded soles with stride)
        ctx.fillStyle = accentGlove;
        // Left Shoe
        ctx.beginPath();
        ctx.ellipse(cx - 9, y + size - 6 - walkCycle, 6, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(cx - 15, y + size - 4 - walkCycle, 12, 2); // Shoe sole

        // Right Shoe
        ctx.fillStyle = accentGlove;
        ctx.beginPath();
        ctx.ellipse(cx + 9, y + size - 6 + walkCycle, 6, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(cx + 3, y + size - 4 + walkCycle, 12, 2); // Shoe sole

        // 2. Body / Overalls
        ctx.fillStyle = overallColor;
        ctx.beginPath();
        ctx.roundRect(cx - size * 0.22, cy + 1 + idleBounce, size * 0.44, size * 0.32, 6);
        ctx.fill();

        // Belt
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(cx - size * 0.22, cy + 9 + idleBounce, size * 0.44, 4);
        // Belt Buckle (Gold 3D shine)
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(cx - 3.5, cy + 8 + idleBounce, 7, 6);

        // 3. Hands / Boxing Gloves (animated arm swing)
        const armSwing = isMoving ? Math.sin(this.frameCounter * 0.35) * 5 : 0;
        ctx.fillStyle = accentGlove;
        // Left Glove
        ctx.beginPath();
        ctx.arc(cx - size * 0.32, cy + 8 + armSwing + idleBounce, 4.5, 0, Math.PI * 2);
        ctx.fill();
        // Right Glove
        ctx.beginPath();
        ctx.arc(cx + size * 0.32, cy + 8 - armSwing + idleBounce, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // 4. Head / 3D Helmet with Glossy Highlight
        const headY = cy - 6 + idleBounce;
        const headRadius = size * 0.28;

        const helmGrad = ctx.createRadialGradient(
            cx - headRadius * 0.35, headY - headRadius * 0.35, 1,
            cx, headY, headRadius
        );
        helmGrad.addColorStop(0, suitHighlight);
        helmGrad.addColorStop(0.7, suitBase);
        helmGrad.addColorStop(1, isP1 ? '#cbd5e1' : '#020617');

        ctx.fillStyle = helmGrad;
        ctx.beginPath();
        ctx.arc(cx, headY, headRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isP1 ? '#94a3b8' : '#475569';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 5. Helmet Pom-pom Antenna
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(cx - 1.5, headY - headRadius - 5, 3, 6);

        const pomGrad = ctx.createRadialGradient(
            cx - 1.5, headY - headRadius - 6, 0.5,
            cx, headY - headRadius - 5, 4.5
        );
        pomGrad.addColorStop(0, '#fca5a5');
        pomGrad.addColorStop(0.7, accentGlove);
        pomGrad.addColorStop(1, '#991b1b');

        ctx.fillStyle = pomGrad;
        ctx.beginPath();
        ctx.arc(cx, headY - headRadius - 5, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // 6. Face Visor Area
        let faceX = cx;
        let faceY = headY + 2;
        if (facing === 'left') faceX -= 3;
        if (facing === 'right') faceX += 3;
        if (facing === 'up') faceY -= 3;

        ctx.fillStyle = faceSkinColor;
        ctx.beginPath();
        ctx.ellipse(faceX, faceY, size * 0.17, size * 0.13, 0, 0, Math.PI * 2);
        ctx.fill();

        // 7. Expressive Animated Eyes (with blinking!)
        if (facing !== 'up') {
            const isBlinking = (this.frameCounter % 220 < 8);
            const eyeOffset = facing === 'left' ? -2 : facing === 'right' ? 2 : 0;

            if (isBlinking) {
                // Closed eye line
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(faceX - 6 + eyeOffset, faceY);
                ctx.lineTo(faceX - 2 + eyeOffset, faceY);
                ctx.moveTo(faceX + 2 + eyeOffset, faceY);
                ctx.lineTo(faceX + 6 + eyeOffset, faceY);
                ctx.stroke();
            } else {
                // Open anime eyes
                ctx.fillStyle = isP1 ? '#0f172a' : '#38bdf8';
                // Left eye
                ctx.beginPath();
                ctx.ellipse(faceX - 4 + eyeOffset, faceY - 1, 2, 4.5, 0, 0, Math.PI * 2);
                ctx.fill();
                // Right eye
                ctx.beginPath();
                ctx.ellipse(faceX + 4 + eyeOffset, faceY - 1, 2, 4.5, 0, 0, Math.PI * 2);
                ctx.fill();

                // Sparkle eye highlight
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(faceX - 5 + eyeOffset, faceY - 3, 1.5, 1.5);
                ctx.fillRect(faceX + 3 + eyeOffset, faceY - 3, 1.5, 1.5);
            }

            // Rosy Cheek blushes
            ctx.fillStyle = 'rgba(244, 114, 182, 0.7)';
            ctx.beginPath();
            ctx.arc(faceX - 7 + eyeOffset, faceY + 4, 2, 0, Math.PI * 2);
            ctx.arc(faceX + 7 + eyeOffset, faceY + 4, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Shield Bubble
        if (isInvulnerable) {
            const glow = (Math.sin(this.frameCounter * 0.2) + 1) * 0.5;
            ctx.strokeStyle = `rgba(168, 85, 247, ${0.7 + glow * 0.3})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.56, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = `rgba(192, 132, 252, ${0.15 + glow * 0.1})`;
            ctx.fill();
        }

        ctx.restore();
    }

    // Enemy Monsters
    drawEnemy(ctx, enemy) {
        const { x, y, size, type, isDead, deathTimer } = enemy;

        ctx.save();

        if (isDead) {
            const progress = deathTimer / 30;
            ctx.globalAlpha = Math.max(0, 1 - progress);
            ctx.translate(x + size / 2, y + size / 2);
            ctx.scale(1 + progress * 0.5, 1 + progress * 0.5);
            ctx.translate(-(x + size / 2), -(y + size / 2));
        }

        const cx = x + size / 2;
        const cy = y + size / 2;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(cx, y + size - 4, size * 0.32, size * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();

        const squish = Math.sin(this.frameCounter * 0.2) * 2;

        if (type.id === 'balloom') {
            // Balloom: Classic orange balloon monster
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.ellipse(cx, cy + squish * 0.5, size * 0.36 + squish, size * 0.36 - squish, 0, 0, Math.PI * 2);
            ctx.fill();

            // Big goofy eyes
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(cx - 6, cy - 2, 4, 6, 0, 0, Math.PI * 2);
            ctx.ellipse(cx + 6, cy - 2, 4, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pupils looking towards movement
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(cx - 6 + enemy.dir.x * 2, cy - 2 + enemy.dir.y * 2, 2.5, 0, Math.PI * 2);
            ctx.arc(cx + 6 + enemy.dir.x * 2, cy - 2 + enemy.dir.y * 2, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Big smile
            ctx.strokeStyle = '#7c2d12';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy + 4, 6, 0.1 * Math.PI, 0.9 * Math.PI);
            ctx.stroke();

        } else if (type.id === 'oneal') {
            // Oneal: Blue droplet creature
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 2, size * 0.34, size * 0.38 + squish, 0, 0, Math.PI * 2);
            ctx.fill();

            // Antenna / horn
            ctx.fillStyle = '#60a5fa';
            ctx.beginPath();
            ctx.moveTo(cx - 3, cy - size * 0.35);
            ctx.lineTo(cx + 3, cy - size * 0.35);
            ctx.lineTo(cx, cy - size * 0.48);
            ctx.closePath();
            ctx.fill();

            // Mean single or double eyes
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.ellipse(cx - 5, cy - 3, 3, 5, 0, 0, Math.PI * 2);
            ctx.ellipse(cx + 5, cy - 3, 3, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(cx - 5, cy - 3, 2, 0, Math.PI * 2);
            ctx.arc(cx + 5, cy - 3, 2, 0, Math.PI * 2);
            ctx.fill();

        } else if (type.id === 'kondoria') {
            // Kondoria: Ghost monster (floating purple)
            const floatY = Math.sin(this.frameCounter * 0.15) * 4;
            ctx.fillStyle = 'rgba(168, 85, 247, 0.88)';
            ctx.beginPath();
            ctx.arc(cx, cy - 4 + floatY, size * 0.35, Math.PI, 0);
            // Wavy ghost skirt
            ctx.lineTo(cx + size * 0.35, cy + 12 + floatY);
            ctx.lineTo(cx + size * 0.18, cy + 7 + floatY);
            ctx.lineTo(cx, cy + 13 + floatY);
            ctx.lineTo(cx - size * 0.18, cy + 7 + floatY);
            ctx.lineTo(cx - size * 0.35, cy + 12 + floatY);
            ctx.closePath();
            ctx.fill();

            // Red glowing ghost eyes
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(cx - 6, cy - 4 + floatY, 3, 0, Math.PI * 2);
            ctx.arc(cx + 6, cy - 4 + floatY, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

const sprites = new SpriteRenderer();
