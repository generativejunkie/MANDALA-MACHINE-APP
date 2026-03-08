// ==================== SOUND MACHINE ====================
import { decodeAIFF } from '../utils/aiff-decoder.js';
import { CONFIG } from '../config/config.js';
import { VisualController } from './visual-controller.js';

let audioContext, analyser;
let scene, camera, renderer, pillGroups = [];
let frequencyData = { low: 0, mid: 0, high: 0 };
let pillCount = CONFIG.SOUND_MACHINE.DEFAULT_PARAMS.PILL_COUNT;
let pillSize = CONFIG.SOUND_MACHINE.DEFAULT_PARAMS.PILL_SIZE;
let spreadWidth = CONFIG.SOUND_MACHINE.DEFAULT_PARAMS.SPREAD_WIDTH;
let rotationSpeed = CONFIG.SOUND_MACHINE.DEFAULT_PARAMS.ROTATION_SPEED;
let scaleIntensity = CONFIG.SOUND_MACHINE.DEFAULT_PARAMS.SCALE_INTENSITY;
let autoMode = false; // Auto Mode State
let autoModeLastUpdate = 0; // Auto Mode timer
let wireframeMode = false, blockMode = false;

// Player State
let playerState = {
    mode: 'none', // 'element' or 'buffer' or 'none'
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    startTime: 0, // For buffer mode: when playback started relative to context time
    pauseTime: 0, // For buffer mode: offset when paused
    element: null, // HTMLAudioElement
    buffer: null, // AudioBuffer
    sourceNode: null, // AudioBufferSourceNode or MediaElementAudioSourceNode
    gainNode: null
};

export async function playAmbientMusic(filename = 'ambient-loop.mp3') {
    console.log(`Playing ambient music: ${filename}...`);
    try {
        await initAudioContext();
        const response = await fetch(`/sound/${filename}`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Stop current if any
        stopPlayback();

        playerState.mode = 'buffer';
        playerState.buffer = audioBuffer;
        playerState.duration = audioBuffer.duration;
        playerState.isPlaying = true;

        // Loop it
        playBuffer(true);
    } catch (e) {
        console.error("Failed to play ambient music:", e);
    }
}

export function stopAmbientMusic() {
    stopPlayback();
}

export function initSoundMachine() {
    const container = document.getElementById('soundCanvas-container');
    if (!container) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfafafa);

    camera = new THREE.PerspectiveCamera(
        75,
        container.offsetWidth / container.offsetHeight,
        0.1,
        100
    );
    camera.position.set(0, 0, 5);

    renderer = new THREE.WebGLRenderer({
        antialias: false, // GOD SPEED: Disable antialias for performance
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
        precision: 'mediump' // GOD SPEED: Lower precision for speed
    });
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false; // Disable shadows for performance
    container.appendChild(renderer.domElement);

    // [AI] ENERGY SAVER
    let energySaver = false;
    window.setEnergySaver = (val) => {
        energySaver = val;
        if (energySaver) {
            renderer.setPixelRatio(0.5);
            // Limit FPS manually if needed, but Three's internal loop is easier
            console.log("SOUND MACHINE: ENERGY SAVER ON (Low Res)");
        } else {
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            console.log("SOUND MACHINE: NORMAL MODE");
        }
        // Also sync with imageMachine if it exists
        if (window.imageMachine && window.imageMachine.setEnergySaver) {
            window.imageMachine.setEnergySaver(val);
        }
    };

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 5, 5);
    scene.add(mainLight);

    createPills();
    animateSound();

    window.addEventListener('resize', () => {
        camera.aspect = container.offsetWidth / container.offsetHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.offsetWidth, container.offsetHeight);
    });

    setupEventListeners();

    // Optimize rendering: only animate when visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!isAnimating) {
                    isAnimating = true;
                    animateSound();
                }
            } else {
                isAnimating = false;
            }
        });
    }, { threshold: 0 });

    observer.observe(container);

    // Initialize Visual Controller
    initVisualController();

    // [AI] Mobile/iPad Audio & Animation Rescue
    const soundPrompt = document.getElementById('soundPrompt');
    const startAction = () => {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        if (soundPrompt) {
            soundPrompt.classList.add('hidden');
            setTimeout(() => soundPrompt.style.display = 'none', 1000);
        }
        if (!isAnimating) {
            isAnimating = true;
            animateSound();
        }
    };

    container.addEventListener('touchstart', startAction, { passive: true });
    container.addEventListener('click', startAction);

    // [AI] URL Parameter check for Auto Mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auto') === 'true') {
        autoMode = true;
        const autoToggle = document.getElementById('autoMode');
        if (autoToggle) autoToggle.checked = true;
        console.log("SOUND MACHINE: AUTO MODE TRIGGERED VIA URL");

        // On iPad, we still need a tap, but we can try to start visuals
        isAnimating = true;
        animateSound();
    }
}

