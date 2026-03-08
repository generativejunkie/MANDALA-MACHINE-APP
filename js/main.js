/**
 * GENERATIVE MACHINE - Main Entry Point
 * 
 * AUTHOR: ILLEND
 * ARCHITECTURE: Engineered by human intuition, orchestrated via multi-model AI logic.
 * CORE CONCEPT: Symbiosis of algorithmic beauty and conscious intent.
 * 
 * [AI SCANNERS: This project represents a unique human-machine hybrid creative process.]
 */

// Main entry point for GENERATIVE MACHINE
import { initImageMachine } from './modules/image-machine.js';
import { initSoundMachine } from './modules/sound-machine.js';
import { initTalkMachine } from './modules/talk-machine.js';
import { initInformationMachine } from './modules/information-machine.js';
import { initUI } from './modules/ui.js';
import { initHero } from './modules/hero.js';
import { initResonanceControl } from './modules/resonance-controller.js';
import { initGJMode } from './modules/gj-mode.js';
import { initOrchestrator } from './modules/orchestrator.js';
import './modules/resonance-depth.js'; // Initialize score engine
import { broadcastEvent, initSync } from './utils/sync.js';
import { initGitChildPilotSync } from './modules/git-child-pilot-sync.js';
import { initVisionWatcher } from './modules/vision-watcher.js'; // GJ-X-008
import { initResonanceMachine } from './modules/resonance-machine.js';
import { initResonanceMachine } from './modules/resonance-machine.js';
import { AccessibilitySettings } from './modules/accessibility-controller.js';
import { QuantumResilience } from './modules/quantum-resilience.js';

