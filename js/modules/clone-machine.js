// ==================== CLONE MACHINE (MARKOV ENGINE) ====================
export function initCloneMachine() {
    const container = document.getElementById('clone-container');
    const display = document.getElementById('clone-text-display');
    const promptEl = document.getElementById('clonePrompt');
    const memoryCountEl = document.getElementById('memory-count');

    if (!container || !display) return;

    // Markov Chain Data Structure
    let ngrams = {};
    const order = 3; // N-gram order (3 characters)
    let isLearning = false;
    let hasModel = false;
    let autoGenerateInterval;

    // Initial State
    display.innerHTML = "WAITING FOR INPUT DATA...<br><span class='blink'>_</span>";

    // Create Input Interface for Learning
    const inputContainer = document.createElement('div');
    inputContainer.className = 'clone-input-container';
    inputContainer.innerHTML = `
        <textarea id="clone-source-data" placeholder="PASTE YOUR ARCHIVED THOUGHTS / X POSTS HERE TO CREATE CLONE..." spellcheck="false"></textarea>
        <button id="learn-btn" class="btn-clone">INITIALIZE CLONE</button>
    `;
    container.appendChild(inputContainer);

    const textarea = document.getElementById('clone-source-data');
    const learnBtn = document.getElementById('learn-btn');

    // Event Listeners
    if (learnBtn) {
        learnBtn.addEventListener('click', () => {
            const text = textarea.value;
            if (text.length < 10) {
                alert("NEED MORE DATA TO EXIST.");
                return;
            }
            learnData(text);
        });
    }

    if (promptEl) {
        promptEl.addEventListener('click', () => {
            if (hasModel) {
                generateThought();
            } else {
                textarea.focus();
            }
        });
    }

    // Learning Process
    function learnData(text) {
        isLearning = true;
        inputContainer.classList.add('hidden');
        if (promptEl) promptEl.classList.add('hidden');

        display.classList.remove('glitch-text');
        display.innerHTML = "ANALYZING THOUGHT PATTERNS...";

        // Simulate processing time based on length
        const processTime = Math.min(3000, text.length / 10);

        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            display.innerHTML = `ANALYZING THOUGHT PATTERNS... ${progress}%`;
            if (progress >= 100) clearInterval(progressInterval);
        }, processTime / 10);

        setTimeout(() => {
            buildMarkovModel(text);
            isLearning = false;
            hasModel = true;

            display.innerHTML = "CLONE SYNCHRONIZED.<br>GENERATING CONSCIOUSNESS...";

            setTimeout(() => {
                startAutoGeneration();
                if (promptEl) {
                    promptEl.textContent = "CLICK TO FORCE THOUGHT";
                    promptEl.classList.remove('hidden');
                }
            }, 1500);

        }, processTime);
    }

    // Build Markov Chain Model (Character based N-gram)
    function buildMarkovModel(text) {
        ngrams = {};
        // Clean text slightly but keep raw feel
        const cleanText = text.replace(/\s+/g, ' ');

        for (let i = 0; i <= cleanText.length - order; i++) {
            const gram = cleanText.substring(i, i + order);
            if (!ngrams[gram]) {
                ngrams[gram] = [];
            }
            if (i + order < cleanText.length) {
                ngrams[gram].push(cleanText.charAt(i + order));
            }
        }

        if (memoryCountEl) {
            memoryCountEl.textContent = `${Object.keys(ngrams).length} Patterns Learned`;
        }
    }

    // Generate Text from Model
    function generateThought() {
        if (!hasModel) return;

        const keys = Object.keys(ngrams);
        if (keys.length === 0) return;

        let currentGram = keys[Math.floor(Math.random() * keys.length)];
        let result = currentGram;

        // Generate length between 30 and 150 chars
        const maxLen = Math.floor(Math.random() * 120) + 30;

        for (let i = 0; i < maxLen; i++) {
            const possibilities = ngrams[currentGram];
            if (!possibilities || possibilities.length === 0) {
                break;
            }
            const nextChar = possibilities[Math.floor(Math.random() * possibilities.length)];
            result += nextChar;
            currentGram = result.substring(result.length - order, result.length);
        }

        // Visual Output
        display.classList.remove('visible');

        // Random Glitch Effect
        if (Math.random() > 0.7) {
            display.classList.add('glitch-text');
            display.setAttribute('data-text', result);
        } else {
            display.classList.remove('glitch-text');
        }

        setTimeout(() => {
            display.textContent = result;
            display.classList.add('visible');

            // Occasional Image Flash
            if (Math.random() > 0.8) flashImage();
        }, 100);
    }

    function startAutoGeneration() {
        if (autoGenerateInterval) clearInterval(autoGenerateInterval);
        generateThought(); // First one immediately

        autoGenerateInterval = setInterval(() => {
            generateThought();
        }, 4000); // New thought every 4 seconds
    }

    function flashImage() {
        const img = document.createElement('img');
        // Assuming photos exist from 1 to 383
        const randomId = Math.floor(Math.random() * 383) + 1;
        img.src = `photos/photo${randomId.toString().padStart(3, '0')}.webp`;
        img.className = 'clone-flash-image';

        const size = Math.random() * 300 + 200;
        img.style.width = `${size}px`;
        img.style.left = `${Math.random() * (container.offsetWidth - size)}px`;
        img.style.top = `${Math.random() * (container.offsetHeight - size)}px`;

        if (Math.random() > 0.5) {
            img.style.filter = 'invert(1) grayscale(1)';
        } else {
            img.style.filter = 'grayscale(1) contrast(1.5)';
        }

        container.appendChild(img);
        setTimeout(() => img.remove(), Math.random() * 500 + 200);
    }
}
