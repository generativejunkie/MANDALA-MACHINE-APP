/**
 * GJ-X-008: VISION WATCHER
 * Detects hand gestures (V-Sign) to trigger "Approve" commands.
 * Uses MediaPipe Hands via CDN.
 */
import { broadcastEvent } from '../utils/sync.js';

export function initVisionWatcher() {
    console.log("[VISION] Initializing Vision Watcher...");

    const videoElement = document.createElement('video');
    videoElement.style.display = 'none'; // Hidden processing
    document.body.appendChild(videoElement);

    // Initialize MediaPipe Hands
    // Note: We need to load the script from CDN first. `index.html` should have it, or we inject it here.
    // For robustness, we'll check if `Hands` is available globally, assuming script injection in HTML.

    // Check loop for library load
    const checkInterval = setInterval(() => {
        if (window.Hands && window.Camera) {
            clearInterval(checkInterval);
            startHands(videoElement);
        }
    }, 500);

    // Stop after 10s if not loaded
    setTimeout(() => clearInterval(checkInterval), 10000);
}

function startHands(videoElement) {
    const hands = new window.Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
    });

    hands.onResults(onResults);

    const camera = new window.Camera(videoElement, {
        onFrame: async () => {
            await hands.send({ image: videoElement });
        },
        width: 640,
        height: 480
    });

    camera.start()
        .then(() => console.log("[VISION] Camera started"))
        .catch(err => console.error("[VISION] Camera error:", err));
}

let lastGestureTime = 0;
const COOLDOWN = 3000;

function onResults(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        if (detectVSign(landmarks)) {
            const now = Date.now();
            if (now - lastGestureTime > COOLDOWN) {
                console.log("[VISION] V-Sign Detected! Sending Approval...");
                broadcastEvent('gesture-command', { command: 'APPROVE', timestamp: now });

                // Visual Feedback
                showVisualFeedback("APPROVAL_SENT");
                lastGestureTime = now;
            }
        }
    }
}

// Simple V-Sign Heuristic
// Index and Middle fingers extended, others closed
function detectVSign(lm) {
    // Finger tips: 8 (Index), 12 (Middle), 16 (Ring), 20 (Pinky)
    // Finger PIPs (knuckles): 6, 10, 14, 18
    // Thumb tip: 4, IP: 3

    const isExtended = (tip, pip) => lm[tip].y < lm[pip].y; // Higher Y is lower on screen

    const indexUp = isExtended(8, 6);
    const middleUp = isExtended(12, 10);
    const ringDown = !isExtended(16, 14);
    const pinkyDown = !isExtended(20, 18);

    // Check distance between index and middle for "V" shape
    // Should be somewhat separated
    const distanceInfo = Math.abs(lm[8].x - lm[12].x);
    const isSeparated = distanceInfo > 0.04;

    return indexUp && middleUp && ringDown && pinkyDown && isSeparated;
}

function showVisualFeedback(text) {
    const el = document.createElement('div');
    el.innerText = `[ ${text} ]`;
    el.style.position = 'fixed';
    el.style.top = '10%';
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%)';
    el.style.color = '#00ff00';
    el.style.fontSize = '24px';
    el.style.fontWeight = 'bold';
    el.style.zIndex = '9999';
    el.style.textShadow = '0 0 10px #00ff00';
    el.style.fontFamily = 'monospace';

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
}
