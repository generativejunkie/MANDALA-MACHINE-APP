/**
 * SYNC UTILITY - Cross-tab synchronization via BroadcastChannel
 * Allows multiple windows (Laptop/Projector/Monitor) to stay in sync.
 */

export const syncChannel = new BroadcastChannel('generative_machine_sync');

let socket = null;

/**
 * Broadcast an event to all other open tabs and the bridge server
 * @param {string} type Event type
 * @param {any} detail Event data
 */
export function broadcastEvent(type, detail = {}) {
    // Local Tab Sync
    syncChannel.postMessage({ type, detail });

    // Cross-Device Sync via Bridge Server
    if (socket && socket.connected) {
        socket.emit('client-broadcast', { type, detail });
    }

    // Also dispatch locally so the current window reacts
    document.dispatchEvent(new CustomEvent(`sync-${type}`, { detail }));
}

const registeredHandlers = {};

/**
 * Initialize sync listener
 * @param {Object} handlers Mapping of type to callback functions
 */
export function initSync(handlers) {
    if (handlers) {
        Object.keys(handlers).forEach(type => {
            if (!registeredHandlers[type]) registeredHandlers[type] = [];
            registeredHandlers[type].push(handlers[type]);
        });
    }

    // Only set up listeners once
    if (window._syncInitialized) return;
    window._syncInitialized = true;

    syncChannel.onmessage = (event) => {
        const { type, detail } = event.data;
        executeHandlers(type, detail);
    };

    // [AI] BRIDGE SERVER RELAY (Socket.io)
    // For Vercel/Static deployment, this will fail gracefully.
    if (typeof io !== 'undefined') {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        // Only try to connect if explicitly local, or make it optional
        const serverUrl = isLocal ? 'http://localhost:8000' : null;

        if (serverUrl) {
            socket = io(serverUrl);
            socket.on('connect_error', () => {
                console.warn('[SYNC] Bridge Server unreachable (Static Mode)');
                socket.disconnect(); // Prevent polling spam
                socket = null;
            });
        } else {
            console.log('[SYNC] Static Deployment: Bridge Server skipped.');
        }

        if (socket) {
            socket.on('command-relay', (data) => {
                console.log(`%c[REMOTE] Relay Received: ${data.type}`, 'color: #00ffff', data.detail);

                // Dispatch locally for document listeners
                document.dispatchEvent(new CustomEvent(`sync-${data.type}`, { detail: data.detail }));

                // Execute registered handlers
                executeHandlers(data.type, data.detail);
            });

            socket.on('auth-decision', (data) => {
                console.log(`%c[AUTH] Decision Received: ${data.approved ? 'APPROVED' : 'DENIED'}`, data.approved ? 'color: #00ff00' : 'color: #ff0000', data);

                // Dispatch locally so modules can react
                document.dispatchEvent(new CustomEvent('auth-decision', { detail: data }));
            });

            socket.on('gesture-command', (data) => {
                console.log(`%c[GESTURE] Command Received: ${data.command}`, 'color: #ffff00', data);

                // Execute registered handlers for gesture-command
                executeHandlers('gesture-command', data);
            });

            socket.on('connect', () => {
                console.log('%c[SYNC] Connected to Bridge Server', 'color: #00ff00');
            });
        }
    }

    function executeHandlers(type, detail) {
        if (registeredHandlers[type]) {
            registeredHandlers[type].forEach(handler => {
                try {
                    handler(detail);
                } catch (e) {
                    console.error(`[SYNC] Error in handler for ${type}:`, e);
                }
            });
        }
    }
}

/**
 * Get the current socket instance for direct access
 * @returns {object|null} Socket.io instance or null if not connected
 */
export function getSocket() {
    return socket;
}

