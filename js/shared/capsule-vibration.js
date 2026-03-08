/**
 * Capsule Vibration Controller
 * 
 * Maps audio frequency data to visual vibration effects.
 * Use this with AudioAnalyzer for audio-reactive capsules.
 */

export class CapsuleVibration {
    constructor(options = {}) {
        this.intensity = options.intensity || 1.0;
        this.bassShakeAmount = options.bassShakeAmount || 0.1;
        this.midRotationSpeed = options.midRotationSpeed || 0.05;
        this.highScalePulse = options.highScalePulse || 0.02;
    }

    /**
     * Calculate vibration parameters from frequency data
     * @param {Object} frequencyData - Data from AudioAnalyzer.getFrequencyData()
     * @returns {Object} Vibration parameters { shake, rotation, scale }
     */
    getVibrationParams(frequencyData) {
        const { bass, mid, high } = frequencyData;

        return {
            // Position shake (for x, y offset)
            shake: {
                x: (Math.random() - 0.5) * bass * this.bassShakeAmount * this.intensity,
                y: (Math.random() - 0.5) * bass * this.bassShakeAmount * this.intensity,
                z: (Math.random() - 0.5) * bass * this.bassShakeAmount * this.intensity * 0.5
            },

            // Rotation speed multiplier
            rotation: mid * this.midRotationSpeed * this.intensity,

            // Scale pulsing (1.0 = no change)
            scale: 1.0 + (high * this.highScalePulse * this.intensity)
        };
    }

    /**
     * Apply vibration to a Three.js object
     * @param {THREE.Object3D} object - Three.js object (mesh, group, etc.)
     * @param {Object} frequencyData - Data from AudioAnalyzer
     * @param {Object} baseTransform - Original position/rotation/scale
     */
    applyToThreeJS(object, frequencyData, baseTransform = {}) {
        const params = this.getVibrationParams(frequencyData);

        // Apply shake to position
        if (baseTransform.position) {
            object.position.x = baseTransform.position.x + params.shake.x;
            object.position.y = baseTransform.position.y + params.shake.y;
            object.position.z = baseTransform.position.z + params.shake.z;
        } else {
            object.position.x += params.shake.x;
            object.position.y += params.shake.y;
            object.position.z += params.shake.z;
        }

        // Apply rotation
        if (baseTransform.rotation) {
            object.rotation.y = baseTransform.rotation.y + params.rotation;
        } else {
            object.rotation.y += params.rotation;
        }

        // Apply scale
        const scaleValue = params.scale;
        object.scale.set(scaleValue, scaleValue, scaleValue);
    }

    /**
     * Set vibration intensity
     * @param {number} intensity - 0.0 to 1.0
     */
    setIntensity(intensity) {
        this.intensity = Math.max(0, Math.min(1, intensity));
    }
}

/**
 * Example usage:
 * 
 * import { AudioAnalyzer } from './shared/audio-analyzer.js';
 * import { CapsuleVibration } from './shared/capsule-vibration.js';
 * 
 * const audioAnalyzer = new AudioAnalyzer();
 * await audioAnalyzer.init(audioElement);
 * 
 * const vibration = new CapsuleVibration({
 *     intensity: 1.0,
 *     bassShakeAmount: 0.1,
 *     midRotationSpeed: 0.05,
 *     highScalePulse: 0.02
 * });
 * 
 * function animate() {
 *     const freq = audioAnalyzer.getFrequencyData();
 *     
 *     capsules.forEach((capsule, index) => {
 *         vibration.applyToThreeJS(capsule, freq, capsule.baseTransform);
 *     });
 *     
 *     requestAnimationFrame(animate);
 * }
 */