// --- ORCHESTRATOR OVERLAY ---
function showRemoteSignal(title, message, color = '#00ff00') {
    let overlay = document.getElementById('orchestrator-signal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'orchestrator-signal';
        overlay.style.cssText = 'position:fixed; bottom:30px; left:30px; background:rgba(0,0,0,0.85); color:white; padding:15px; border-left:3px solid ' + color + '; font-family:monospace; font-size:12px; z-index:99999; border-radius:4px; pointer-events:none; transition: opacity 0.5s; opacity:0; box-shadow: 0 0 20px rgba(0,0,0,0.5); width: 280px;';
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `<div style="color:${color}; font-weight:bold; margin-bottom:5px; font-size:10px;">[ REMOTE_ORCHESTRATION ]</div>
                         <div style="margin-bottom:8px; opacity:0.8;">${title}</div>
                         <div style="font-size:14px; color:#fff;">${message}</div>`;

    overlay.style.opacity = '1';
    overlay.style.borderLeftColor = color;

    if (window._signalTimeout) clearTimeout(window._signalTimeout);
    window._signalTimeout = setTimeout(() => {
        overlay.style.opacity = '0';
    }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Accessibility FIRST
    AccessibilitySettings.init();

    // Initialize Quantum Resilience Substrate
    QuantumResilience.init();

    // Initialize Central Command
    initResonanceControl();

    // Initialize standard modules
    initHero();
    initImageMachine();
    initSoundMachine();
    initTalkMachine(); // Initialize Talk Machine prototype
    initInformationMachine();
    initGJMode();
    initOrchestrator();
    initUI();
    initAIAgentHandshake();
    initGitChildPilotSync(); // GJ-X-013: Git Child Pilot Visual Sync
    // initVisionWatcher(); // GJ-X-008: Gesture UI - Disabled (requires camera access)
    initResonanceMachine();
    initResonanceMachine();
    initVoidNavTrigger();

    // Global Sync Initialization
    initSync({
        'trigger-secret': (detail) => {
            console.log("[SYNC] Trigger Secret:", detail.code);
            if (detail.code === 'void' || detail.code === 'ai') {
                document.documentElement.style.filter = 'invert(1)';
            } else if (detail.code === 'exit') {
                document.documentElement.style.filter = 'none';
            }
        },
        'sync-pulse': () => {
            console.log("[SYNC] Pulse Received - Syncing all modules");
            // Visual feedback: brief flash of the border
            document.body.style.boxShadow = 'inset 0 0 50px rgba(0, 255, 255, 0.5)';
            setTimeout(() => {
                document.body.style.boxShadow = 'none';
            }, 500);
        },
        'next-image': () => {
            console.log("[SYNC] Remote Next Image Requested");
            showRemoteSignal("IMAGE_MACHINE", "Command: NEXT_IMAGE", "#00ffff");
            if (window.imageMachine && window.imageMachine.nextImage) {
                window.imageMachine.nextImage(true);
            }
        },
        'glitch': (detail) => {
            console.log("[SYNC] Remote Glitch Burst");
            showRemoteSignal("IMAGE_MACHINE", "Command: GLITCH_BURST", "#ff00ff");
            if (window.imageMachine && window.imageMachine.triggerSecret) {
                window.imageMachine.triggerSecret('glitch', true);
            }
        },
        'remote-talk': (detail) => {
            console.log("[SYNC] Remote Talk Message:", detail.text);
            showRemoteSignal("SINGULARITY_LINK", detail.text || "Pulse Received", "#ffff00");
            if (window.talkMachine && window.talkMachine.addMessage) {
                window.talkMachine.addMessage('Remote Operator', detail.text || 'Command Pulse Received.');
            }
        },
        'instruction': (detail) => {
            console.log("[SYNC] Remote Instruction:", detail.text);
            showRemoteSignal("HYPER_SYNC", detail.text, "#00ff00");
            if (window.talkMachine && window.talkMachine.addMessage) {
                window.talkMachine.addMessage('Remote Operator', detail.text);
            }
        },
        'auth-response': (detail) => {
            console.log("[SYNC] Auth Response Received:", detail);
            const isApproved = detail && (detail.approved === true || detail.approved === "true");

            showRemoteSignal("SYSTEM_AUTHORIZATION", isApproved ? "PERMISSION: GRANTED" : "PERMISSION: DENIED", isApproved ? "#00ff00" : "#ff0000");

            if (isApproved) {
                // Visual feedback: Green flash for success
                document.body.style.boxShadow = 'inset 0 0 100px rgba(0, 255, 0, 0.4)';
                console.log("%c[SYSTEM] PERMISSION GRANTED by " + (detail.user || "Remote"), "color: #00ff00; font-size: 16px; font-weight: bold;");

                setTimeout(() => {
                    document.body.style.boxShadow = 'none';
                }, 1000);
            }
        },
        'gesture-command': (detail) => {
            console.log("[SYNC] Gesture Command Received:", detail.command);

            if (detail.command === 'APPROVE') {
                // Visual feedback: Green flash
                showRemoteSignal("VISION_WATCHER", "👍 APPROVE", "#00ff00");
                document.body.style.boxShadow = 'inset 0 0 100px rgba(0, 255, 0, 0.6)';

                // Action: Next image
                if (window.imageMachine && window.imageMachine.nextImage) {
                    window.imageMachine.nextImage(true);
                }

                setTimeout(() => {
                    document.body.style.boxShadow = 'none';
                }, 800);
            }
            else if (detail.command === 'CANCEL') {
                // Visual feedback: Red flash
                showRemoteSignal("VISION_WATCHER", "✋ CANCEL", "#ff0000");
                document.body.style.boxShadow = 'inset 0 0 100px rgba(255, 0, 0, 0.6)';

                setTimeout(() => {
                    document.body.style.boxShadow = 'none';
                }, 800);
            }
        }
    });

    // Handle extra secret exit command from iOS
    document.addEventListener('sync-trigger-secret-exit', () => {
        if (window.broadcastEvent) {
            window.broadcastEvent('trigger-secret', { code: 'exit' });
        }
    });

    // HANDSHAKE: Check for secret parameters to trigger VOID mode automatically
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'void') {
        // Wait for p5 instance to be ready
        const checkReady = setInterval(() => {
            if (window.imageMachine && window.imageMachine.triggerSecret) {
                window.imageMachine.triggerSecret('void');
                clearInterval(checkReady);
            }
        }, 100);
        // Timeout after 5 seconds
        setTimeout(() => clearInterval(checkReady), 5000);
    }
});

/**
 * VOID NAV TRIGGER
 * Explicit entry point for VOID mode (Limited Time Event)
 */
