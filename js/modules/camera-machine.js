/**
 * Camera Machine - Insta360 GO 3S Integration
 * 
 * Features:
 * - Webcam input capture
 * - Real-time face detection using TensorFlow.js BlazeFace
 * - Automatic mosaic effect on all detected faces
 * 
 * @module CameraMachine
 */

class CameraMachine {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.model = null;
        this.isRunning = false;
        this.mosaicSize = 15; // Pixelation block size
        this.detectionInterval = 100; // ms between detections
        this.lastDetection = 0;
        this.faces = [];
        this.debugMode = false;

        // Callbacks
        this.onFaceDetected = null;
        this.onError = null;
    }

    /**
     * Initialize the camera machine
     * @param {Object} options - Configuration options
     * @param {string} options.videoElementId - ID for video element
     * @param {string} options.canvasElementId - ID for canvas element
     * @param {number} options.mosaicSize - Size of mosaic blocks
     * @param {boolean} options.debugMode - Show detection boxes
     */
    async init(options = {}) {
        this.mosaicSize = options.mosaicSize || 15;
        this.debugMode = options.debugMode || false;

        // Create hidden video element for camera input
        this.video = document.createElement('video');
        this.video.id = options.videoElementId || 'camera-video';
        this.video.autoplay = true;
        this.video.playsInline = true;
        this.video.muted = true;
        this.video.style.display = 'none';
        document.body.appendChild(this.video);

        // Create canvas for output
        this.canvas = document.getElementById(options.canvasElementId);
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = options.canvasElementId || 'camera-canvas';
            this.canvas.width = 640;
            this.canvas.height = 480;
        }
        this.ctx = this.canvas.getContext('2d');

        // Load BlazeFace model
        console.log('[CameraMachine] Loading BlazeFace model...');
        try {
            this.model = await blazeface.load();
            console.log('[CameraMachine] BlazeFace model loaded successfully');
        } catch (error) {
            console.error('[CameraMachine] Failed to load BlazeFace model:', error);
            if (this.onError) this.onError(error);
            throw error;
        }

        return this;
    }

    /**
     * Request camera access and start streaming
     * @param {Object} constraints - MediaStreamConstraints
     */
    async startCamera(constraints = {}) {
        const defaultConstraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: false
        };

        const finalConstraints = { ...defaultConstraints, ...constraints };

        try {
            console.log('[CameraMachine] Requesting camera access...');
            const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
            this.video.srcObject = stream;

            // Wait for video to be ready
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;
                    console.log(`[CameraMachine] Camera ready: ${this.video.videoWidth}x${this.video.videoHeight}`);
                    resolve();
                };
            });

            return true;
        } catch (error) {
            console.error('[CameraMachine] Camera access denied:', error);
            if (this.onError) this.onError(error);
            throw error;
        }
    }

    /**
     * Start the face detection and mosaic processing loop
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[CameraMachine] Starting face detection loop');
        this._processFrame();
    }

    /**
     * Stop the processing loop
     */
    stop() {
        this.isRunning = false;
        console.log('[CameraMachine] Stopped');
    }

    /**
     * Main processing loop
     */
    async _processFrame() {
        if (!this.isRunning) return;

        const now = Date.now();

        // Draw current video frame to canvas
        this.ctx.drawImage(this.video, 0, 0);

        // Run face detection at specified interval
        if (now - this.lastDetection > this.detectionInterval) {
            this.lastDetection = now;
            await this._detectFaces();
        }

        // Apply mosaic to all detected faces
        this._applyMosaic();

        // Debug: draw detection boxes
        if (this.debugMode) {
            this._drawDebugBoxes();
        }

        // Continue loop
        requestAnimationFrame(() => this._processFrame());
    }

    /**
     * Detect faces in current video frame
     */
    async _detectFaces() {
        if (!this.model) return;

        try {
            const predictions = await this.model.estimateFaces(this.video, false);
            this.faces = predictions;

            if (predictions.length > 0 && this.onFaceDetected) {
                this.onFaceDetected(predictions);
            }
        } catch (error) {
            console.warn('[CameraMachine] Face detection error:', error);
        }
    }

    /**
     * Apply mosaic effect to all detected faces
     */
    _applyMosaic() {
        for (const face of this.faces) {
            const topLeft = face.topLeft;
            const bottomRight = face.bottomRight;

            // Calculate face bounds with padding
            const padding = 20;
            const x = Math.max(0, Math.floor(topLeft[0]) - padding);
            const y = Math.max(0, Math.floor(topLeft[1]) - padding);
            const width = Math.min(this.canvas.width - x, Math.floor(bottomRight[0] - topLeft[0]) + padding * 2);
            const height = Math.min(this.canvas.height - y, Math.floor(bottomRight[1] - topLeft[1]) + padding * 2);

            // Apply pixelation
            this._pixelate(x, y, width, height, this.mosaicSize);
        }
    }

    /**
     * Pixelate a region of the canvas
     * @param {number} x - Start X
     * @param {number} y - Start Y
     * @param {number} width - Region width
     * @param {number} height - Region height
     * @param {number} size - Pixel block size
     */
    _pixelate(x, y, width, height, size) {
        // Get image data for region
        const imageData = this.ctx.getImageData(x, y, width, height);
        const data = imageData.data;

        // Process each block
        for (let py = 0; py < height; py += size) {
            for (let px = 0; px < width; px += size) {
                // Calculate average color for block
                let r = 0, g = 0, b = 0, count = 0;

                for (let by = py; by < py + size && by < height; by++) {
                    for (let bx = px; bx < px + size && bx < width; bx++) {
                        const i = (by * width + bx) * 4;
                        r += data[i];
                        g += data[i + 1];
                        b += data[i + 2];
                        count++;
                    }
                }

                r = Math.floor(r / count);
                g = Math.floor(g / count);
                b = Math.floor(b / count);

                // Apply average color to entire block
                for (let by = py; by < py + size && by < height; by++) {
                    for (let bx = px; bx < px + size && bx < width; bx++) {
                        const i = (by * width + bx) * 4;
                        data[i] = r;
                        data[i + 1] = g;
                        data[i + 2] = b;
                    }
                }
            }
        }

        // Put modified data back
        this.ctx.putImageData(imageData, x, y);
    }

    /**
     * Draw debug boxes around detected faces
     */
    _drawDebugBoxes() {
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = 2;

        for (const face of this.faces) {
            const topLeft = face.topLeft;
            const bottomRight = face.bottomRight;
            const width = bottomRight[0] - topLeft[0];
            const height = bottomRight[1] - topLeft[1];

            this.ctx.strokeRect(topLeft[0], topLeft[1], width, height);

            // Draw probability
            this.ctx.fillStyle = '#00FF00';
            this.ctx.font = '12px monospace';
            this.ctx.fillText(
                `${(face.probability[0] * 100).toFixed(1)}%`,
                topLeft[0],
                topLeft[1] - 5
            );
        }
    }

    /**
     * Get the output canvas element
     * @returns {HTMLCanvasElement}
     */
    getCanvas() {
        return this.canvas;
    }

    /**
     * Set mosaic block size
     * @param {number} size - Block size in pixels
     */
    setMosaicSize(size) {
        this.mosaicSize = Math.max(5, Math.min(50, size));
    }

    /**
     * List available camera devices
     * @returns {Promise<MediaDeviceInfo[]>}
     */
    static async listCameras() {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(device => device.kind === 'videoinput');
    }

    /**
     * Destroy the camera machine and release resources
     */
    destroy() {
        this.stop();

        if (this.video && this.video.srcObject) {
            const tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }

        if (this.video && this.video.parentNode) {
            this.video.parentNode.removeChild(this.video);
        }

        console.log('[CameraMachine] Destroyed');
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CameraMachine;
}

// Global export for browser
window.CameraMachine = CameraMachine;