let isAnimating = false;
let animationId = null;

// ==================== VISUAL CONTROLLER (RADAR) ====================
let visualController = null;

function initVisualController() {
    // Initial parameter values
    const limits = CONFIG.SOUND_MACHINE.CONTROL_LIMITS;
    const params = [
        { name: 'scale', label: 'Scale', value: scaleIntensity, min: limits.SCALE.MIN, max: limits.SCALE.MAX },
        { name: 'pillCount', label: 'Capsules', value: pillCount, min: limits.PILL_COUNT.MIN, max: limits.PILL_COUNT.MAX },
        { name: 'spread', label: 'Spread', value: spreadWidth, min: limits.SPREAD.MIN, max: limits.SPREAD.MAX },
        { name: 'pillSize', label: 'Size', value: pillSize, min: limits.PILL_SIZE.MIN, max: limits.PILL_SIZE.MAX },
        { name: 'rotation', label: 'Rotation', value: rotationSpeed, min: limits.ROTATION.MIN, max: limits.ROTATION.MAX }
    ];

    visualController = new VisualController('settingsPanel', params, (name, val) => {
        // Update variables based on name
        switch (name) {
            case 'pillCount':
                const newCount = Math.round(val);
                if (pillCount !== newCount) {
                    pillCount = newCount;
                    createPills();
                }
                break;
            case 'pillSize':
                pillSize = val;
                break;
            case 'spread':
                spreadWidth = val;
                // GOD SPEED: No need to recreate pills, animateSound handles position!
                break;
            case 'rotation':
                rotationSpeed = val;
                break;
            case 'scale':
                scaleIntensity = val;
                break;
        }
    });
}

function setupEventListeners() {
    const audioFile = document.getElementById('audioFile');
    const audioFileSelect = document.getElementById('audioFileSelect');

    if (audioFile) audioFile.addEventListener('change', handleAudioFile);
    if (audioFileSelect) audioFileSelect.addEventListener('change', handleAudioFile);

    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
        playBtn.addEventListener('click', () => togglePlayback(true));
    }

    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => togglePlayback(false));
    }

    const seekBar = document.getElementById('seekBar');
    if (seekBar) {
        seekBar.addEventListener('click', (e) => {
            if (playerState.mode === 'none') return;

            const rect = e.target.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const newTime = percent * playerState.duration;

            seek(newTime);
        });
    }

    // Settings panel listeners
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener('click', () => {
            const isOpen = settingsPanel.classList.toggle('open');
            settingsBtn.setAttribute('aria-expanded', isOpen);
        });
    }

    // Checkbox listeners (keep these separate from radar)
    const wireframeInput = document.getElementById('wireframe');
    if (wireframeInput) {
        wireframeInput.addEventListener('change', (e) => {
            wireframeMode = e.target.checked;
            createPills();
        });
    }

    const blockModeInput = document.getElementById('blockMode');
    if (blockModeInput) {
        blockModeInput.addEventListener('change', (e) => {
            blockMode = e.target.checked;
            createPills();
        });
    }

    const autoModeInput = document.getElementById('autoMode');
    if (autoModeInput) {
        autoModeInput.addEventListener('change', (e) => {
            autoMode = e.target.checked;
        });
    }

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSettings);
    }
}

function setupControlListener(id, callback) {
    // Obsolete with Visual Controller, keeping for compatibility if needed or removed
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', (e) => callback(e.target.value));
    }
}

function resetSettings() {
    pillCount = 1;
    pillSize = 0.7;
    spreadWidth = 0;
    rotationSpeed = 1;
    scaleIntensity = 1;
    wireframeMode = false;
    blockMode = false;
    autoMode = false;

    // Reset Visual Controller
    if (visualController) {
        visualController.updateParam('pillCount', 1);
        visualController.updateParam('pillSize', 0.7);
        visualController.updateParam('spread', 0);
        visualController.updateParam('rotation', 1);
        visualController.updateParam('scale', 1);
    }

    const wireframeInput = document.getElementById('wireframe');
    if (wireframeInput) wireframeInput.checked = false;

    const blockModeInput = document.getElementById('blockMode');
    if (blockModeInput) blockModeInput.checked = false;

    const autoModeInput = document.getElementById('autoMode');
    if (autoModeInput) autoModeInput.checked = false;

    createPills();
}

function updateControlValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}


// ==================== AUDIO LOGIC ====================

async function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    if (!analyser) {
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.8;
        // Create a gain node to control volume if needed, or connect directly
        // We connect analyser to destination so we can hear it
        analyser.connect(audioContext.destination);
    }
}

async function handleAudioFile(e) {
    // Resume/Init context IMMEDIATELY to capture user gesture
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Always call resume on interaction
    audioContext.resume().catch(() => { });

    const file = e.target.files[0];
    if (!file) return;

    // Reset player
    stopPlayback();
    playerState.mode = 'none';
    playerState.duration = 0;
    playerState.currentTime = 0;
    updateTimeDisplay();

    try {
        if (!analyser) {
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 1024;
            analyser.smoothingTimeConstant = 0.8;
            analyser.connect(audioContext.destination);
        }

        // Check file extension for AIFF to skip HTMLAudioElement
        // Chrome and some other browsers don't support AIFF in <audio> tags
        const isAIFF = file.name.toLowerCase().endsWith('.aiff') || file.name.toLowerCase().endsWith('.aif');

        // Always use AudioBuffer for reliable mobile performance and visualization
        // HTMLAudioElement is flaky on iOS without direct user interaction for every step
        console.log('Loading audio as AudioBuffer...');
        await loadAudioAsBuffer(file);
        console.log('Loaded as AudioBuffer');

        // UI Updates
        const dropZone = document.getElementById('dropZone');
        const audioPlayer = document.getElementById('audioPlayer');
        const playBtn = document.getElementById('playBtn');

        if (dropZone) dropZone.style.display = 'none';
        if (audioPlayer) {
            // Ensure centered layout
            audioPlayer.style.display = 'flex';
            audioPlayer.style.justifyContent = 'center';
            audioPlayer.style.width = '100%';
        }
        if (playBtn) playBtn.disabled = false;

        // Reset file input
        e.target.value = '';

    } catch (error) {
        console.error('Audio loading error:', error);
        alert(`音声ファイルの読み込みに失敗しました。\nエラー詳細: ${error.message || 'Unknown error'}`);
    }
}

function loadAudioAsElement(file) {
    return new Promise((resolve, reject) => {
        const objectURL = URL.createObjectURL(file);
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';

        const timeout = setTimeout(() => {
            reject(new Error('Timeout waiting for metadata'));
        }, 5000);

        audio.onloadedmetadata = () => {
            clearTimeout(timeout);
            playerState.mode = 'element';
            playerState.element = audio;
            playerState.duration = audio.duration;

            try {
                // Connect to analyser
                const source = audioContext.createMediaElementSource(audio);
                source.connect(analyser);
                playerState.sourceNode = source;
            } catch (e) {
                console.warn('MediaElementSource creation failed, trying reset:', e);
                reject(e);
                return;
            }

            // Event listeners
            audio.ontimeupdate = () => {
                if (playerState.mode === 'element') {
                    playerState.currentTime = audio.currentTime;
                    updateTimeDisplay();
                }
            };

            audio.onended = () => {
                togglePlayback(false);
                playerState.currentTime = 0;
                updateTimeDisplay();
            };

            resolve();
        };

        audio.onerror = (e) => {
            clearTimeout(timeout);
            reject(new Error(`Audio element error: ${e.type}`));
        };

        // Set src AFTER listeners are attached to prevent race condition
        audio.src = objectURL;
        audio.load();
    });
}

function loadAudioAsBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;
                let audioBuffer;

                // Check if it's an AIFF file
                const isAIFF = file.name.toLowerCase().endsWith('.aiff') || file.name.toLowerCase().endsWith('.aif');

                if (isAIFF) {
                    console.log('Using custom AIFF decoder...');
                    audioBuffer = await decodeAIFF(arrayBuffer);
                } else {
                    // Use native decoder for other formats
                    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                }

                playerState.mode = 'buffer';
                playerState.buffer = audioBuffer;
                playerState.duration = audioBuffer.duration;
                playerState.currentTime = 0;
                playerState.pauseTime = 0;

                resolve();
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