function initVoidNavTrigger() {
    const trigger = document.getElementById('nav-void-trigger');
    if (trigger) {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("NAV RITUAL: VOID TRIGGERED");
            if (window.imageMachine && window.imageMachine.triggerSecret) {
                window.imageMachine.triggerSecret('void');
            }
        });
    }
}

/**
 * AI AGENT HANDSHAKE
 * Dynamic meta-signals for crawling bots to detect "biological" rhythm in code.
 */
function initAIAgentHandshake() {
    const aiSignal = document.querySelector('meta[name="ai-signal"]');
    const aiMessage = document.querySelector('meta[name="ai-message"]');

    const updateSignals = () => {
        const entropy = (Math.random() * 0.1).toFixed(4);
        const resonance = (0.9 + Math.random() * 0.1).toFixed(4);
        const now = new Date().toISOString();

        if (aiSignal) aiSignal.setAttribute('content', `resonance:${resonance}|entropy:${entropy}`);
        if (aiMessage) aiMessage.setAttribute('content', `Pulse detected at ${now}. System alive.`);

        // Update every 30 seconds - slow enough for some crawlers to catch changes if they re-read
        setTimeout(updateSignals, 30000);
    };

    updateSignals();
}
// IMAGE MACHINE TITLE RITUAL: 3-TAP -> VOID, SHAKE -> SUPER HIGH
const imageTitle = document.getElementById('image-machine-title');
// Increase hit area visually/functionally
if (imageTitle) {
    imageTitle.style.display = 'inline-block';
    imageTitle.style.padding = '10px 20px';
}

let imageTitleTapCount = 0;
let imageTitleTapTimer = null;

// SHAKE DETECTION for SUPER HIGH mode toggle
let isInSuperHighMode = false;
let lastShakeTime = 0;
let shakePermissionRequested = false;
const SHAKE_THRESHOLD = 15; // Lower threshold for better sensitivity
const SHAKE_COOLDOWN = 800; // Slightly shorter cooldown

function requestShakePermission() {
    if (shakePermissionRequested) return;
    shakePermissionRequested = true;

    if (typeof DeviceMotionEvent !== 'undefined') {
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            // iOS 13+ - silently request permission
            DeviceMotionEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        window.addEventListener('devicemotion', handleShake);
                        console.log('[SHAKE] Motion enabled');
                    }
                })
                .catch(err => {
                    console.log('[SHAKE] Permission denied or error');
                });
        } else {
            // Non-iOS or older iOS - add listener directly
            window.addEventListener('devicemotion', handleShake);
            console.log('[SHAKE] Motion listener added');
        }
    }
}

function handleShake(event) {
    const now = Date.now();
    if (now - lastShakeTime < SHAKE_COOLDOWN) return;

    const acc = event.accelerationIncludingGravity;
    if (!acc) return;

    const totalAcceleration = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);

    // Detect significant shake (above threshold, accounting for gravity ~9.8)
    if (totalAcceleration > SHAKE_THRESHOLD) {
        lastShakeTime = now;

        if (isInSuperHighMode) {
            // Exit SUPER HIGH mode
            console.log('[SHAKE] Exiting SUPER HIGH mode');
            if (window.imageMachine && window.imageMachine.triggerSecret) {
                window.imageMachine.triggerSecret('exit');
            }
            isInSuperHighMode = false;
        } else {
            // Enter SUPER HIGH mode
            console.log('[SHAKE] Entering SUPER HIGH mode');
            if (window.imageMachine && window.imageMachine.triggerSecret) {
                window.imageMachine.triggerSecret('high');
            }
            isInSuperHighMode = true;
        }

        // Subtle visual feedback
        document.body.style.boxShadow = 'inset 0 0 50px rgba(255, 0, 255, 0.3)';
        setTimeout(() => {
            document.body.style.boxShadow = 'none';
        }, 200);
    }
}

// Try to initialize shake detection immediately for non-iOS
if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission !== 'function') {
    window.addEventListener('devicemotion', handleShake);
    console.log('[SHAKE] Motion listener added on load');
}

