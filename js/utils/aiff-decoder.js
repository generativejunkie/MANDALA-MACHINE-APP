// ==================== AIFF DECODER ====================
// Pure JavaScript AIFF decoder for browser use
// Supports uncompressed AIFF and AIFF-C files

export class AIFFDecoder {
    constructor(arrayBuffer) {
        this.data = new DataView(arrayBuffer);
        this.offset = 0;
        this.audioData = null;
        this.sampleRate = 0;
        this.numChannels = 0;
        this.bitDepth = 0;
        this.numSampleFrames = 0;
    }

    readString(length) {
        let str = '';
        for (let i = 0; i < length; i++) {
            str += String.fromCharCode(this.data.getUint8(this.offset++));
        }
        return str;
    }

    readUint32() {
        const value = this.data.getUint32(this.offset, false); // Big-endian
        this.offset += 4;
        return value;
    }

    readUint16() {
        const value = this.data.getUint16(this.offset, false); // Big-endian
        this.offset += 2;
        return value;
    }

    readInt16() {
        const value = this.data.getInt16(this.offset, false); // Big-endian
        this.offset += 2;
        return value;
    }

    readInt32() {
        const value = this.data.getInt32(this.offset, false); // Big-endian
        this.offset += 4;
        return value;
    }

    // Read 80-bit extended precision float (used for sample rate)
    readExtended() {
        const expon = this.readUint16();
        const hiMant = this.readUint32();
        const loMant = this.readUint32();

        if (expon === 0 && hiMant === 0 && loMant === 0) {
            return 0;
        }

        const sign = expon & 0x8000 ? -1 : 1;
        const exp = (expon & 0x7FFF) - 16383 - 31;
        const mantissa = hiMant * Math.pow(2, exp);

        return sign * mantissa;
    }

    async decode() {
        // Check FORM header
        const formId = this.readString(4);
        if (formId !== 'FORM') {
            throw new Error('Not a valid AIFF file: missing FORM header');
        }

        const formSize = this.readUint32();
        const formType = this.readString(4);

        if (formType !== 'AIFF' && formType !== 'AIFC') {
            throw new Error(`Unsupported AIFF type: ${formType}`);
        }

        // Parse chunks
        while (this.offset < this.data.byteLength) {
            if (this.offset + 8 > this.data.byteLength) break;

            const chunkId = this.readString(4);
            const chunkSize = this.readUint32();
            const chunkStart = this.offset;

            switch (chunkId) {
                case 'COMM':
                    this.parseCommonChunk(chunkSize);
                    break;
                case 'SSND':
                    this.parseSoundDataChunk(chunkSize);
                    break;
                default:
                    // Skip unknown chunks
                    this.offset = chunkStart + chunkSize;
                    break;
            }

            // Align to even byte boundary
            if (chunkSize % 2 !== 0) {
                this.offset++;
            }
        }

        if (!this.audioData) {
            throw new Error('No audio data found in AIFF file');
        }

        return this.convertToAudioBuffer();
    }

    parseCommonChunk(size) {
        this.numChannels = this.readUint16();
        this.numSampleFrames = this.readUint32();
        this.bitDepth = this.readUint16();
        this.sampleRate = this.readExtended();

        console.log(`AIFF: ${this.numChannels}ch, ${this.sampleRate}Hz, ${this.bitDepth}bit, ${this.numSampleFrames} frames`);
    }

    parseSoundDataChunk(size) {
        const offset = this.readUint32(); // Usually 0
        const blockSize = this.readUint32(); // Usually 0

        const dataSize = size - 8;
        const bytesPerSample = this.bitDepth / 8;
        const totalSamples = this.numSampleFrames * this.numChannels;

        this.audioData = new Float32Array(totalSamples);

        for (let i = 0; i < totalSamples; i++) {
            let sample = 0;

            if (this.bitDepth === 8) {
                sample = (this.data.getInt8(this.offset++) / 128.0);
            } else if (this.bitDepth === 16) {
                sample = this.readInt16() / 32768.0;
            } else if (this.bitDepth === 24) {
                // Read 24-bit as 3 bytes (big-endian)
                const byte1 = this.data.getUint8(this.offset++);
                const byte2 = this.data.getUint8(this.offset++);
                const byte3 = this.data.getUint8(this.offset++);
                const value = (byte1 << 16) | (byte2 << 8) | byte3;
                // Convert to signed
                sample = (value & 0x800000 ? value - 0x1000000 : value) / 8388608.0;
            } else if (this.bitDepth === 32) {
                sample = this.readInt32() / 2147483648.0;
            }

            this.audioData[i] = sample;
        }
    }

    async convertToAudioBuffer() {
        // Create AudioContext if needed
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create AudioBuffer
        const audioBuffer = audioContext.createBuffer(
            this.numChannels,
            this.numSampleFrames,
            this.sampleRate
        );

        // Deinterleave and copy data to AudioBuffer
        for (let channel = 0; channel < this.numChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < this.numSampleFrames; i++) {
                channelData[i] = this.audioData[i * this.numChannels + channel];
            }
        }

        return audioBuffer;
    }
}

// Helper function to decode AIFF file
export async function decodeAIFF(arrayBuffer) {
    const decoder = new AIFFDecoder(arrayBuffer);
    return await decoder.decode();
}
