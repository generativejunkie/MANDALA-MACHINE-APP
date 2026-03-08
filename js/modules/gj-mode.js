/**
 * GJ MODE - Projection Optimized Interface
 * High-contrast, high-resonance visual state for Nebula projector.
 */
import { broadcastEvent } from '../utils/sync.js';
import { BrainHackMandala } from './BrainHackMandala.js';

export class GJMode {
    constructor() {
        this.active = false;
        this.init();
    }

    init() {
        document.addEventListener('sync-gj-mode', (e) => {
            if (e.detail.active) {
                this.activate();
            } else {
                this.deactivate();
            }
        });
    }

    activate(force = false) {
        if (this.active) return;

        // If coming from a force trigger (like sync-pulse override), bypass auth
        if (force) {
            this._runActivationSequence();
            return;
        }

        // --- AUTHENTICATION FLOW ---
        console.log('%c[GJ_MODE] AUTH_REQUIRED: Requesting iOS Permission...', 'color: yellow;');
        this.showWaitingScreen();

        // Send Request to Bridge
        fetch('http://localhost:8000/api/request-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'gj-mode',
                title: 'GJ MODE ACTIVATION',
                description: 'Master Control requested activation of visual resonance.'
            })
        }).catch(err => console.error("Auth Request Failed:", err));

        // Listen for decision (one-time listener)
        const decisionHandler = (e) => {
            const { approved, originalRequest } = e.detail;
            if (!originalRequest || originalRequest.type !== 'gj-mode') return;

            document.removeEventListener('auth-decision', decisionHandler);
            this.hideWaitingScreen();

            if (approved) {
                this._runActivationSequence();
                // Play success sound if sound machine available
                if (window.soundMachine && window.soundMachine.playSound) window.soundMachine.playSound('success');
            } else {
                console.log('%c[GJ_MODE] ACCESS DENIED', 'color: red; font-weight: bold;');
                this.showAccessDenied();
            }
        };
        document.addEventListener('auth-decision', decisionHandler);
    }

    _runActivationSequence() {
        this.active = true;
        console.log('%c[GJ_MODE] SYSTEM_RESONANCE_MAXIMA: ACTIVATED', 'background: #000; color: #fff; font-weight: bold; border: 1px solid #fff; padding: 5px;');

        // Visual Overrides
        document.documentElement.style.filter = 'invert(1) contrast(1.5) brightness(1.2)';
        document.body.classList.add('gj-mode-active');

        // Image Machine Force "High"
        if (window.imageMachine && window.imageMachine.triggerSecret) {
            window.imageMachine.triggerSecret('high');
        }

        // Nebula Pulse Loop
        this.pulse();

        // --- BRAIN HACK INJECTION ---
        if (!this.brainHack) {
            this.brainHack = new BrainHackMandala('brain-hack-canvas');
        }
        this.brainHack.start();
        document.getElementById('brain-hack-canvas').style.display = 'block';
        document.getElementById('brain-hack-canvas').style.opacity = '0.3'; // Blend with VJ
        document.getElementById('brain-hack-canvas').style.pointerEvents = 'none';
        document.getElementById('brain-hack-canvas').style.position = 'fixed';
        document.getElementById('brain-hack-canvas').style.zIndex = '9998';
        document.getElementById('brain-hack-canvas').style.top = '0';
        document.getElementById('brain-hack-canvas').style.left = '0';
    }

    showWaitingScreen() {
        const overlay = document.createElement('div');
        overlay.id = 'auth-waiting-overlay';
        overlay.innerHTML = `
            <div style="font-family: monospace; color: white; text-align: center;">
                <h1 style="font-size: 48px; color: yellow; text-shadow: 0 0 20px yellow;">⚠ AUTHORIZATION REQUIRED ⚠</h1>
                <p style="font-size: 24px; margin-top: 20px;">WAITING FOR IOS APPROVAL...</p>
                <div class="loader" style="margin-top: 40px; border: 4px solid #333; border-top: 4px solid yellow; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin-left: auto; margin-right: auto;"></div>
            </div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        `;
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:10000;display:flex;align-items:center;justify-content:center;';
        document.body.appendChild(overlay);
    }

    hideWaitingScreen() {
        const overlay = document.getElementById('auth-waiting-overlay');
        if (overlay) overlay.remove();
    }

    showAccessDenied() {
        document.body.style.backgroundColor = 'red';
        setTimeout(() => document.body.style.backgroundColor = '', 500);
        alert("ACCESS DENIED BY ADMINISTRATOR");
    }

    deactivate() {
        this.active = false;
        document.documentElement.style.filter = 'none';
        document.body.classList.remove('gj-mode-active');
        this.hideWaitingScreen();

        if (this.brainHack) {
            this.brainHack.stop();
            document.getElementById('brain-hack-canvas').style.display = 'none';
        }
    }

    pulse() {
        if (!this.active) return;

        // Subtle rhythmic flash for projection visibility
        const flash = document.createElement('div');
        flash.id = 'nebula-pulse';
        flash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#fff;opacity:0.05;z-index:9999;pointer-events:none;transition:opacity 0.1s;';
        document.body.appendChild(flash);

        setTimeout(() => {
            if (flash) flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 200);
        }, 100);

        // Sync with biological rhythm (approx 120bpm = 500ms)
        setTimeout(() => this.pulse(), 2000);
    }
}

export function initGJMode() {
    window.gjMode = new GJMode();
    return window.gjMode;
}
