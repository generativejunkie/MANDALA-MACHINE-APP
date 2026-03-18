/**
 * OSC Bridge — MANDALA MACHINE → TouchDesigner
 * Runs in Electron main process.
 * node-osc API: Client(host, port) → client.send(message)
 *
 * TouchDesigner: oscin CHOP → Network Port 10000, Protocol UDP
 */

'use strict';
const { Client, Message } = require('node-osc');

const THROTTLE_MS = 14;        // ~70fps cap per address
const _lastSent   = new Map();

let _client    = null;
let _host      = '127.0.0.1';
let _port      = 10000;
let _ready     = false;
let _onStatus  = null;

function setStatusCallback(fn) { _onStatus = fn; }

function _emit(connected) {
    _ready = connected;
    _onStatus?.(connected, _host, _port);
}

function connect(host = '127.0.0.1', port = 10000) {
    _host = host;
    _port = port;

    if (_client) {
        try { _client.close(); } catch(e) {}
        _client = null;
    }

    try {
        _client = new Client(_host, _port);
        _ready  = true;
        console.log(`[OSC] Client ready → ${_host}:${_port}`);
        _emit(true);
    } catch(e) {
        console.error('[OSC] Connect failed:', e.message);
        _emit(false);
    }
}

/**
 * send(address, args)
 * args: array of numbers (float) or strings
 * Throttled per address at ~70fps.
 */
function send(address, args = []) {
    if (!_client || !_ready) return;

    const now  = Date.now();
    const last = _lastSent.get(address) || 0;
    if (now - last < THROTTLE_MS) return;
    _lastSent.set(address, now);

    try {
        const msg = new Message(address);
        args.forEach(a => msg.append(a));  // node-osc が型を自動判定
        _client.send(msg, err => {
            if (err) console.error('[OSC] Send error:', err.message);
        });
    } catch(e) {
        console.error('[OSC] Send failed:', e.message);
    }
}

function isConnected() { return _ready; }
function getTarget()   { return { host: _host, port: _port }; }

module.exports = { connect, send, isConnected, getTarget, setStatusCallback };
