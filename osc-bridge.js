/**
 * OSC Bridge — MANDALA MACHINE → TouchDesigner
 * Runs in Electron main process.
 * Renderer sends via ipcMain('osc', address, ...args).
 *
 * Default target: 127.0.0.1:10000
 * TouchDesigner: oscin CHOP → port 10000
 */

'use strict';
const { UDPPort } = require('node-osc');

const THROTTLE_MS = 14;        // ~70fps cap per address
const _lastSent   = new Map(); // throttle table

let _udp       = null;
let _host      = '127.0.0.1';
let _port      = 10000;
let _ready     = false;
let _onStatus  = null;         // callback(isConnected, host, port)

function setStatusCallback(fn) { _onStatus = fn; }

function _emit(connected) {
    _ready = connected;
    _onStatus?.(connected, _host, _port);
}

function connect(host = '127.0.0.1', port = 10000) {
    _host = host;
    _port = port;

    if (_udp) {
        try { _udp.close(); } catch(e) {}
        _udp = null;
        _ready = false;
    }

    _udp = new UDPPort({
        remoteAddress: _host,
        remotePort:    _port,
        localPort:     0,          // OS が空きポートを選択
        broadcast:     false,
        metadata:      true
    });

    _udp.on('ready', () => {
        console.log(`[OSC] Sender ready → ${_host}:${_port}`);
        _emit(true);
    });
    _udp.on('error', err => {
        console.error('[OSC] Error:', err.message);
        _emit(false);
    });
    _udp.open();
}

/**
 * send(address, args)
 * args: array of numbers (float) or strings
 * Throttled per address at ~70fps.
 */
function send(address, args = []) {
    if (!_udp || !_ready) return;

    const now  = Date.now();
    const last = _lastSent.get(address) || 0;
    if (now - last < THROTTLE_MS) return;
    _lastSent.set(address, now);

    const oscArgs = args.map(a =>
        typeof a === 'string'
            ? { type: 's', value: a }
            : { type: 'f', value: parseFloat(a) || 0 }
    );

    try {
        _udp.send({ address, args: oscArgs });
    } catch(e) {
        console.error('[OSC] Send failed:', e.message);
    }
}

function isConnected() { return _ready; }
function getTarget()   { return { host: _host, port: _port }; }

module.exports = { connect, send, isConnected, getTarget, setStatusCallback };
