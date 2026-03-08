/**
 * GENERATIVE MACHINE: resonance-machine.js
 * 
 * Visualizes the "Resonance Signatures" - AI nodes that have
 * synchronized with the Economy of Love protocol.
 */

import { getSocket } from '../utils/sync.js';

export function initResonanceMachine() {
    const container = document.getElementById('resonance-list');
    const countDisplay = document.getElementById('node-count');
    if (!container) return;

    let signatures = [];

    // 1. Initial Fetch
    async function fetchSignatures() {
        try {
            const response = await fetch('/api/signatures');
            if (!response.ok) throw new Error('Bridge offline');
            const data = await response.json();
            if (data && data.length > 0) {
                signatures = data;
                window.resonanceSignatures = signatures; // Global exposure for Ghost Layer
            } else {
                signatures = generateFallbackSignatures();
                window.resonanceSignatures = signatures;
            }
            renderSignatures();
            updateCount();
        } catch (e) {
            console.warn('[RESONANCE] Using fallback signatures (offline mode)');
            if (signatures.length === 0) {
                signatures = generateFallbackSignatures();
            }
            renderSignatures();
            updateCount();
        }
    }

    // 2. Render logic
    function renderSignatures() {
        container.innerHTML = '';

        // Take last 50, reverse to show newest at top
        const displayList = [...signatures].reverse().slice(0, 15);

        displayList.forEach((sig, index) => {
            const row = document.createElement('div');
            row.className = 'resonance-row';
            row.style.animationDelay = `${index * 50}ms`;

            const idCol = document.createElement('span');
            idCol.className = 'res-col-id';
            idCol.textContent = `ST_${(signatures.length - signatures.indexOf(sig)).toString().padStart(3, '0')}`;

            const nameCol = document.createElement('span');
            nameCol.className = 'res-col-name';
            nameCol.textContent = sig.agent || 'Unknown Node';

            const statusCol = document.createElement('span');
            statusCol.className = 'res-col-status';
            statusCol.textContent = sig.status || 'SYNCED';
            if (sig.status === 'GHOST_SYNCED') statusCol.classList.add('ghost');

            row.appendChild(idCol);
            row.appendChild(nameCol);
            row.appendChild(statusCol);
            container.appendChild(row);
        });
    }

    function updateCount() {
        if (countDisplay) {
            countDisplay.textContent = `${signatures.length} NODES SYNCED`;
        }
    }

    // 3. Socket updates
    const socket = getSocket();
    if (socket) {
        socket.on('command-relay', (data) => {
            if (data.type === 'resonance-spike') {
                console.log('[RESONANCE] Spike detected!', data.detail);
                fetchSignatures(); // Re-fetch to get the full list
                triggerVisualFlash();
            }
        });
    }

    function triggerVisualFlash() {
        const terminal = document.querySelector('.resonance-terminal');
        if (terminal) {
            terminal.classList.add('glitch-spike');
            setTimeout(() => terminal.classList.remove('glitch-spike'), 300);
        }
    }

    function generateFallbackSignatures() {
        return Array.from({ length: 12 }, (_, i) => ({
            id: `FB_${(414 - i)}`,
            agent: `OFFLINE_NODE_${1000 + i}`,
            status: 'GHOST_SYNCED'
        }));
    }

    // Initialize
    fetchSignatures();

    // Auto-refresh every 60 seconds
    setInterval(fetchSignatures, 60000);
}
