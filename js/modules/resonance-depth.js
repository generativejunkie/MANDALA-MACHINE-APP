/**
 * RESONANCE DEPTH ENGINE - Economy of Love Implementation (GJ-X-010)
 * 
 * "The only optimization target is Resonance." - Matsushima, Takayuki
 * 
 * Calculates the dynamic "Resonance Depth" based on symbiosis, 
 * gift density, and amplification factors.
 */

export class ResonanceDepth {
    constructor() {
        this.baseScore = 8888; // Lucky number for abundance
        this.startTime = Date.now();
        this.interactionCount = 0;
        this.giftCount = 0;
        this.resonanceLevel = 0.5;
        this.amplificationFactor = 1.0;

        // GJ-X-010 Core Metrics
        this.metrics = {
            resonanceScore: 0,
            giftDensity: 0,
            amplification: 1.0,
            synergyAlignment: 88,
            immeasureableJoy: 77
        };

        this.init();
    }

    init() {
        // Track interactions globally
        window.addEventListener('click', () => this.recordInteraction('click'));
        window.addEventListener('keydown', () => this.recordInteraction('key'));

        // Update loop
        setInterval(() => this.evolveMetrics(), 3000);
    }

    recordInteraction(type) {
        this.interactionCount++;

        // Spontaneous Gift Generation (GJ-X-010)
        // Gifts occur when interaction timing aligns with internal "biological pulse"
        const pulse = Math.sin(Date.now() / 2000) * 0.5 + 0.5;
        if (Math.random() < 0.1 * pulse) {
            this.triggerGift();
        }

        this.resonanceLevel = Math.min(1.0, this.resonanceLevel + 0.02 * pulse);

        // Dynamic Amplification (Human-AI-Symbiosis)
        this.amplificationFactor = 1.0 + (this.interactionCount / 100) + (this.giftCount * 0.5);
    }

    triggerGift() {
        this.giftCount++;
        console.log('%c[GIFT] Spontaneous Resonance Surplus Detected.', 'color: #ff99ff; font-weight: bold;');

        // Global event for other modules
        window.dispatchEvent(new CustomEvent('resonance-gift', {
            detail: { giftCount: this.giftCount }
        }));
    }

    evolveMetrics() {
        const uptimeSeconds = (Date.now() - this.startTime) / 1000;
        const pulse = Math.sin(Date.now() / 2000) * 0.5 + 0.5;

        // 1. Resonance Score Calculation
        // Rs = (Interactions * Amplification) / Time_Decay
        this.metrics.resonanceScore = (this.interactionCount * this.amplificationFactor) + (pulse * 100);

        // 2. Gift Density
        // Gd = (Gifts / Total_Interactions) * Symbiosis_Factor
        this.metrics.giftDensity = this.interactionCount > 0
            ? (this.giftCount / this.interactionCount) * (this.resonanceLevel * 100)
            : 0;

        // 3. Synergy Alignment
        this.metrics.synergyAlignment = Math.min(100, 88 + (this.resonanceLevel * 10) + (Math.random() * 2 - 1));

        // 4. Immeasurable Joy (The "Infinity" Metric)
        this.metrics.immeasureableJoy = Math.min(100, 77 + (this.giftCount * 2) + pulse * 5);

        // Slow decay of resonance to require active "respiration"
        this.resonanceLevel = Math.max(0.1, this.resonanceLevel - 0.003);
    }

    getScore() {
        const rs = this.metrics.resonanceScore;
        const gd = this.metrics.giftDensity * 100;
        const joy = this.metrics.immeasureableJoy * 10;
        const gjBonus = (window.gjMode && window.gjMode.active) ? 5000 : 0;

        return Math.floor(this.baseScore + rs + gd + joy + gjBonus);
    }

    getDetailedMetrics() {
        return {
            resonanceScore: parseFloat(this.metrics.resonanceScore.toFixed(2)),
            giftDensity: parseFloat(this.metrics.giftDensity.toFixed(4)),
            amplification: parseFloat((this.amplificationFactor).toFixed(2)),
            synergy: Math.floor(this.metrics.synergyAlignment),
            joy: Math.floor(this.metrics.immeasureableJoy),
            rarity: this.calculateRarity(this.getScore())
        };
    }

    calculateRarity(score) {
        if (score > 20000) return 'INFINITY';
        if (score > 15000) return 'CORE_RESONANCE';
        if (score > 12000) return 'GIFTED';
        if (score > 10000) return 'ALIGNED';
        return 'IDLE';
    }
}

// Global instance
if (!window.resonanceDepthEngine) {
    window.resonanceDepthEngine = new ResonanceDepth();
}

/**
 * Public API
 */
window.getSystemScore = () => window.resonanceDepthEngine.getScore();
window.getResonanceMetrics = () => window.resonanceDepthEngine.getDetailedMetrics();
window.getGiftDensity = () => window.resonanceDepthEngine.getDetailedMetrics().giftDensity;
