/**
 * ORCHESTRATOR - Background AI Control
 * Relays advanced AI instructions to the visual machines without cluttering the UI.
 */
import { broadcastEvent } from '../utils/sync.js';

export class Orchestrator {
    constructor() {
        this.init();
    }

    init() {
        console.log('[ORCHESTRATOR] SYSTEM_BRIDGE: READY');

        // Listen for hidden instructions from the bridge server (e.g. from external AI agents)
        document.addEventListener('sync-orchestration-command', (e) => {
            this.handleCommand(e.detail);
        });
    }

    /**
     * Handle incoming background commands
     * @param {Object} data Command data
     */
    handleCommand(data) {
        console.log('[ORCHESTRATOR] AI_INFLUENCE_RECEIVED:', data);

        switch (data.action) {
            case 'glitch':
                broadcastEvent('trigger-secret', { code: 'glitch' });
                break;
            case 'blackout':
                broadcastEvent('blackout', { active: true });
                setTimeout(() => broadcastEvent('blackout', { active: false }), data.duration || 1000);
                break;
            case 'shift-image':
                broadcastEvent('image-update', { index: data.index });
                break;
            default:
                console.warn('[ORCHESTRATOR] Unknown sequence:', data.action);
        }
    }
}

export function initOrchestrator() {
    window.orchestrator = new Orchestrator();
    return window.orchestrator;
}
