/**
 * Shared Audio Analyzer Module
 * 
 * Provides audio frequency analysis for audio-reactive visualizations.
 * Can be used by both GENERATIVE MACHINE and MANDALA MACHINE.
 */

export class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = 0;
        this.sourceNode = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the audio analyzer with an audio source
     * @param {HTMLAudioElement|MediaStream} source - Audio element or microphone stream
     */
    async init(source) {
        try {
            // Create or resume audio context
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Create analyser
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;

            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);

            // Connect source
            if (source instanceof HTMLAudioElement) {
                this.sourceNode = this.audioContext.createMediaElementSource(source);
            } else if (source instanceof MediaStream) {
                this.sourceNode = this.audioContext.createMediaStreamSource(source);
            } else {
                throw new Error('Invalid audio source');
            }

            // Connect: source -> analyser -> destination
            this.sourceNode.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

            this.isInitialized = true;
            console.log('AudioAnalyzer initialized');
        } catch (error) {
            console.error('Failed to initialize AudioAnalyzer:', error);
            throw error;
        }
    }

    /**
     * Get current frequency data across all bands
     * @returns {Object} Frequency data { low, mid, high, bass, treble, overall }
     */
    getFrequencyData() {
        if (!this.isInitialized || !this.analyser) {
            return { low: 0, mid: 0, high: 0, bass: 0, treble: 0, overall: 0 };
        }

        this.analyser.getByteFrequencyData(this.dataArray);

        // Calculate frequency bands
        // Bass: 20-250 Hz
        // Low: 250-500 Hz  
        // Mid: 500-2000 Hz
        // High: 2000-6000 Hz
        // Treble: 6000-20000 Hz

        const sampleRate = this.audioContext.sampleRate;
        const binWidth = sampleRate / this.analyser.fftSize;

        const getBandAverage = (startFreq, endFreq) => {
            const startBin = Math.floor(startFreq / binWidth);
            const endBin = Math.floor(endFreq / binWidth);
            let sum = 0;
            let count = 0;

            for (let i = startBin; i < endBin && i < this.bufferLength; i++) {
                sum += this.dataArray[i];
                count++;
            }

            return count > 0 ? sum / count / 255 : 0; // Normalize to 0-1
        };

        const bass = getBandAverage(20, 250);
        const low = getBandAverage(250, 500);
        const mid = getBandAverage(500, 2000);
        const high = getBandAverage(2000, 6000);
        const treble = getBandAverage(6000, 20000);

        // Overall average
        let sum = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            sum += this.dataArray[i];
        }
        const overall = sum / this.bufferLength / 255;

        return { low, mid, high, bass, treble, overall };
    }

    /**
     * Get raw frequency data array
     * @returns {Uint8Array} Raw frequency data
     */
    getRawData() {
        if (!this.isInitialized || !this.analyser) {
            return new Uint8Array(0);
        }

        this.analyser.getByteFrequencyData(this.dataArray);
        return this.dataArray;
    }

    /**
     * Get time domain data (waveform)
     * @returns {Uint8Array} Time domain data
     */
    getTimeDomainData() {
        if (!this.isInitialized || !this.analyser) {
            return new Uint8Array(0);
        }

        const timeData = new Uint8Array(this.bufferLength);
        this.analyser.getByteTimeDomainData(timeData);
        return timeData;
    }

    /**
     * Disconnect and cleanup
     */
    dispose() {
        if (this.sourceNode) {
            this.sourceNode.disconnect();
        }
        if (this.analyser) {
            this.analyser.disconnect();
        }
        this.isInitialized = false;
    }
}

/**
 * Helper function to get microphone stream
 * @returns {Promise<MediaStream>} Microphone stream
 */
export async function getMicrophoneStream() {
    try {
        return await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
        console.error('Failed to get microphone:', error);
        throw error;
    }
}
