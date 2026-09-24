/**
 * Web Audio API Sound and Chiptune Music Generator
 * Completely zero external sound dependencies!
 */
class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterVolume = 0.5;
        this.sfxVolume = 0.6;
        this.musicVolume = 0.25;
        this.isMuted = false;
        this.isPlayingBGM = false;
        this.bgmInterval = null;
        this.musicStep = 0;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted && this.isPlayingBGM) {
            this.pauseBGM();
            this.isPlayingBGM = true; // keep intended state
        } else if (!this.isMuted && this.isPlayingBGM) {
            this.startBGM();
        }
        return this.isMuted;
    }

    // Play a synthesizer tone with envelope
    playTone(freq, type = 'square', duration = 0.1, gainVal = 0.2, pitchBend = 0) {
        if (this.isMuted) return;
        this.init();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (pitchBend !== 0) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(10, freq + pitchBend), this.ctx.currentTime + duration);
        }

        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(gainVal * this.sfxVolume * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
    }

    // Play white/pink noise burst for explosions or impacts
    playNoise(duration = 0.3, filterFreq = 600, gainVal = 0.5) {
        if (this.isMuted) return;
        this.init();

        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + duration);

        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(gainVal * this.sfxVolume * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);
        noise.stop(now + duration);
    }

    // Specific Game SFX
    playBombPlace() {
        this.playTone(320, 'sine', 0.08, 0.3, -120);
    }

    playFuseTick() {
        this.playTone(800, 'triangle', 0.02, 0.08, 0);
    }

    playExplosion() {
        // Deep rumble + noise burst
        this.playNoise(0.5, 900, 0.8);
        this.playTone(150, 'sawtooth', 0.45, 0.5, -90);
    }

    playPowerup() {
        if (this.isMuted) return;
        this.init();
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 'triangle', 0.12, 0.3);
            }, idx * 60);
        });
    }

    playEnemyHit() {
        this.playTone(450, 'sawtooth', 0.15, 0.4, -200);
    }

    playPlayerDeath() {
        if (this.isMuted) return;
        this.init();
        const tones = [440, 392, 349, 311, 261, 220, 164];
        tones.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 'sawtooth', 0.16, 0.35, -40);
            }, idx * 90);
        });
    }

    playLevelClear() {
        if (this.isMuted) return;
        this.init();
        // Upbeat victory fanfare
        const fanfare = [
            { f: 523.25, d: 0.1 },  // C5
            { f: 523.25, d: 0.1 },  // C5
            { f: 523.25, d: 0.1 },  // C5
            { f: 659.25, d: 0.25 }, // E5
            { f: 783.99, d: 0.15 }, // G5
            { f: 1046.5, d: 0.4 }   // C6
        ];
        let delay = 0;
        fanfare.forEach(item => {
            setTimeout(() => {
                this.playTone(item.f, 'square', item.d, 0.3);
            }, delay);
            delay += item.d * 1000 + 30;
        });
    }

    playKick() {
        this.playTone(280, 'triangle', 0.1, 0.3, 150);
    }

    // 8-Bit Retro Chiptune Loop
    startBGM() {
        if (this.bgmInterval) return;
        this.isPlayingBGM = true;
        if (this.isMuted) return;
        this.init();

        // 16-step upbeat energetic melody & bass
        const bassLine = [
            130.81, 130.81, 164.81, 130.81, 
            146.83, 146.83, 174.61, 146.83,
            164.81, 164.81, 196.00, 164.81, 
            174.61, 196.00, 220.00, 196.00
        ];
        const melody = [
            523.25, 0, 659.25, 523.25, 
            587.33, 0, 698.46, 587.33,
            659.25, 783.99, 659.25, 0, 
            698.46, 783.99, 880.00, 783.99
        ];

        this.musicStep = 0;
        const tempoMs = 150; // ~100 BPM 16th notes

        this.bgmInterval = setInterval(() => {
            if (this.isMuted) return;

            const bFreq = bassLine[this.musicStep % bassLine.length];
            const mFreq = melody[this.musicStep % melody.length];

            if (bFreq > 0) {
                this.playTone(bFreq, 'triangle', 0.11, this.musicVolume * 0.7);
            }
            if (mFreq > 0 && Math.random() > 0.1) {
                this.playTone(mFreq, 'square', 0.08, this.musicVolume * 0.5);
            }

            this.musicStep++;
        }, tempoMs);
    }

    pauseBGM() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }

    stopBGM() {
        this.pauseBGM();
        this.isPlayingBGM = false;
        this.musicStep = 0;
    }
}

const audio = new AudioManager();
