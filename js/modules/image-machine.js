// ==================== IMAGE MACHINE ====================
import { CONFIG } from '../config/config.js';
import { getDialogue } from '../data/dialogue.js';
import { playAmbientMusic, stopAmbientMusic } from './sound-machine.js';
import { initVoidKeyboard, showInputKeyboard, setDialogueInputCallback, handleCapsuleChoice } from './void-input.js';
import { broadcastEvent, initSync } from '../utils/sync.js';
import { getImageAlt } from '../data/image-descriptions.js';
import { AccessibilitySettings } from './accessibility-controller.js';


export const imageMachineSketch = (p) => {
    // GOD SPEED: Disable friendly errors for max performance
    p.disableFriendlyErrors = true;

    const isTouch = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const imageCount = CONFIG.IMAGE_MACHINE.TOTAL_IMAGES;
    const imageFileNames = [];


    // Generate image file names
    // Generate image file names with correct extensions
    for (let i = 1; i <= imageCount; i++) {
        const ext = i >= CONFIG.IMAGE_MACHINE.PNG_START_INDEX ? CONFIG.IMAGE_MACHINE.PNG_EXTENSION : CONFIG.IMAGE_MACHINE.FILE_EXTENSION;
        imageFileNames.push(`${CONFIG.IMAGE_MACHINE.PATH_PREFIX}${i.toString().padStart(3, '0')}${ext}`);
    }

    // Fallback color patterns if images not available
    const colorPatterns = CONFIG.COLOR_PATTERNS;

    let allImages = {};
    let currentImageKey = null;
    let nextImageKey = null;
    let animationState = 'loading';
    let animationFrame = 0;
    let transitionType = 'blocks';
    const chaosDuration = CONFIG.IMAGE_MACHINE.CHAOS_DURATION;
    const transitionDuration = AccessibilitySettings.reducedMotion ? 2 : CONFIG.IMAGE_MACHINE.TRANSITION_DURATION;
    let promptTimer = null;
    let useColorMode = false; // Flag for fallback mode
    let imageLoadAttempts = 0;
    const maxLoadAttempts = 3;
    let loadStartTime = 0; // [AI IMPROVEMENT] Track load timing

    // Available transition effects (GOD SPEED - removed heavy particle/noise effects)
    const transitionEffects = [
        'blocks',
        'slide',
        'pixelate',
        'stripe',
        'grid',
        'wipe',
        'curtain',
        'rgb-split',
        'scan',
        'glitch',  // Simple glitch
        'shatter', // Optimised fragments
        'chromatic' // Lightweight color offset
        // Removed: 'noise', 'particles', 'kaleidoscope', 'ripple' for performance
    ];

    // Terminal State
    const AI_DIALOGUE = getDialogue(); // Get dialogue based on browser language
    let terminalLog = [];
    let dialogueIndex = 0;
    let charIndex = 0;
    let lastTypeTime = 0;
    const typeInterval = 40; // ms per char (fast hacker typing)
    let waitingForInput = false; // Track if waiting for user input
    let currentInputType = null; // 'yn' or 'capsule'
    let userInput = ''; // Store user's input choice
    let energySaver = false; // LOW POWER MODE
    let oledSaver = false; // OLED SAVER (True black)
    let autoMode = false;
    let lastAutoSwitchTime = 0;
    let autoSwitchInterval = 8000; // 8 seconds default

    p.setup = () => {
        try {
            const container = document.getElementById('imageCanvas-container');
            if (!container) {
                console.error('Image container not found');
                return;
            }
            const w = container.offsetWidth || 300; // Fallback width
            const h = container.offsetHeight || 300; // Fallback height
            p.createCanvas(w, h).parent(container);

            // BAKUSOKU MODE: Performance optimizations for mobile
            if (isTouch()) {
                p.pixelDensity(1);
                p.frameRate(30); // Cap mobile to 30fps for stability
            }

            // [AI] ENERGY SAVER INITIALIZATION
            p.setEnergySaver = (val) => {
                energySaver = val;
                if (energySaver) {
                    p.frameRate(15);
                    p.pixelDensity(0.5);
                    console.log("ENERGY SAVER ACTIVATED: 15FPS / Low Res");
                } else {
                    p.frameRate(isTouch() ? 30 : 60);
                    p.pixelDensity(1);
                    console.log("NORMAL POWER MODE: 30/60FPS");
                }
            };

            p.background(255);

            // Load photo080.webp as default
            const initialIndex = CONFIG.IMAGE_MACHINE.INITIAL_IMAGE_INDEX; // photo080.webp (0-indexed)
            loadImageDynamically(imageFileNames[initialIndex], (result) => {
                if (result.success) {
                    currentImageKey = result.img.filePath;
                    if (result.img.loadPixels) result.img.loadPixels(); // Initial load
                    useColorMode = false;
                    startPreloading();
                } else {
                    // Use color pattern fallback
                    useColorMode = true;
                    currentImageKey = `color-${p.floor(p.random(colorPatterns.length))}`;
                }
                animationState = 'display';
                document.getElementById('imagePrompt').classList.remove('hidden');
                promptTimer = setTimeout(() => {
                    document.getElementById('imagePrompt').classList.add('hidden');
                }, 3000);
            });
        } catch (error) {
            console.error('Setup error:', error);
            // Fallback to color mode
            useColorMode = true;
            currentImageKey = `color-0`;
            animationState = 'display';
        }

        // [AI] URL Parameter check for Image Auto Mode
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('image-auto') === 'true' || urlParams.get('auto') === 'true') {
            autoMode = true;
            console.log("IMAGE MACHINE: AUTO MODE TRIGGERED");
        }

        // Global accessor to toggle auto mode
        window.setImageAuto = (val) => {
            autoMode = val;
            console.log("IMAGE MACHINE: AUTO MODE =", autoMode);
        };

        // Initialize VOID dialogue input system
        initVoidKeyboard();
        setDialogueInputCallback((key) => {
            handleDialogueInputKey(key);
        });

        // [AI] CROSS-TAB MIRRORING SYNC
        initSync({
            'trigger-secret': (detail) => {
                console.log("[SYNC] Remote Trigger:", detail.code);
                p.triggerSecret(detail.code, true); // Pass true to avoid re-broadcasting
            },
            'energy-saver': (detail) => {
                p.setEnergySaver(detail.value);
            }
        });
    };

    p.draw = () => {
        try {
            if (!currentImageKey) {
                p.background(255);
                return;
            }

            const currentContent = useColorMode ?
                getColorPattern(currentImageKey) :
                allImages[currentImageKey];

            // [AI IMPROVEMENT] Handle PENDING state for nextContent
            let nextContent = null;
            if (nextImageKey && nextImageKey !== 'PENDING') {
                nextContent = useColorMode ?
                    getColorPattern(nextImageKey) :
                    allImages[nextImageKey];
            }

            if (!currentContent && !useColorMode) {
                p.background(255);
                return;
            }

            switch (animationState) {
                case 'pre_terminal_noise':
                    drawPreTerminalNoise();
                    animationFrame++;
                    // 60fps * 5s = 300 frames
                    if (animationFrame > 300) {
                        animationFrame = 0;
                        animationState = 'terminal';

                        // Invert and grayscale the entire site for Terminal Mode
                        document.documentElement.style.filter = 'invert(1) grayscale(1)';

                        // FORCE PURITY: Set all backgrounds to PURE WHITE so they invert to PURE BLACK
                        const r = document.documentElement.style;
                        r.setProperty('--color-bg-primary', '#ffffff');
                        r.setProperty('--color-bg-secondary', '#ffffff');
                        r.setProperty('--color-bg-tertiary', '#ffffff');
                        r.setProperty('--color-text-primary', '#000000');
                        r.setProperty('--color-text-secondary', '#000000');
                        r.setProperty('--color-text-tertiary', '#000000');

                        // Force header to pure white (remove transparency for solid black invert)
                        const header = document.querySelector('.site-header');
                        if (header) header.style.background = '#ffffff';

                        // To get BLACK background with invert(1), we must set the actual background to WHITE
                        document.documentElement.style.backgroundColor = '#ffffff';
                        document.body.style.backgroundColor = '#ffffff';
                    }
                    break;
                case 'terminal':
                    drawTerminal();
                    break;
                case 'decay':
                    runTransition(currentContent, animationFrame / transitionDuration, true);
                    animationFrame++;
                    if (animationFrame > transitionDuration) {
                        animationFrame = 0;
                        animationState = 'chaos';
                    }
                    break;

                case 'chaos':
                    // [AI IMPROVEMENT] If nextContent is still loading (PENDING), draw current or noise
                    if (!nextContent) {
                        drawGlitch(currentContent); // Stay on current glitch while waiting
                    } else {
                        drawGlitch(nextContent);
                    }

                    animationFrame++;
                    // [AI IMPROVEMENT] Only proceed to rebuild if we have a valid nextImageKey (not PENDING)
                    // OR if the load has timed out (3 seconds safety)
                    const loadElapsed = nextImageKey === 'PENDING' ? (p.millis() - loadStartTime) : 0;
                    const isTimedOut = loadElapsed > 3000;

                    if (animationFrame > chaosDuration && (nextImageKey !== 'PENDING' || isTimedOut)) {

                        if (isTimedOut && nextImageKey === 'PENDING') {
                            console.warn("[IMAGE] Load timeout exceeded in CHAOS state. Forcing color fallback.");
                            useColorMode = true;
                            nextImageKey = `color-${p.floor(p.random(colorPatterns.length))}`;
                        }

                        animationFrame = 0;
                        animationState = 'rebuild';

                        // Sync current image
                        if (nextImageKey && nextImageKey.startsWith('/photos/')) {
                            currentImageKey = nextImageKey;
                            useColorMode = false;
                        } else if (nextImageKey && nextImageKey.startsWith('color-')) {
                            currentImageKey = nextImageKey;
                            useColorMode = true;
                        }

                        // Update indicators (e.g. 01/363)
                        const counter = document.querySelector('.image-counter') || document.querySelector('.indicator');
                        if (counter) {
                            const num = currentImageKey.match(/\d+/) || ['01'];
                            counter.innerText = num[0].toString().padStart(2, '0');
                        }

                        // [AI ACCESSIBILITY] Update Canvas ARIA label
                        const canvas = p.canvas;
                        if (canvas) {
                            const filename = currentImageKey ? currentImageKey.split('/').pop() : '';
                            const altText = useColorMode ? 'Generative color pattern' : getImageAlt(filename);
                            canvas.setAttribute('aria-label', `IMAGE MACHINE: ${altText}`);

                            // Log for debugging
                            console.log(`[ACCESSIBILITY] Updated ARIA-label: ${altText}`);
                        }

                        nextImageKey = null;
                    }
                    break;

                case 'rebuild':
                    const rebuildContent = useColorMode ?
                        getColorPattern(currentImageKey) :
                        allImages[currentImageKey];

                    // Mobile safety: if content is missing, force color mode
                    if (!rebuildContent && !useColorMode) {
                        console.log("Rebuild content missing, switching to color mode");
                        useColorMode = true;
                        currentImageKey = 'color-0';
                    }

                    const safeContent = useColorMode ?
                        getColorPattern(currentImageKey) :
                        rebuildContent;

                    if (safeContent) {
                        runTransition(safeContent, animationFrame / transitionDuration, false);
                    } else {
                        // Ultimate fallback: draw solid color
                        p.background(0);
                    }

                    animationFrame++;
                    if (animationFrame > transitionDuration) {
                        animationFrame = 0;
                        animationState = 'display';
                        promptTimer = setTimeout(() => {
                            document.getElementById('imagePrompt').classList.remove('hidden');
                        }, 5000);
                    }
                    break;

                case 'mix_noise':
                    drawPreTerminalNoise();
                    animationFrame++;
                    // Short noise burst (e.g. 60 frames = ~1-2 sec)
                    if (animationFrame > 60) {
                        animationFrame = 0;

                        // Function to trigger the actual MIX mode logic
                        const startMixDisplay = () => {
                            // Keep the inverted visual style from VOID mode
                            // No need for RETURN button - user can 2-tap title to exit

                            // Resize canvas for fullscreen experience
                            const container = document.getElementById('imageCanvas-container');
                            if (container) {
                                p.resizeCanvas(container.offsetWidth, container.offsetHeight);
                            }

                            // Start with a random image from the collection
                            const keys = Object.keys(allImages);
                            if (keys.length > 0) {
                                currentImageKey = keys[p.floor(p.random(keys.length))];
                                useColorMode = false;
                            }

                            // [VOID MODE] Enable auto-switching immediately
                            autoMode = true;
                            lastAutoSwitchTime = p.millis();
                            autoSwitchInterval = 5000; // Start with 5 seconds, then randomize

                            // Hide the CLICK/TAP prompt in VOID mode
                            const prompt = document.getElementById('imagePrompt');
                            if (prompt) prompt.classList.add('hidden');

                            console.log('[VOID] Auto-switch mode activated - 2-tap title to exit');

                            animationState = 'display';
                        };

                        startMixDisplay();
                    }
                    break;

                case 'superhigh':
                    drawSuperHigh();
                    break;

                default:
                    if (useColorMode) {
                        drawColorPattern(currentContent);
                    } else {
                        drawImageFullscreen(currentContent);
                    }

                    // [AI] Auto Switching Logic
                    if (autoMode && animationState === 'display') {
                        const now = p.millis();
                        if (now - lastAutoSwitchTime > autoSwitchInterval) {
                            lastAutoSwitchTime = now;
                            // Randomize interval slightly for organic feel
                            autoSwitchInterval = p.random(6000, 12000);

                            // Trigger switch (using internal handler)
                            handleInteraction();
                        }
                    }
                    break;
            }
        } catch (error) {
            console.error('Draw error:', error);
            p.background(255);
        }
    };

    function getColorPattern(key) {
        if (!key) return null;
        const index = parseInt(key.replace('color-', ''));
        return colorPatterns[index] || colorPatterns[0];
    }

    function loadImageDynamically(filePath, callback) {
        if (allImages[filePath]) {
            callback({ success: true, img: allImages[filePath] });
            return;
        }

        imageLoadAttempts++;

        p.loadImage(filePath,
            (img) => {
                img.filePath = filePath;
                allImages[filePath] = img;
                imageLoadAttempts = 0;
                callback({ success: true, img: img });
            },
            () => {
                console.warn(`[IMAGE] Failed to load: ${filePath} (Attempt ${imageLoadAttempts}/${maxLoadAttempts})`);
                if (imageLoadAttempts < maxLoadAttempts) {
                    const newIndex = p.floor(p.random(imageFileNames.length));
                    // [AI IMPROVEMENT] Add exponential backoff for retries to avoid flooding during 429
                    const delay = 500 * Math.pow(2, imageLoadAttempts - 1);
                    setTimeout(() => {
                        loadImageDynamically(imageFileNames[newIndex], callback);
                    }, delay);
                } else {
                    console.error('[IMAGE] Max load attempts reached. Falling back to color mode.');
                    imageLoadAttempts = 0;
                    callback({ success: false });
                }
            }
        );
    }

    // Background preloading logic - SEQUENTIAL & THROTTLED
    function startPreloading() {
        let preloadIndex = 0;
        const shuffledAttributes = [...imageFileNames].sort(() => 0.5 - Math.random());

        const loadNext = () => {
            if (preloadIndex >= shuffledAttributes.length) return;

            // BAKUSOKU MODE with safety: Limit concurrent requests
            const maxPreloadCount = isTouch() ? 15 : 60; // Reduced from 100 for better CPU
            if (Object.keys(allImages).length > maxPreloadCount) {
                console.log("[IMAGE] Sequential Preload: Reached quota.");
                return;
            }

            const filePath = shuffledAttributes[preloadIndex];
            if (!allImages[filePath]) {
                p.loadImage(filePath,
                    (img) => {
                        img.filePath = filePath;
                        allImages[filePath] = img;
                        preloadIndex++;
                        // Wait for success before scheduling next to avoid 429 flood
                        const nextDelay = isTouch() ? 8000 : 3000;
                        setTimeout(loadNext, nextDelay);
                    },
                    () => {
                        // On failure, skip and move on after a delay
                        preloadIndex++;
                        setTimeout(loadNext, 5000);
                    }
                );
            } else {
                preloadIndex++;
                loadNext(); // Skip already loaded
            }
        };

        // Delay start to prioritize main interaction
        setTimeout(loadNext, 12000);
    }

    function runTransition(content, progress, isDecay) {
        if (!content) return;

        switch (transitionType) {
            case 'blocks':
                drawBlocks(content, progress, isDecay);
                break;
            case 'slide':
                drawSlide(content, progress, isDecay);
                break;
            case 'pixelate':
                drawPixelate(content, progress, isDecay);
                break;
            case 'spiral':
                drawSpiral(content, progress, isDecay);
                break;
            case 'zoom':
                drawZoom(content, progress, isDecay);
                break;
            case 'rgb-split':
                drawRGBSplit(content, progress, isDecay);
                break;
            case 'scan':
                drawScan(content, progress, isDecay);
                break;
            case 'reveal':
                drawReveal(content, progress, isDecay);
                break;
            case 'stripe':
                drawStripe(content, progress, isDecay);
                break;
            case 'fade':
                drawFade(content, progress, isDecay);
                break;
            case 'grid':
                drawGrid(content, progress, isDecay);
                break;
            case 'wipe':
                drawWipe(content, progress, isDecay);
                break;
            case 'dissolve':
                drawDissolve(content, progress, isDecay);
                break;
            case 'curtain':
                drawCurtain(content, progress, isDecay);
                break;
            case 'matrix':
                drawMatrix(content, progress, isDecay);
                break;
            case 'noise':
                drawNoise(content, progress, isDecay);
                break;
            case 'mosaic':
                drawMosaic(content, progress, isDecay);
                break;
            case 'kaleidoscope':
                drawKaleidoscope(content, progress, isDecay);
                break;
            case 'shatter':
                drawShatter(content, progress, isDecay);
                break;
            case 'chromatic':
                drawChromatic(content, progress, isDecay);
                break;
        }
    }

    function drawBlocks(content, progress, isDecay) {
        p.background(255);
        const blockSize = isDecay ? p.map(progress, 0, 1, 5, 100) : p.map(progress, 0, 1, 100, 5);

        if (useColorMode) {
            // Color pattern mode
            const colors = Array.isArray(content) ? content : colorPatterns[0];
            for (let y = 0; y < p.height; y += blockSize) {
                for (let x = 0; x < p.width; x += blockSize) {
                    let probability = isDecay ? progress : (1.0 - progress);
                    if (p.random() < probability) {
                        const colorIndex = p.floor(p.random(colors.length));
                        p.fill(colors[colorIndex]);
                        p.noStroke();
                        p.rect(x, y, blockSize, blockSize);
                    }
                }
            }
        } else {
            // Image mode - Optimized: loadPixels is now called once when image is assigned/loaded
            // content.loadPixels(); // Moved to transition start
            const d = p.pixelDensity();

            for (let y = 0; y < p.height; y += blockSize) {
                for (let x = 0; x < p.width; x += blockSize) {
                    let probability = isDecay ? progress : (1.0 - progress);
                    if (p.random() < probability) {
                        // Get color from pixels array directly
                        const sx = Math.floor(x);
                        const sy = Math.floor(y);
                        if (sx < content.width && sy < content.height) {
                            const index = (sx + sy * content.width) * 4;
                            const r = content.pixels[index];
                            const g = content.pixels[index + 1];
                            const b = content.pixels[index + 2];
                            // const a = content.pixels[index + 3];

                            p.fill(r, g, b);
                            p.noStroke();
                            p.rect(x, y, blockSize, blockSize);
                        }
                    }
                }
            }
        }
    }

    function drawSlide(content, progress, isDecay) {
        p.background(255);
        const sliceCount = isTouch() ? 40 : 80;
        const sliceHeight = p.height / sliceCount;

        if (useColorMode) {
            // Color pattern mode
            const colors = Array.isArray(content) ? content : colorPatterns[0];
            for (let i = 0; i < sliceCount; i++) {
                let y = i * sliceHeight;
                let currentProgress = isDecay ? progress : 1.0 - progress;
                let slideAmount = p.map(currentProgress, 0, 1, 0, p.width) * p.noise(i * 0.1);
                let dx = p.random(-slideAmount, slideAmount);
                const colorIndex = p.floor(p.random(colors.length));
                p.fill(colors[colorIndex]);
                p.noStroke();
                p.rect(dx, y, p.width, sliceHeight);
            }
        } else {
            // Image mode
            for (let i = 0; i < sliceCount; i++) {
                let y = i * sliceHeight;
                let currentProgress = isDecay ? progress : 1.0 - progress;
                let slideAmount = p.map(currentProgress, 0, 1, 0, p.width) * p.noise(i * 0.1, p.frameCount * 0.01);
                let sx = 0;
                let dx = p.random(-slideAmount, slideAmount);
                p.copy(content, Math.floor(sx), Math.floor(y), Math.floor(content.width), Math.floor(sliceHeight), Math.floor(dx), Math.floor(y), Math.floor(p.width), Math.floor(sliceHeight));
            }
        }
    }

    function drawPixelate(content, progress, isDecay) {
        p.background(255);
        const pixelSize = isDecay ?
            p.map(progress, 0, 1, 1, 50) :
            p.map(progress, 0, 1, 50, 1);

        if (useColorMode) {
            const colors = Array.isArray(content) ? content : colorPatterns[0];
            for (let y = 0; y < p.height; y += pixelSize) {
                for (let x = 0; x < p.width; x += pixelSize) {
                    const colorIndex = p.floor(p.random(colors.length));
                    p.fill(colors[colorIndex]);
                    p.noStroke();
                    p.rect(x, y, pixelSize, pixelSize);
                }
            }
        } else {
            // Optimized: loadPixels moved to transition start
            // content.loadPixels();

            for (let y = 0; y < p.height; y += pixelSize) {
                for (let x = 0; x < p.width; x += pixelSize) {
                    const sx = Math.floor(x);
                    const sy = Math.floor(y);

                    if (sx < content.width && sy < content.height) {
                        const index = (sx + sy * content.width) * 4;
                        const r = content.pixels[index];
                        const g = content.pixels[index + 1];
                        const b = content.pixels[index + 2];

                        p.fill(r, g, b);
                        p.noStroke();
                        p.rect(x, y, pixelSize, pixelSize);
                    }
                }
            }
        }
    }

    function drawWave(content, progress, isDecay) {
        p.background(255);
        const amplitude = isDecay ?
            p.map(progress, 0, 1, 0, 100) :
            p.map(progress, 0, 1, 100, 0);

        if (useColorMode) {
            const colors = Array.isArray(content) ? content : colorPatterns[0];
            for (let y = 0; y < p.height; y += 2) {
                const offset = p.sin(y * 0.05 + p.frameCount * 0.1) * amplitude;
                const colorIndex = p.floor(p.random(colors.length));
                p.stroke(colors[colorIndex]);
                p.line(0, y, p.width, y + offset);
            }
        } else {
            for (let y = 0; y < p.height; y += 2) {
                const offset = p.sin(y * 0.05 + p.frameCount * 0.1) * amplitude;
                p.copy(content, 0, Math.floor(y), Math.floor(content.width), 2, Math.floor(offset), Math.floor(y), Math.floor(p.width), 2);
            }
        }
    }

    function drawSpiral(content, progress, isDecay) {
        p.background(255);
        const maxRadius = p.dist(0, 0, p.width / 2, p.height / 2);
        const currentRadius = isDecay ?
            p.map(progress, 0, 1, maxRadius, 0) :
            p.map(progress, 0, 1, 0, maxRadius);

        const centerX = p.width / 2;
        const centerY = p.height / 2;
        const segments = 200;

        if (!useColorMode && content) {
            // Optimized: loadPixels is handled at transition start
        }

        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * p.TWO_PI * 8;
            const radius = (i / segments) * currentRadius;
            const x = centerX + p.cos(angle) * radius;
            const y = centerY + p.sin(angle) * radius;
            const size = 10;

            if (x >= 0 && x < p.width && y >= 0 && y < p.height) {
                if (useColorMode) {
                    const colors = Array.isArray(content) ? content : colorPatterns[0];
                    const colorIndex = p.floor(p.random(colors.length));
                    p.fill(colors[colorIndex]);
                } else {
                    const sx = Math.floor(x);
                    const sy = Math.floor(y);
                    if (sx < content.width && sy < content.height) {
                        const index = (sx + sy * content.width) * 4;
                        const r = content.pixels[index];
                        const g = content.pixels[index + 1];
                        const b = content.pixels[index + 2];
                        p.fill(r, g, b);
                    } else {
                        continue;
                    }
                }
                p.noStroke();
                p.ellipse(x, y, size, size);
            }
        }
    }

    function drawZoom(content, progress, isDecay) {
        p.background(255);
        const scale = isDecay ?
            p.map(progress, 0, 1, 1, 2.5) :
            p.map(progress, 0, 1, 2.5, 1);
        const opacity = isDecay ?
            p.map(progress, 0, 1, 255, 0) :
            p.map(progress, 0, 1, 0, 255);

        p.push();
        p.translate(p.width / 2, p.height / 2);
        p.scale(scale);
        p.translate(-p.width / 2, -p.height / 2);
        p.tint(255, opacity);

        if (useColorMode) {
            drawColorPattern(content);
        } else {
            drawImageFullscreen(content);
        }
        p.pop();
    }

    function drawRGBSplit(content, progress, isDecay) {
        p.background(255);
        const offset = isDecay ?
            p.map(progress, 0, 1, 0, 30) :
            p.map(progress, 0, 1, 30, 0);

        if (!useColorMode && content) {
            // Draw three times with offset
            p.push();
            p.imageMode(p.CENTER);
            const canvasRatio = p.width / p.height;
            const imageRatio = content.width / content.height;
            let w, h;

            if (canvasRatio > imageRatio) {
                w = p.width;
                h = p.width / imageRatio;
            } else {
                w = p.height * imageRatio;
                h = p.height;
            }

            p.tint(255, 0, 0, 150);
            p.image(content, p.width / 2 - offset, p.height / 2, w, h);

            p.tint(0, 255, 0, 150);
            p.image(content, p.width / 2, p.height / 2, w, h);

            p.tint(0, 0, 255, 150);
            p.image(content, p.width / 2 + offset, p.height / 2, w, h);

            p.noTint();
            p.pop();
        } else {
            drawColorPattern(content);
        }
    }

    function drawScan(content, progress, isDecay) {
        p.background(255);
        const scanLine = isDecay ?
            p.map(progress, 0, 1, 0, p.height) :
            p.map(progress, 0, 1, p.height, 0);

        if (useColorMode) {
            const colors = Array.isArray(content) ? content : colorPatterns[0];
            const gridSize = 20;
            for (let y = 0; y < scanLine; y += gridSize) {
                for (let x = 0; x < p.width; x += gridSize) {
                    const colorIndex = p.floor(p.random(colors.length));
                    p.fill(colors[colorIndex]);
                    p.noStroke();
                    p.rect(x, y, gridSize, gridSize);
                }
            }
        } else {
            p.copy(content, 0, 0, Math.floor(content.width), Math.floor(content.height * (scanLine / p.height)),
                0, 0, Math.floor(p.width), Math.floor(scanLine));
        }

        // Scan line effect
        p.stroke(255, 255, 255, 100);
        p.strokeWeight(3);
        p.line(0, scanLine, p.width, scanLine);
    }

    function drawStripe(content, progress, isDecay) {
        p.background(255);
        const stripeCount = 20;
        const stripeWidth = p.width / stripeCount;
        const currentProgress = isDecay ? progress : 1 - progress;

        for (let i = 0; i < stripeCount; i++) {
            const x = i * stripeWidth;
            const delay = (i / stripeCount) * 0.5;
            const localProgress = p.constrain((currentProgress - delay) / 0.5, 0, 1);
            const offsetY = p.map(localProgress, 0, 1, 0, p.height);

            if (useColorMode) {
                const colors = Array.isArray(content) ? content : colorPatterns[0];
                const colorIndex = p.floor(p.random(colors.length));
                p.fill(colors[colorIndex]);
                p.noStroke();
                p.rect(x, offsetY, stripeWidth, p.height - offsetY);
            } else {
                p.copy(content, Math.floor(x), 0, Math.floor(stripeWidth), Math.floor(content.height),
                    Math.floor(x), Math.floor(offsetY), Math.floor(stripeWidth), Math.floor(p.height - offsetY));
            }
        }
    }

    function drawFade(content, progress, isDecay) {
        p.background(255);
        const opacity = isDecay ?
            p.map(progress, 0, 1, 255, 0) :
            p.map(progress, 0, 1, 0, 255);

        p.push();
        p.tint(255, opacity);

        if (useColorMode) {
            drawColorPattern(content);
        } else {
            drawImageFullscreen(content);
        }

        p.pop();
    }

    function drawGrid(content, progress, isDecay) {
        p.background(255);
        const gridSize = 8;
        const cellWidth = p.width / gridSize;
        const cellHeight = p.height / gridSize;

        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const index = row * gridSize + col;
                const delay = (index / (gridSize * gridSize)) * 0.7;
                const currentProgress = isDecay ? progress : 1 - progress;
                const localProgress = p.constrain((currentProgress - delay) / 0.3, 0, 1);

                if (localProgress > 0) {
                    const x = col * cellWidth;
                    const y = row * cellHeight;
                    const scale = isDecay ?
                        p.map(localProgress, 0, 1, 1, 0) :
                        p.map(localProgress, 0, 1, 0, 1);

                    p.push();
                    p.translate(x + cellWidth / 2, y + cellHeight / 2);
                    p.scale(scale);
                    p.translate(-cellWidth / 2, -cellHeight / 2);

                    if (useColorMode) {
                        const colors = Array.isArray(content) ? content : colorPatterns[0];
                        const colorIndex = p.floor(p.random(colors.length));
                        p.fill(colors[colorIndex]);
                        p.noStroke();
                        p.rect(0, 0, cellWidth, cellHeight);
                    } else {
                        const srcX = p.map(col, 0, gridSize, 0, content.width);
                        const srcY = p.map(row, 0, gridSize, 0, content.height);
                        const srcW = content.width / gridSize;
                        const srcH = content.height / gridSize;
                        p.image(content, 0, 0, cellWidth, cellHeight,
                            srcX, srcY, srcW, srcH);
                    }

                    p.pop();
                }
            }
        }
    }

    function drawReveal(content, progress, isDecay) {
        p.background(255);
        const circleCount = 30;
        const maxRadius = p.dist(0, 0, p.width, p.height);

        if (useColorMode) {
            drawColorPattern(content);
        } else {
            drawImageFullscreen(content);
        }

        // Draw reveal circles
        for (let i = 0; i < circleCount; i++) {
            const x = p.random(p.width);
            const y = p.random(p.height);
            const radius = isDecay ?
                p.map(progress, 0, 1, maxRadius, 0) * p.random(0.5, 1.5) :
                p.map(progress, 0, 1, 0, maxRadius) * p.random(0.5, 1.5);

            p.fill(255);
            p.noStroke();
            p.circle(x, y, radius);
        }
    }

    function drawWipe(content, progress, isDecay) {
        p.background(255);
        const wipePosition = isDecay ?
            p.map(progress, 0, 1, 0, p.width) :
            p.map(progress, 0, 1, p.width, 0);

        if (useColorMode) {
            const colors = Array.isArray(content) ? content : colorPatterns[0];
            for (let x = 0; x < wipePosition; x += 20) {
                for (let y = 0; y < p.height; y += 20) {
                    const colorIndex = p.floor(p.random(colors.length));
                    p.fill(colors[colorIndex]);
                    p.noStroke();
                    p.rect(x, y, 20, 20);
                }
            }
        } else {
            p.push();
            p.noStroke();
            p.fill(255);
            p.rect(wipePosition, 0, p.width - wipePosition, p.height);
            p.pop();

            if (wipePosition > 0) {
                p.copy(content, 0, 0, Math.floor(content.width * (wipePosition / p.width)), Math.floor(content.height),
                    0, 0, Math.floor(wipePosition), Math.floor(p.height));
            }
        }
    }

    function drawDissolve(content, progress, isDecay) {
        p.background(255);
        const threshold = isDecay ? progress : 1 - progress;

        if (useColorMode) {
            const colors = Array.isArray(content) ? content : colorPatterns[0];
            for (let y = 0; y < p.height; y += 2) {
                for (let x = 0; x < p.width; x += 2) {
                    if (p.random() < threshold) {
                        const colorIndex = p.floor(p.random(colors.length));
                        p.fill(colors[colorIndex]);
                        p.noStroke();
                        p.rect(x, y, 2, 2);
                    }
                }
            }
        } else {
            drawImageFullscreen(content);

            // Draw dissolve pixels
            for (let y = 0; y < p.height; y += 2) {
                for (let x = 0; x < p.width; x += 2) {
                    if (p.random() < threshold) {
                        p.fill(255);
                        p.noStroke();
                        p.rect(x, y, 2, 2);
                    }
                }
            }
        }
    }

    function drawCurtain(content, progress, isDecay) {
        p.background(255);
        const curtainHeight = isDecay ?
            p.map(progress, 0, 1, 0, p.height / 2) :
            p.map(progress, 0, 1, p.height / 2, 0);

        if (useColorMode) {
            const colors = Array.isArray(content) ? content : colorPatterns[0];
            const gridSize = 20;
            for (let y = curtainHeight; y < p.height - curtainHeight; y += gridSize) {
                for (let x = 0; x < p.width; x += gridSize) {
                    const colorIndex = p.floor(p.random(colors.length));
                    p.fill(colors[colorIndex]);
                    p.noStroke();
                    p.rect(x, y, gridSize, gridSize);
                }
            }
        } else {
            // Draw visible portion of image
            if (curtainHeight < p.height / 2) {
                const visibleHeight = p.height - (curtainHeight * 2);
                const srcHeight = content.height * (visibleHeight / p.height);
                const srcY = (content.height - srcHeight) / 2;

                p.copy(content, 0, Math.floor(srcY), Math.floor(content.width), Math.floor(srcHeight),
                    0, Math.floor(curtainHeight), Math.floor(p.width), Math.floor(visibleHeight));
            }

            // Draw curtains
            p.fill(255);
            p.noStroke();
            p.rect(0, 0, p.width, curtainHeight);
            p.rect(0, p.height - curtainHeight, p.width, curtainHeight);
        }
    }

    function drawMatrix(content, progress, isDecay) {
        p.background(0);
        const chars = '01アイウエオカキクセタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
        const fontSize = 14;
        const columns = Math.floor(p.width / fontSize);
        const matrixProgress = isDecay ? progress : 1 - progress;

        p.textSize(fontSize);
        p.textFont('monospace');

        // Draw falling matrix code
        const maxColumns = isTouch() ? Math.floor(columns / 1.5) : columns;
        for (let i = 0; i < columns; i++) {
            if (isTouch() && i % 2 !== 0) continue; // Skip half columns on mobile for SPEED

            const x = i * fontSize;
            const speed = p.random(0.5, 2);
            const yOffset = (p.frameCount * speed + i * 50) % (p.height + 100);

            const trailLength = isTouch() ? 15 : 30; // Shorter trails on mobile
            for (let j = 0; j < trailLength; j++) {
                const y = yOffset - j * fontSize;
                if (y > 0 && y < p.height) {
                    const alpha = p.map(j, 0, trailLength, 255, 0);
                    p.fill(255, 255, 255, alpha * matrixProgress);
                    const char = chars.charAt(Math.floor(p.random(chars.length)));
                    p.text(char, x, y);
                }
            }
        }

        // Reveal image through matrix
        if (!useColorMode && content) {
            const revealHeight = p.map(1 - matrixProgress, 0, 1, 0, p.height);
            if (revealHeight > 0) {
                p.push();
                p.tint(255, 255 * (1 - matrixProgress));

                // BAKUSOKU MODE: Increase block size on mobile, skip heavy pixel load
                const blockSize = isTouch() ? 20 : 10;

                // loadPixels moved to transition start
                // if (!isTouch()) {
                //     content.loadPixels();
                // }

                for (let y = 0; y < revealHeight; y += blockSize) {
                    for (let x = 0; x < p.width; x += blockSize) {
                        if (p.random() < (1 - matrixProgress)) {
                            if (content.pixels) {
                                const srcX = Math.floor((x / p.width) * content.width);
                                const srcY = Math.floor((y / p.height) * content.height);

                                if (srcX < content.width && srcY < content.height) {
                                    const index = (srcX + srcY * content.width) * 4;
                                    const r = content.pixels[index];
                                    const g = content.pixels[index + 1];
                                    const b = content.pixels[index + 2];

                                    p.fill(r, g, b);
                                    p.noStroke();
                                    p.rect(x, y, blockSize, blockSize);
                                }
                            } else {
                                // Fast Mobile Path: Just use white/black blocks based on random
                                p.fill(p.random(255));
                                p.noStroke();
                                p.rect(x, y, blockSize, blockSize);
                            }
                        }
                    }
                }
                p.pop();
            }
        } else if (useColorMode) {
            const colors = Array.isArray(content) ? content : colorPatterns[0];
            const blockSize = 10;
            for (let y = 0; y < p.height; y += blockSize) {
                for (let x = 0; x < p.width; x += blockSize) {
                    if (p.random() < (1 - matrixProgress)) {
                        const colorIndex = p.floor(p.random(colors.length));
                        p.fill(colors[colorIndex]);
                        p.noStroke();
                        p.rect(x, y, blockSize, blockSize);
                    }
                }
            }
        }
    }

    function drawGlitch(content) {
        if (!content) {
            p.background(255);
            return;
        }

        if (useColorMode) {
            drawColorPattern(content);
            // Add glitch effect for color mode
            const colors = Array.isArray(content) ? content : colorPatterns[0];
            for (let i = 0; i < 20; i++) {
                let x = p.random(p.width);
                let y = p.random(p.height);
                let w = p.random(p.width * 0.1, p.width * 0.8);
                let h = p.random(1, p.height * 0.05);
                const colorIndex = p.floor(p.random(colors.length));
                p.fill(colors[colorIndex]);
                p.noStroke();
                p.rect(x, y, w, h);
            }
        } else {
            drawImageFullscreen(content);

            for (let i = 0; i < 20; i++) {
                let x = p.random(p.width);
                let y = p.random(p.height);
                let w = p.random(p.width * 0.1, p.width * 0.8);
                let h = p.random(1, p.height * 0.05);
                let grabX = p.random(p.width);
                let grabY = p.random(p.height);
                p.copy(content, Math.floor(grabX), Math.floor(grabY), Math.floor(w), Math.floor(h), Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
            }
        }
    }

    function drawColorPattern(colors) {
        if (!colors) return;

        // BAKUSOKU: Optimization - only recalculate random every few frames on mobile
        if (isTouch() && p.frameCount % 2 !== 0) return;

        const colorArray = Array.isArray(colors) ? colors : colorPatterns[0];
        p.background(255);

        // Larger grid for mobile
        const gridSize = isTouch() ? 60 : 40;

        for (let y = 0; y < p.height; y += gridSize) {
            for (let x = 0; x < p.width; x += gridSize) {
                const colorIndex = p.floor(p.random(colorArray.length));
                p.fill(colorArray[colorIndex]);
                p.noStroke();
                p.rect(x, y, gridSize, gridSize);
            }
        }
    }

    function drawNoise(content, progress, isDecay) {
        p.background(0);

        // Draw base content first
        if (useColorMode) {
            drawColorPattern(content);
        } else if (content) {
            drawImageFullscreen(content);
        }

        // Apply noise overlay
        const noiseIntensity = isDecay ? progress : (1 - progress);
        const noiseAmount = p.floor(p.width * p.height * noiseIntensity * 0.3);

        for (let i = 0; i < noiseAmount; i++) {
            const x = p.floor(p.random(p.width));
            const y = p.floor(p.random(p.height));
            const brightness = p.random(255);
            p.stroke(brightness);
            p.point(x, y);
        }
    }

    function drawMosaic(content, progress, isDecay) {
        p.background(255);

        // Calculate mosaic size - goes from small to large during decay, large to small during build
        const minSize = 4;
        const maxSize = 50;
        const mosaicSize = isDecay ?
            p.map(progress, 0, 1, minSize, maxSize) :
            p.map(progress, 0, 1, maxSize, minSize);

        if (useColorMode) {
            // Color pattern mosaic
            const colors = Array.isArray(content) ? content : colorPatterns[0];
            for (let y = 0; y < p.height; y += mosaicSize) {
                for (let x = 0; x < p.width; x += mosaicSize) {
                    const colorIndex = p.floor(p.random(colors.length));
                    p.fill(colors[colorIndex]);
                    p.noStroke();
                    // Draw circle mosaic
                    p.ellipse(x + mosaicSize / 2, y + mosaicSize / 2, mosaicSize, mosaicSize);
                }
            }
        } else if (content) {
            // Image mosaic
            p.push();
            const scale = p.min(p.width / content.width, p.height / content.height);
            const scaledW = content.width * scale;
            const scaledH = content.height * scale;
            const offsetX = (p.width - scaledW) / 2;
            const offsetY = (p.height - scaledH) / 2;

            for (let y = 0; y < p.height; y += mosaicSize) {
                for (let x = 0; x < p.width; x += mosaicSize) {
                    // Sample color from original image
                    const imgX = p.floor((x - offsetX) / scale);
                    const imgY = p.floor((y - offsetY) / scale);

                    if (imgX >= 0 && imgX < content.width && imgY >= 0 && imgY < content.height) {
                        const c = content.get(imgX, imgY);
                        p.fill(c);
                        p.noStroke();
                        // Draw circle mosaic
                        p.ellipse(x + mosaicSize / 2, y + mosaicSize / 2, mosaicSize, mosaicSize);
                    }
                }
            }
            p.pop();
        }
    }

    // ========== GOD-TIER EFFECTS ==========

    function drawKaleidoscope(content, progress, isDecay) {
        p.background(0);
        const segments = 8;
        const angle = p.TWO_PI / segments;
        const rotation = isDecay ? progress * p.TWO_PI : (1 - progress) * p.TWO_PI;

        p.push();
        p.translate(p.width / 2, p.height / 2);

        for (let i = 0; i < segments; i++) {
            p.push();
            p.rotate(angle * i + rotation);

            if (useColorMode) {
                const colors = Array.isArray(content) ? content : colorPatterns[0];
                const size = p.min(p.width, p.height) / 4;
                for (let j = 0; j < 5; j++) {
                    const colorIndex = (i + j) % colors.length;
                    p.fill(colors[colorIndex]);
                    p.noStroke();
                    p.triangle(0, 0, size * (j + 1) / 5, -size / 2, size * (j + 1) / 5, size / 2);
                }
            } else if (content) {
                p.scale(1, i % 2 === 0 ? 1 : -1);
                p.image(content, 0, -p.height / 4, p.width / 4, p.height / 2);
            }

            p.pop();
        }
        p.pop();
    }

    function drawShatter(content, progress, isDecay) {
        p.background(255);
        const shatterAmount = isDecay ? progress : (1 - progress);
        const fragments = 30;

        p.push();
        for (let i = 0; i < fragments; i++) {
            const centerX = p.random(p.width);
            const centerY = p.random(p.height);
            const size = p.random(50, 150);
            const offsetX = (centerX - p.width / 2) * shatterAmount * 0.5;
            const offsetY = (centerY - p.height / 2) * shatterAmount * 0.5;

            if (useColorMode) {
                const colors = Array.isArray(content) ? content : colorPatterns[0];
                const colorIndex = i % colors.length;
                p.fill(colors[colorIndex]);
            } else if (content && content.pixels) {
                const imgX = p.constrain(p.floor(centerX), 0, content.width - 1);
                const imgY = p.constrain(p.floor(centerY), 0, content.height - 1);

                // Optimized: Direct pixel array access instead of slow get()
                const idx = (imgX + imgY * content.width) * 4;
                const r = content.pixels[idx];
                const g = content.pixels[idx + 1];
                const b = content.pixels[idx + 2];
                p.fill(r, g, b);
            }

            p.noStroke();
            p.triangle(
                centerX + offsetX, centerY + offsetY - size / 2,
                centerX + offsetX - size / 2, centerY + offsetY + size / 2,
                centerX + offsetX + size / 2, centerY + offsetY + size / 2
            );
        }
        p.pop();
    }

    function drawChromatic(content, progress, isDecay) {
        p.background(0);
        const offset = isDecay ? progress * 20 : (1 - progress) * 20;

        if (useColorMode) {
            const colors = Array.isArray(content) ? content : colorPatterns[0];
            const gridSize = 30;
            for (let y = 0; y < p.height; y += gridSize) {
                for (let x = 0; x < p.width; x += gridSize) {
                    const colorIndex = p.floor((x + y) / gridSize) % colors.length;
                    p.fill(colors[colorIndex]);
                    p.noStroke();
                    p.rect(x + offset, y, gridSize, gridSize);
                    p.rect(x - offset, y, gridSize, gridSize);
                    p.rect(x, y, gridSize, gridSize);
                }
            }
        } else if (content) {
            p.tint(255, 0, 0);
            p.image(content, offset, 0, p.width, p.height);
            p.tint(0, 255, 0);
            p.image(content, 0, 0, p.width, p.height);
            p.tint(0, 0, 255);
            p.image(content, -offset, 0, p.width, p.height);
            p.noTint();
        }
    }

    function drawRipple(content, progress, isDecay) {
        p.background(0);
        const rippleStrength = isDecay ? (1 - progress) * 30 : progress * 30;
        const frequency = 0.05;

        if (useColorMode) {
            const colors = Array.isArray(content) ? content : colorPatterns[0];
            const gridSize = 15;
            for (let y = 0; y < p.height; y += gridSize) {
                for (let x = 0; x < p.width; x += gridSize) {
                    const dx = x - p.width / 2;
                    const dy = y - p.height / 2;
                    const distance = p.sqrt(dx * dx + dy * dy);
                    const wave = p.sin(distance * frequency + p.frameCount * 0.1) * rippleStrength;
                    const colorIndex = p.floor((distance + wave) / 50) % colors.length;
                    p.fill(colors[colorIndex]);
                    p.noStroke();
                    p.rect(x + wave, y + wave, gridSize, gridSize);
                }
            }
        } else if (content) {
            const gridSize = 10;
            for (let y = 0; y < p.height; y += gridSize) {
                for (let x = 0; x < p.width; x += gridSize) {
                    const dx = x - p.width / 2;
                    const dy = y - p.height / 2;
                    const distance = p.sqrt(dx * dx + dy * dy);
                    const wave = p.sin(distance * frequency + p.frameCount * 0.1) * rippleStrength;

                    if (content.pixels) {
                        const imgX = p.constrain(p.floor(x), 0, content.width - 1);
                        const imgY = p.constrain(p.floor(y), 0, content.height - 1);
                        const idx = (imgX + imgY * content.width) * 4;
                        p.fill(content.pixels[idx], content.pixels[idx + 1], content.pixels[idx + 2]);
                    }
                    p.noStroke();
                    p.rect(x + wave, y + wave, gridSize, gridSize);
                }
            }
        }
    }

    function drawParticles(content, progress, isDecay) {
        p.background(0);
        const particleCount = isTouch() ? 500 : 1000;
        const spread = isDecay ? progress * 200 : (1 - progress) * 200;

        for (let i = 0; i < particleCount; i++) {
            const x = p.random(p.width);
            const y = p.random(p.height);
            const dx = (x - p.width / 2) * spread / 100;
            const dy = (y - p.height / 2) * spread / 100;

            if (useColorMode) {
                const colors = Array.isArray(content) ? content : colorPatterns[0];
                const colorIndex = i % colors.length;
                p.fill(colors[colorIndex]);
            } else if (content && content.pixels) {
                const imgX = p.constrain(p.floor(x), 0, content.width - 1);
                const imgY = p.constrain(p.floor(y), 0, content.height - 1);
                const idx = (imgX + imgY * content.width) * 4;
                p.fill(content.pixels[idx], content.pixels[idx + 1], content.pixels[idx + 2]);
            }

            p.noStroke();
            const size = isTouch() ? 3 : 2;
            p.ellipse(x + dx, y + dy, size, size);
        }
    }

    function drawImageFullscreen(img) {
        if (!img) return;
        p.imageMode(p.CENTER);
        const canvasRatio = p.width / p.height;
        const imageRatio = img.width / img.height;

        if (canvasRatio > imageRatio) {
            p.image(img, p.width / 2, p.height / 2, p.width, p.width / imageRatio);
        } else {
            p.image(img, p.width / 2, p.height / 2, p.height * imageRatio, p.height);
        }
    }

    const handleInteraction = () => {
        if (animationState === 'display' && !nextImageKey) {
            // Immediate UI feedback
            const prompt = document.getElementById('imagePrompt');
            if (prompt) prompt.classList.add('hidden');
            clearTimeout(promptTimer);

            // [AI IMPROVEMENT] START DECAY IMMEDIATELY
            // This provides instant visual feedback even if the image is still loading
            animationFrame = 0;
            animationState = 'decay';

            // Randomly select transition effect
            transitionType = p.random(transitionEffects);

            // [AI IMPROVEMENT] Attempt to recover from color mode on every interaction
            // If we were in color mode, try to switch back to image mode by default
            if (useColorMode && Math.random() > 0.3) {
                useColorMode = false;
                console.log("[IMAGE] Attempting recovery from color mode...");
            }

            // Select next target
            let newIndex = p.floor(p.random(imageFileNames.length));
            // Ensure we don't pick the same image (or color key)
            while (imageFileNames[newIndex] === currentImageKey || `color-${newIndex % colorPatterns.length}` === currentImageKey) {
                newIndex = p.floor(p.random(imageFileNames.length));
            }

            if (useColorMode) {
                // Color mode path
                nextImageKey = `color-${newIndex % colorPatterns.length}`;
                console.log(`[IMAGE] Switching to color pattern: ${nextImageKey}`);
            } else {
                // Image mode path - load in parallel
                nextImageKey = 'PENDING';
                loadStartTime = p.millis(); // [AI IMPROVEMENT] Mark start time for timeout logic

                let hasResponded = false;
                let loadTimeout = setTimeout(() => {
                    if (!hasResponded) {
                        console.warn(`[IMAGE] Load timeout: ${imageFileNames[newIndex]}`);
                        hasResponded = true;
                        useColorMode = true;
                        nextImageKey = `color-${newIndex % colorPatterns.length}`;
                    }
                }, 4000); // 4 second timeout for slow connections

                loadImageDynamically(imageFileNames[newIndex], (result) => {
                    if (hasResponded) return;
                    hasResponded = true;
                    clearTimeout(loadTimeout);

                    if (result.success) {
                        nextImageKey = result.img.filePath;
                        if (result.img.loadPixels) result.img.loadPixels();
                        console.log(`[IMAGE] Loaded: ${result.img.filePath}`);

                        // Broadcast for mirroring
                        if (window.broadcastEvent) {
                            window.broadcastEvent('image-update', { index: newIndex });
                        }
                    } else {
                        console.warn(`[IMAGE] Failed to load, falling back to color`);
                        useColorMode = true;
                        nextImageKey = `color-${newIndex % colorPatterns.length}`;
                    }
                });
            }
        }
    };

    p.mousePressed = handleInteraction;
    p.touchStarted = (e) => {
        // [AI IMPROVEMENT] Robust touch handling: Check if touch is on canvas container or prompt
        const container = document.getElementById('imageCanvas-container');
        const prompt = document.getElementById('imagePrompt');

        if ((container && (e.target === container || container.contains(e.target))) ||
            (prompt && (e.target === prompt || prompt.contains(e.target)))) {
            handleInteraction();
            return false; // Prevent default for these elements to avoid scrolling
        }
        return true;
    };

    p.keyPressed = () => {
        // Handle VOID dialogue input
        if (waitingForInput && currentInputType) {
            const key = p.key.toLowerCase();

            if (currentInputType === 'yn' && (key === 'y' || key === 'n')) {
                handleDialogueInputKey(key);
                return false;
            } else if (currentInputType === 'capsule' && (key === '1' || key === '2' || key === '3')) {
                handleDialogueInputKey(key);
                return false;
            }
        }

        // Handle spacebar for image switching
        if (p.key === ' ' || p.keyCode === 32) {
            handleInteraction();
            return false; // Prevent page scroll
        }
    };

    // Handle dialogue input from keyboard or touch
    function handleDialogueInputKey(key) {
        if (!waitingForInput || !currentInputType) return;

        console.log(`Input received: ${key}`);

        if (currentInputType === 'yn') {
            // Y/N input - just acknowledge and continue
            userInput = key;
            waitingForInput = false;
            showInputKeyboard(null); // Hide keyboard

            // Continue to next dialogue line
            if (dialogueIndex < AI_DIALOGUE.length - 1) {
                dialogueIndex++;
                charIndex = 0;
            }
        } else if (currentInputType === 'capsule') {
            // Capsule choice - handle redirect
            userInput = key;
            const result = handleCapsuleChoice(key);

            if (result === 'mix') {
                // MIX capsule chosen - continue to VOID mode
                waitingForInput = false;
                showInputKeyboard(null);

                // Continue dialogue/transition to VOID
                if (dialogueIndex < AI_DIALOGUE.length - 1) {
                    dialogueIndex++;
                    charIndex = 0;
                } else {
                    //Already at end, transition out of terminal

                    // FORCE SHOW PHOTO332 for MIX choice

                    // Trigger MIX Noise transition -> leading to MIX Mode
                    animationState = 'mix_noise';
                    animationFrame = 0;
                }
            }
            // For WHITE/BLACK, redirect happens in handleCapsuleChoice
        }

        currentInputType = null;
    }

    p.windowResized = () => {
        const container = document.getElementById('imageCanvas-container');
        p.resizeCanvas(container.offsetWidth, container.offsetHeight);
    };

    // Scroll state
    let scrollOffset = 0;

    function drawTerminal() {
        // Because the site is GLOBALLY INVERTED, we must draw:
        // Background: WHITE (255) -> appears BLACK
        // Text: BLACK (0) -> appears WHITE
        p.background(255);
        p.fill(0);

        p.noStroke();
        p.textFont('Courier New, monospace');

        // MOBILE READABILITY: Larger font size for better visibility
        const baseSize = p.width < 400 ? 16 : 14; // Increased from 12 to 16 for mobile
        p.textSize(baseSize);
        p.textAlign(p.LEFT, p.TOP);
        p.textLeading(baseSize * 1.8); // Increased line spacing

        const margin = p.width < 400 ? 20 : 25; // More margin on mobile
        let x = margin;
        let y = margin - scrollOffset; // Apply scroll offset
        const maxW = p.width - (margin * 2);

        // Precise Line Height Tracker with better mobile support
        const getLineHeight = (str) => {
            const charWidth = baseSize * 0.5; // Tighter estimate for better wrapping
            const charsPerLine = Math.floor(maxW / charWidth);

            const paragraphs = str.split('\n');
            let totalLines = 0;

            paragraphs.forEach(pText => {
                let visualLength = 0;
                for (let i = 0; i < pText.length; i++) {
                    const code = pText.charCodeAt(i);
                    // More accurate Japanese character width
                    visualLength += (code > 255 || code === 0x3000) ? 2.0 : 1;
                }
                const linesInParagraph = Math.ceil(visualLength / (charsPerLine - 1)) || 1;
                totalLines += linesInParagraph;
            });

            return (totalLines * (baseSize * 1.8)); // Increased line spacing
        };

        const paragraphSpacing = baseSize * 2.0; // Clear, consistent gap between blocks

        const drawWrappedText = (str) => {
            if (y + 100 > 0 && y < p.height) {
                p.text(str, x, y, maxW);
            }
            y += getLineHeight(str) + paragraphSpacing;
        };

        // Draw historic log
        terminalLog.forEach(line => {
            drawWrappedText(line);
        });

        // Current typing line logic
        if (dialogueIndex < AI_DIALOGUE.length) {
            const currentLineObj = AI_DIALOGUE[dialogueIndex];
            const speaker = currentLineObj.speaker;
            const fullText = currentLineObj.text;
            const currentText = fullText.substring(0, charIndex);

            const labelStr = `[${speaker}] ${currentText}`;
            let currentBlockHeight = getLineHeight(labelStr);

            // AGGRESSIVE SCROLLING: Keep the typing line visible at all times
            let bottomThreshold = p.height - (margin * 2);
            let targetY = y + currentBlockHeight;

            if (targetY > bottomThreshold) {
                // If the text is overflowing, move the scroll offset to "chase" the bottom
                let gap = targetY - bottomThreshold;
                scrollOffset += Math.max(1, gap * 0.15); // Faster chasing
            }

            // Draw with Cursor
            const cursorChar = (p.frameCount % 40 < 20) ? '_' : ' ';
            drawWrappedText(`[${speaker}] ${currentText}${cursorChar}`);

            // Typing logic
            if (p.millis() - lastTypeTime > typeInterval) {
                charIndex++;
                lastTypeTime = p.millis();

                if (charIndex > fullText.length) {
                    terminalLog.push(`[${speaker}] ${fullText}`);

                    // Check if this line requires input
                    const currentDialogue = AI_DIALOGUE[dialogueIndex];
                    if (currentDialogue.waitForInput) {
                        waitingForInput = true;
                        currentInputType = currentDialogue.inputType; // 'yn' or 'capsule'

                        // Show appropriate keyboard for mobile
                        if (isTouch()) {
                            showInputKeyboard(currentInputType);
                        }
                        // Desktop users will use keyboard Y/N or 1/2/3
                    } else {
                        // No input required, continue to next line
                        dialogueIndex++;
                        charIndex = 0;
                        lastTypeTime = p.millis() + 1000; // Pause between messages
                    }
                } else {
                    // Input was required, already handled elsewhere
                }
            }
        } else {
            // Dialogue finished
            drawWrappedText("SYSTEM: GATE OPENING...");
            if (y > p.height - (margin * 2)) {
                scrollOffset += 2;
            }

            // Initialize lastTypeTime if not set
            if (lastTypeTime === 0 || p.millis() - lastTypeTime < 0) {
                lastTypeTime = p.millis();
            }

            if (p.millis() - lastTypeTime > 3000) {
                console.log("CRITICAL: EXITING TERMINAL -> REBUILD (Mobile Optimized)");

                // 1. Force state reset
                animationFrame = 0;
                terminalLog = []; // Immediate cleanup

                // VOID MODE: Show photo332.webp after terminal
                const voidImageKey = 'photos/photo332.webp';
                if (allImages[voidImageKey]) {
                    currentImageKey = voidImageKey;
                    useColorMode = false;
                } else {
                    // Fallback: try to load it
                    loadImageDynamically(voidImageKey, (result) => {
                        if (result.success) {
                            currentImageKey = result.img.filePath;
                            useColorMode = false;
                        } else {
                            // Final fallback to color mode
                            useColorMode = true;
                            currentImageKey = 'color-' + Math.floor(Math.random() * colorPatterns.length);
                        }
                    });
                }

                // IMPORTANT: explicit clear to prevent logic locking
                nextImageKey = null;

                animationState = 'rebuild';

                // 3. Forced UI Sync
                const container = document.getElementById('imageCanvas-container');
                if (container) {
                    p.resizeCanvas(container.offsetWidth, container.offsetHeight);
                }

                // 4. Final state cleanup
                dialogueIndex = 0;
                charIndex = 0;
                scrollOffset = 0;
                lastTypeTime = 0;

                // 5. Wake up engine
                p.background(255); // Flash white to reset pixels
                p.loop();
            }
        }
    }


    p.nextImage = (fromSync = false) => {
        console.log("[IMAGE] Remote Switch Triggered");
        if (!fromSync) broadcastEvent('next-image');
        handleInteraction();
    };

    p.triggerSecret = (code, fromSync = false) => {
        // Broadcast to other tabs if this is a local trigger
        if (!fromSync) {
            broadcastEvent('trigger-secret', { code });
        }
        if (code === 'void' || code === 'ai') {
            console.log("AI TERMINAL ACTIVATED");

            // Play music (Fallback to ambient-loop if desktop-ritual is not available)
            // For now using ambient-loop.mp3 for all to avoid 404
            playAmbientMusic('ambient-loop.mp3');

            // Start with noise (Mosaic Feedback)
            animationState = 'pre_terminal_noise';
            animationFrame = 0;

            // GOD SPEED: Invert colors to create BLACK terminal world
            document.documentElement.style.filter = 'invert(1)';
            document.body.style.backgroundColor = '#000000'; // Force backdrop color

            // Show backdoor link
            const backdoorLink = document.getElementById('void-backdoor-link');
            if (backdoorLink) backdoorLink.classList.remove('hidden');

            terminalLog = [];
            dialogueIndex = 0;
            charIndex = 0;

            // IMPORTANT: explicit clear to prevent logic locking
            nextImageKey = null;
        } else if (code === 'high') {
            console.log("SUPER HIGH MODE ACTIVATED");
            animationState = 'superhigh';
            document.body.classList.add('superhigh-active');
            playAmbientMusic('ambient-loop.mp3');
        } else if (code === 'exit') {
            console.log("EXITING TERMINAL");
            stopAmbientMusic(); // Stop background music

            animationState = 'rebuild';
            document.body.classList.remove('superhigh-active');

            // Hide backdoor link
            const backdoorLink = document.getElementById('void-backdoor-link');
            if (backdoorLink) backdoorLink.classList.add('hidden');

            // Restore Image
            // We need to pick a valid key to rebuild TO
            let keys = Object.keys(allImages);
            if (keys.length > 0) {
                currentImageKey = keys[0];
            } else {
                // Determine based on config if image or color
                const initialIndex = CONFIG.IMAGE_MACHINE.INITIAL_IMAGE_INDEX;
                const fName = `${CONFIG.IMAGE_MACHINE.PATH_PREFIX}${(initialIndex + 1).toString().padStart(3, '0')}${CONFIG.IMAGE_MACHINE.FILE_EXTENSION}`;
                currentImageKey = fName;
            }

            // RESET VISUALS
            document.documentElement.style.filter = 'none';
            document.documentElement.style.backgroundColor = '';
            document.body.style.backgroundColor = '';

            // Restore original background colors
            document.documentElement.style.removeProperty('--color-bg-secondary');
            document.documentElement.style.removeProperty('--color-bg-tertiary');
        }
    };

    function drawPreTerminalNoise() {
        const blockSize = 10; // Smaller mosaic blocks
        p.noStroke();
        for (let x = 0; x < p.width; x += blockSize) {
            for (let y = 0; y < p.height; y += blockSize) {
                // Randomly Black or White
                p.fill(p.random() > 0.5 ? 255 : 0);
                p.rect(x, y, blockSize, blockSize);
            }
        }
    }

    function drawSuperHigh() {
        p.background(0);

        // Rapid image switching
        if (p.frameCount % 15 === 0) {
            const keys = Object.keys(allImages);
            if (keys.length > 0) {
                currentImageKey = keys[p.floor(p.random(keys.length))];
                useColorMode = false;
            }
        }

        const img = allImages[currentImageKey];
        if (img) {
            p.push();
            p.imageMode(p.CENTER);
            p.translate(p.width / 2, p.height / 2);

            // Intense shaking
            p.translate(p.random(-15, 15), p.random(-15, 15));

            // Determine dimensions
            const canvasRatio = p.width / p.height;
            const imageRatio = img.width / img.height;
            let w, h;
            if (canvasRatio > imageRatio) {
                w = p.width; h = p.width / imageRatio;
            } else {
                w = p.height * imageRatio; h = p.height;
            }

            // High scale pulsing
            const pulse = 1.0 + 0.1 * p.sin(p.frameCount * 0.5);
            p.scale(pulse);

            // Random chromatic aberration
            const offset = 30 * p.sin(p.frameCount * 0.3);
            p.tint(255, 0, 0, 180);
            p.image(img, -offset, 0, w, h);
            p.tint(0, 0, 255, 180);
            p.image(img, offset, 0, w, h);
            p.tint(255, 230);
            p.image(img, 0, 0, w, h);

            p.pop();
        }

        // Fast scanlines
        p.stroke(255, 80);
        p.strokeWeight(2);
        for (let i = 0; i < p.height; i += 6) {
            const y = (i + p.frameCount * 20) % p.height;
            p.line(0, y, p.width, y);
        }

        // Glitch overlays
        if (p.random() > 0.9) {
            p.noStroke();
            p.fill(p.random(255), p.random(255), p.random(255), 50);
            p.rect(0, p.random(p.height), p.width, p.random(20, 100));
        }

        // Random flashes
        if (p.random() > 0.97) {
            p.background(255, 150);
        }
    }
};

export function initImageMachine() {
    window.imageMachine = new p5(imageMachineSketch);
}