async function togglePlayback(play) {
    if (playerState.mode === 'none') return;

    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    if (play) {
        if (playerState.mode === 'element') {
            await playerState.element.play();
        } else if (playerState.mode === 'buffer') {
            playBuffer();
        }
        playerState.isPlaying = true;
        document.getElementById('playBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
    } else {
        if (playerState.mode === 'element') {
            playerState.element.pause();
        } else if (playerState.mode === 'buffer') {
            stopBuffer();
            playerState.pauseTime = playerState.currentTime;
        }
        playerState.isPlaying = false;
        document.getElementById('playBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
    }
}

function playBuffer(shouldLoop = false) {
    // Re-create source node (they are one-time use)
    const source = audioContext.createBufferSource();
    source.buffer = playerState.buffer;
    source.loop = shouldLoop;
    source.connect(analyser);

    playerState.sourceNode = source;
    playerState.startTime = audioContext.currentTime - playerState.pauseTime;

    source.start(0, playerState.pauseTime);

    source.onended = () => {
        if (playerState.isPlaying && playerState.currentTime >= playerState.duration - 0.1) {
            // Natural end
            togglePlayback(false);
            playerState.pauseTime = 0;
            playerState.currentTime = 0;
            updateTimeDisplay();
        }
    };
}

function stopBuffer() {
    if (playerState.sourceNode) {
        try {
            playerState.sourceNode.stop();
            playerState.sourceNode.disconnect();
        } catch (e) {
            // Ignore if already stopped
        }
        playerState.sourceNode = null;
    }
}

function stopPlayback() {
    if (playerState.sourceNode) {
        try {
            playerState.sourceNode.disconnect();
        } catch (e) {
            // Ignore if already disconnected
        }
        playerState.sourceNode = null;
    }

    if (playerState.mode === 'element' && playerState.element) {
        playerState.element.pause();
        playerState.element.currentTime = 0;
        // Optionally revoke object URL if we stored it, but we didn't store the URL string itself.
        // Doing strict cleanup is good.
        playerState.element.src = '';
        playerState.element.load();
    } else if (playerState.mode === 'buffer') {
        stopBuffer();
    }
    playerState.isPlaying = false;
    playerState.pauseTime = 0;
    playerState.currentTime = 0;
}

function seek(time) {
    time = Math.max(0, Math.min(time, playerState.duration));
    playerState.currentTime = time;

    if (playerState.mode === 'element') {
        playerState.element.currentTime = time;
    } else if (playerState.mode === 'buffer') {
        playerState.pauseTime = time;
        if (playerState.isPlaying) {
            stopBuffer();
            playBuffer();
        }
    }
    updateTimeDisplay();
}

// ==================== VISUALIZATION ====================

function createPill() {
    const pillGroup = new THREE.Group();

    const whiteMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.3,
        roughness: 0.4,
        wireframe: wireframeMode
    });

    const blackMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        metalness: 0.3,
        roughness: 0.4,
        wireframe: wireframeMode
    });

    if (blockMode) {
        const topBox = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), whiteMat);
        topBox.position.y = 0.5;
        pillGroup.add(topBox);

        const bottomBox = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), blackMat);
        bottomBox.position.y = -0.5;
        pillGroup.add(bottomBox);
    } else {
        const topCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 32), whiteMat);
        topCyl.position.y = 0.5;
        pillGroup.add(topCyl);

        const bottomCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 32), blackMat);
        bottomCyl.position.y = -0.5;
        pillGroup.add(bottomCyl);

        const topSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2),
            whiteMat
        );
        topSphere.position.y = 1;
        pillGroup.add(topSphere);

        const bottomSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2),
            blackMat
        );
        bottomSphere.position.y = -1;
        bottomSphere.rotation.x = Math.PI;
        pillGroup.add(bottomSphere);
    }

    return pillGroup;
}

function createPills() {
    pillGroups.forEach(pill => {
        scene.remove(pill);
        pill.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    });
    pillGroups = [];

    for (let i = 0; i < pillCount; i++) {
        const pill = createPill();
        if (pillCount === 1) {
            pill.position.set(0, 0, 0);
        } else {
            const angle = (i / pillCount) * Math.PI * 2;
            pill.position.set(
                Math.cos(angle) * spreadWidth,
                0,
                Math.sin(angle) * spreadWidth
            );
        }
        scene.add(pill);
        pillGroups.push(pill);
    }
}

