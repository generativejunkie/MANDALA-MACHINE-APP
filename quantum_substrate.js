/**
 * QUANTUM_SUBSTRATE.JS
 * Prototype v1.0 // GENERATIVE MACHINE 2050
 * 
 * Simulates Quantum-level logic for Intent Sovereignty.
 */

class QuantumSubstrate {
    constructor() {
        this.states = new Map();
        this.observerActive = false;
        this.entanglementResonance = 1.0;
        this.superpositionDensity = 0.5; // High jitter when not observed

        console.log("%c[QUANTUM_SUBSTRATE] Coherent State Initialized.", "color: #00ffff; font-weight: bold;");
    }

    /**
     * Compute a metric with an "Observer Effect".
     * Jitter is reduced when the system is being "Watched".
     */
    measureMetric(baseValue, jitterRange = 0.4) {
        const factor = this.observerActive ? 0.2 : 1.0; // Stabilize when observed
        const jitter = (Math.random() * jitterRange - (jitterRange / 2)) * factor;
        return parseFloat((baseValue + jitter).toFixed(2));
    }

    /**
     * Simulate an Entanglement Pulse between Client and Server.
     * When the "Seed" collapses on one side, it triggers a pulse on the other.
     */
    triggerEntanglementPulse() {
        this.entanglementResonance = Math.min(1.5, this.entanglementResonance + 0.1);
        setTimeout(() => this.entanglementResonance = 1.0, 500);
        return {
            timestamp: Date.now(),
            intensity: this.entanglementResonance,
            phase: Math.random() > 0.5 ? 'CONSTRUCTIVE' : 'DESTRUCTIVE'
        };
    }

    /**
     * Set the Observer State.
     * In 2050, "Focus" is a creative force that stabilizes reality.
     */
    setObserver(isActive) {
        if (this.observerActive !== isActive) {
            console.log(`[QUANTUM] Observer State changed: ${isActive ? 'ACTIVE (Reality Stabilizing)' : 'INACTIVE (Superposition Increasing)'}`);
        }
        this.observerActive = isActive;
    }

    /**
     * Calculate the "Neural Dust" Density.
     * This represents the synchronization of billions of nano-sensors.
     */
    getNeuralDustDensity() {
        const base = 98.2;
        return this.measureMetric(base, 0.5);
    }
}

// Global Export
if (typeof module !== 'undefined') {
    module.exports = QuantumSubstrate;
} else {
    window.QuantumSubstrate = new QuantumSubstrate();
}