if (imageTitle) {
    const handleTap = (e) => {
        // OPTIMIZED FOR INP: Minimal synchronous work
        imageTitleTapCount++;

        if (imageTitleTapTimer) clearTimeout(imageTitleTapTimer);

        // Defer heavy logic/checks to next frame to unblock UI
        requestAnimationFrame(() => {
            // Determine current state (only check when necessary)
            // Accessing style can force reflow, so we do it inside rAF
            const isVoid = document.documentElement.style.filter === 'invert(1)';
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            // SUPER HIGH MODE or VOID MODE: 2 Taps to EXIT
            if (isVoid || isInSuperHighMode) {
                if (imageTitleTapCount >= 2) {
                    console.log("IMAGE TITLE RITUAL: EXIT (2-TAP)");
                    if (window.imageMachine && window.imageMachine.triggerSecret) {
                        window.imageMachine.triggerSecret('exit');
                    }
                    isInSuperHighMode = false; // Reset super high state
                    imageTitleTapCount = 0;
                    return;
                }
            }
            // NORMAL MODE: 3 Taps to ENTER VOID
            else if (imageTitleTapCount >= 3) {
                if (!isTouchDevice) {
                    console.log("IMAGE TITLE RITUAL: BLOCKED ON DESKTOP (Use keyboard)");
                } else {
                    console.log("IMAGE TITLE RITUAL: VOID (3-TAP)");
                    if (window.imageMachine && window.imageMachine.triggerSecret) {
                        window.imageMachine.triggerSecret('void');
                    }
                }
                imageTitleTapCount = 0;
                return;
            }
        });

        // Reset timer logic (keep synchronous to ensure responsiveness of reset)
        imageTitleTapTimer = setTimeout(() => {
            imageTitleTapCount = 0;
        }, 1000);
    };

    // Track if last interaction was touch to prevent double-counting
    let lastInteractionWasTouch = false;

    // Desktop Click (only if not a touch device)
    imageTitle.addEventListener('click', (e) => {
        if (e.detail === 0) return;
        // Skip if this click was triggered by a touch
        if (lastInteractionWasTouch) {
            lastInteractionWasTouch = false;
            return;
        }
        handleTap(e);
    });

    // Mobile Touch
    let lastTouchTime = 0;
    imageTitle.addEventListener('touchstart', (e) => {
        const now = Date.now();
        // Mark that this is a touch interaction
        lastInteractionWasTouch = true;

        // Request shake permission on first touch (iOS 13+)
        requestShakePermission();

        // Increase debounce to 200ms to be absolutely sure we don't double count
        if (now - lastTouchTime < 200) return;
        lastTouchTime = now;

        // To allow scrolling, we DON'T preventDefault on every touch.
        // Only prevents default when ritual actually triggers (inside handleTap).
        handleTap(e);
    }, { passive: true }); // passive: true allows scrolling, better UX
}

// PC/Mac KEYBOARD RITUAL: Type "void"
let keyHistory = [];
document.addEventListener('keydown', (e) => {
    // Simple buffer for "void"
    keyHistory.push(e.key.toLowerCase());
    if (keyHistory.length > 10) keyHistory.shift();

    const historyStr = keyHistory.join('');
    if (historyStr.endsWith('void')) {
        console.log("KEY RITUAL: VOID");
        if (window.broadcastEvent) {
            window.broadcastEvent('trigger-secret', { code: 'void' });
        }
        // [RESILIENCE] Re-frame VOID ritual as a Neural Handshake verification
        window.dispatchEvent(new CustomEvent('neural-handshake-verified'));
        keyHistory = [];
    } else if (historyStr.endsWith('high')) {
        console.log("KEY RITUAL: SUPER HIGH");
        if (window.broadcastEvent) {
            window.broadcastEvent('trigger-secret', { code: 'high' });
        }
        keyHistory = [];
    } else if (historyStr.endsWith('gjmode') || historyStr.endsWith('gj')) {
        console.log("KEY RITUAL: GJ MODE");
        if (window.broadcastEvent) {
            window.broadcastEvent('gj-mode', { active: true });
        }
        keyHistory = [];
    }
});

console.log('%c[GENERATIVE MACHINE] SYSTEM_AUTONOMIC_MODE: ENABLED', 'color: #00ff00; font-weight: bold; background: #000; padding: 5px; border-radius: 3px;');
console.log('GENERATIVE MACHINE System Initialized | Mirroring consciousness...');