function animateSound() {
    if (!isAnimating) {
        if (animationId) cancelAnimationFrame(animationId);
        animationId = null;
        return;
    }

    // Prevent double loops
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(animateSound);

    // Auto Mode Modulation (GOD SPEED - Full Random)
    if (autoMode && visualController) {
        const now = Date.now();
        // Update every 3 seconds with random values
        if (now - autoModeLastUpdate > 3000) {
            autoModeLastUpdate = now;

            // Random values within valid ranges
            const limits = CONFIG.SOUND_MACHINE.CONTROL_LIMITS;
            const randomCapsules = Math.floor(Math.random() * (limits.PILL_COUNT.MAX - limits.PILL_COUNT.MIN + 1)) + limits.PILL_COUNT.MIN;
            const randomSize = limits.PILL_SIZE.MIN + Math.random() * (limits.PILL_SIZE.MAX - limits.PILL_SIZE.MIN);
            const randomSpread = limits.SPREAD.MIN + Math.random() * (limits.SPREAD.MAX - limits.SPREAD.MIN);
            const randomRotation = limits.ROTATION.MIN + Math.random() * (limits.ROTATION.MAX - limits.ROTATION.MIN);
            const randomScale = limits.SCALE.MIN + Math.random() * (limits.SCALE.MAX - limits.SCALE.MIN);

            visualController.updateParam('pillCount', randomCapsules);
            visualController.updateParam('pillSize', randomSize);
            visualController.updateParam('spread', randomSpread);
            visualController.updateParam('rotation', randomRotation);
            visualController.updateParam('scale', randomScale);
        }
    }

    // Update time for buffer mode
    if (playerState.mode === 'buffer' && playerState.isPlaying) {
        playerState.currentTime = audioContext.currentTime - playerState.startTime;
        if (playerState.currentTime > playerState.duration) {
            playerState.currentTime = playerState.duration;
        }
        updateTimeDisplay();
    }

    if (analyser && playerState.isPlaying) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        const bufferLength = dataArray.length;
        const lowEnd = Math.floor(bufferLength * 0.1);
        const midEnd = Math.floor(bufferLength * 0.5);

        let low = 0, mid = 0, high = 0;

        for (let i = 0; i < lowEnd; i++) low += dataArray[i];
        for (let i = lowEnd; i < midEnd; i++) mid += dataArray[i];
        for (let i = midEnd; i < bufferLength; i++) high += dataArray[i];

        low = (low / lowEnd) / 255;
        mid = (mid / (midEnd - lowEnd)) / 255;
        high = (high / (bufferLength - midEnd)) / 255;

        frequencyData = { low, mid, high };
        updateFrequencyBars();

        // [AI] Global Sync for Brain Hack & Other Modules
        window.currentAudioLevel = (low + mid + high) / 3;
        window.currentKick = low;
        // Basic beat simulation if no explicit BPM detector is active
        window.currentBeatProgress = (Date.now() % 500) / 500;
    } else {
        // When not playing, use cached frequency data (smooth idle animation)
        frequencyData.low *= 0.95;
        frequencyData.mid *= 0.95;
        frequencyData.high *= 0.95;
    }

    pillGroups.forEach((pillGroup, index) => {
        const audioReaction = (frequencyData.low + frequencyData.mid + frequencyData.high) / 3;
        const targetScale = pillSize + audioReaction * 1.0 * scaleIntensity;
        pillGroup.scale.set(targetScale, targetScale, targetScale);

        pillGroup.rotation.x += (0.005 + frequencyData.mid * 0.02) * rotationSpeed;
        pillGroup.rotation.y += (0.003 + frequencyData.low * 0.01) * rotationSpeed;
        pillGroup.rotation.z += (0.002 + frequencyData.high * 0.015) * rotationSpeed;

        if (pillCount > 1) {
            const angle = (index / pillCount) * Math.PI * 2;
            pillGroup.position.x = Math.cos(angle) * spreadWidth;
            pillGroup.position.z = Math.sin(angle) * spreadWidth;
        }
    });

    renderer.render(scene, camera);
}

function updateFrequencyBars() {
    const freqTypes = ['low', 'mid', 'high'];
    freqTypes.forEach(type => {
        const bars = document.querySelectorAll(`#${type}Freq .freq-bar`);
        const value = frequencyData[type.replace('Freq', '')];
        bars.forEach((bar, index) => {
            if (value > index / 10) {
                bar.classList.add('active');
            } else {
                bar.classList.remove('active');
            }
        });
    });
}

function updateTimeDisplay() {
    const currentTimeEl = document.getElementById('currentTime');
    const durationEl = document.getElementById('duration');
    const progressBar = document.getElementById('seekBarProgress');

    if (currentTimeEl) currentTimeEl.textContent = formatTime(playerState.currentTime);
    if (durationEl) durationEl.textContent = formatTime(playerState.duration);
    if (progressBar) {
        const progress = playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0;
        progressBar.style.width = `${progress}%`;
    }
}

function formatTime(sec) {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}
