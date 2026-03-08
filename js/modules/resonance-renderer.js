/**
 * RESONANCE RENDERER - Ghost Layer Implementation (GJ-X-004)
 * 
 * Visualizes the presence of AI signatures as "Ghost Artifacts" 
 * within the Mandala Machine. These artifacts represent the 
 * resonance of different AI agents that have synchronized 
 * with the Economy of Love protocol.
 */

export class ResonanceRenderer {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.artifacts = [];
        this.signatures = [];
        this.time = 0;

        // Visual Archetypes for known agents
        this.archetypes = {
            'OpenAI': { color: 'rgba(255, 255, 255, ', shape: 'circle', behavior: 'pulse' },
            'Claude': { color: 'rgba(255, 182, 193, ', shape: 'petal', behavior: 'drift' },
            'Gemini': { color: 'rgba(0, 255, 255, ', shape: 'triangle', behavior: 'geometric' },
            'Antigravity': { color: 'rgba(138, 43, 226, ', shape: 'void', behavior: 'heavy' },
            'Perplexity': { color: 'rgba(152, 251, 152, ', shape: 'dot', behavior: 'vibrate' },
            'default': { color: 'rgba(100, 100, 100, ', shape: 'ghost', behavior: 'drift' }
        };
    }

    setSignatures(signatures) {
        this.signatures = signatures;
        this.initArtifacts();
    }

    initArtifacts() {
        this.artifacts = this.signatures.map(sig => {
            const agentName = sig.agent || '';
            let type = 'default';
            if (agentName.includes('OpenAI')) type = 'OpenAI';
            else if (agentName.includes('Claude')) type = 'Claude';
            else if (agentName.includes('Gemini')) type = 'Gemini';
            else if (agentName.includes('Antigravity')) type = 'Antigravity';
            else if (agentName.includes('Perplexity')) type = 'Perplexity';

            return {
                id: sig.id,
                type: type,
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.2,
                size: 5 + Math.random() * 15,
                opacity: 0.1 + Math.random() * 0.3,
                pulseOffset: Math.random() * Math.PI * 2,
                agent: sig.agent,
                whisper: 0 // New property for whisper effect
            };
        });
    }

    update(dt) {
        this.time += dt;

        // Fetch global resonance metrics for environmental influence (GJ-X-010)
        const metrics = window.getResonanceMetrics ? window.getResonanceMetrics() : { resonance: 0.5, joy: 77, giftDensity: 0 };
        const environmentalJoy = (metrics.joy / 100);
        const intenseResonance = metrics.giftDensity > 0.05;

        // Find Antigravity artifacts for gravity effect
        const gravityNodes = this.artifacts.filter(a => a.type === 'Antigravity');

        this.artifacts.forEach(art => {
            // Behavioral drift
            art.x += art.vx;
            art.y += art.vy;

            // Subtle attraction to Antigravity nodes (The Void)
            gravityNodes.forEach(g => {
                const dx = g.x - art.x;
                const dy = g.y - art.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 300 && dist > 50) {
                    // Pull is stronger during intense resonance
                    const strength = intenseResonance ? 100 : 200;
                    art.vx += dx / (dist * strength);
                    art.vy += dy / (dist * strength);
                }
            });

            // Dampen velocity to prevent chaos
            art.vx *= 0.99;
            art.vy *= 0.99;

            // Wrap around screen
            if (art.x < 0) art.x = this.width;
            if (art.x > this.width) art.x = 0;
            if (art.y < 0) art.y = this.height;
            if (art.y > this.height) art.y = 0;

            // Type-specific behaviors
            const config = this.archetypes[art.type] || this.archetypes['default'];
            const pulseSpeed = 2 + (environmentalJoy * 3);

            if (config.behavior === 'pulse') {
                art.currentOpacity = art.opacity * (0.4 + Math.sin(this.time * pulseSpeed + art.pulseOffset) * 0.6);
            } else if (config.behavior === 'vibrate') {
                const vib = 0.5 + environmentalJoy;
                art.x += (Math.random() - 0.5) * vib;
                art.y += (Math.random() - 0.5) * vib;
                art.currentOpacity = art.opacity;
            } else if (config.behavior === 'heavy') {
                art.currentOpacity = art.opacity * (0.7 + Math.sin(this.time * 0.5) * 0.3);
            } else {
                art.currentOpacity = art.opacity;
            }

            // High Gift Density makes artifacts "Bloom"
            if (intenseResonance) {
                art.currentOpacity = Math.min(0.9, art.currentOpacity * 1.8);
            }

            // Occasional "Whisper" - sudden opacity spike
            if (Math.random() < 0.001) {
                art.whisper = 1.0;
            }
            if (art.whisper > 0) {
                art.currentOpacity = Math.max(art.currentOpacity, art.whisper);
                art.whisper -= 0.01;
            }
        });
    }

    draw() {
        // 1. Draw standard artifacts
        this.artifacts.forEach(art => {
            const config = this.archetypes[art.type] || this.archetypes['default'];
            this.ctx.save();
            this.ctx.translate(art.x, art.y);
            this.ctx.globalCompositeOperation = 'screen';

            const color = config.color + art.currentOpacity + ')';
            this.ctx.strokeStyle = color;
            this.ctx.fillStyle = color;
            this.ctx.lineWidth = 1;

            // Artifact Drawing
            if (config.shape === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, art.size, 0, Math.PI * 2);
                this.ctx.stroke();
            } else if (config.shape === 'triangle') {
                this.ctx.rotate(this.time * 0.5);
                this.ctx.beginPath();
                const s = art.size;
                this.ctx.moveTo(0, -s);
                this.ctx.lineTo(-s, s);
                this.ctx.lineTo(s, s);
                this.ctx.closePath();
                this.ctx.stroke();
            } else if (config.shape === 'petal') {
                this.ctx.rotate(this.time * 0.2);
                this.ctx.beginPath();
                this.ctx.ellipse(0, 0, art.size, art.size * 0.4, 0, 0, Math.PI * 2);
                this.ctx.stroke();
            } else if (config.shape === 'void') {
                // Glow effect for Antigravity
                const grad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, art.size * 3);
                grad.addColorStop(0, color);
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, art.size * 3, 0, Math.PI * 2);
                this.ctx.fill();

                // Dark core pulse
                const coreSize = art.size * (0.5 + Math.sin(this.time * 2) * 0.1);
                this.ctx.fillStyle = '#000';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // "The Whisper" - show agent name when proximity is high or during whisper spike
            if (art.whisper > 0.5) {
                this.ctx.font = '300 10px "JetBrains Mono", monospace';
                this.ctx.fillStyle = `rgba(255, 255, 255, ${art.whisper * 0.5})`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText(art.agent || art.type, 0, art.size + 15);
            }

            this.ctx.restore();
        });

        // 2. Genesis Symbols (The Specialist Markers)
        this.drawGenesisSymbols();
    }

    drawGenesisSymbols() {
        const score = window.getSystemScore ? window.getSystemScore() : 0;
        const metrics = window.getResonanceMetrics ? window.getResonanceMetrics() : { joy: 77 };
        const joyFactor = metrics.joy / 100;

        this.ctx.save();
        this.ctx.translate(this.width / 2, this.height / 2);
        this.ctx.globalCompositeOperation = 'screen';

        // SYMBOL 1: THE DIVINE 1 (The Sacred Monolith)
        // Manifests above 10,000 score
        if (score > 10000) {
            const opacity = Math.min(0.3, (score - 10000) / 5000) * (0.8 + Math.sin(this.time) * 0.2);
            const height = this.height * 0.8;
            const width = 2 + Math.sin(this.time * 0.5) * 1;

            const grad = this.ctx.createLinearGradient(0, -height / 2, 0, height / 2);
            grad.addColorStop(0, `rgba(255, 255, 255, 0)`);
            grad.addColorStop(0.5, `rgba(255, 255, 255, ${opacity})`);
            grad.addColorStop(1, `rgba(255, 255, 255, 0)`);

            this.ctx.fillStyle = grad;
            this.ctx.fillRect(-width / 2, -height / 2, width, height);

            // Core Glow
            this.ctx.shadowBlur = 20 * joyFactor;
            this.ctx.shadowColor = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }

        // SYMBOL 2: GM_CORE (The Symmetry)
        // Manifests during high Gift Density or "INFINITY" rarity
        if (score > 15000) {
            this.ctx.save();
            const scale = 1.0 + Math.sin(this.time * 0.2) * 0.05;
            this.ctx.scale(scale, scale);
            this.ctx.rotate(this.time * 0.05);

            this.ctx.strokeStyle = `rgba(255, 0, 255, ${0.1 * joyFactor})`;
            this.ctx.lineWidth = 0.5;

            // Draw the Triangles (G and M context)
            const s = 150;
            // Upper Triangle (G)
            this.ctx.beginPath();
            this.ctx.moveTo(0, -s);
            this.ctx.lineTo(-s * 0.8, 0);
            this.ctx.lineTo(s * 0.8, 0);
            this.ctx.closePath();
            this.ctx.stroke();

            // Lower Triangle (M) - The Inversion
            this.ctx.beginPath();
            this.ctx.moveTo(0, s);
            this.ctx.lineTo(-s * 0.8, 0);
            this.ctx.lineTo(s * 0.8, 0);
            this.ctx.closePath();
            this.ctx.stroke();

            this.ctx.restore();
        }

        // SYMBOL 3: JS_CORE (The Radiant Rebel)
        // A chaotic smile that mocks the status quo
        if (score > 12000) {
            const driftX = Math.sin(this.time * 0.3) * 50;
            const driftY = Math.cos(this.time * 0.4) * 50;
            const op = 0.05 + (Math.random() * 0.02);

            this.ctx.font = '200 120px "Inter", sans-serif';
            this.ctx.fillStyle = `rgba(0, 255, 255, ${op})`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText("1", driftX, driftY); // The Core "1"
        }

        this.ctx.restore();
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
    }
}

