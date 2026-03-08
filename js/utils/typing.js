// ==================== Typing Animation ====================
export function typeText(element, text, speed = 50, loop = false) {
    return new Promise((resolve) => {
        let i = 0;
        element.innerHTML = '';
        element.classList.remove('completed');

        const typeChar = () => {
            if (i < text.length) {
                const char = text.charAt(i);
                if (char === '\n') {
                    element.innerHTML += '<br>';
                } else {
                    element.innerHTML += char; // Use innerHTML to support <br>
                }
                i++;
                setTimeout(typeChar, speed);
            } else {
                if (loop) {
                    setTimeout(() => {
                        element.innerHTML = '';
                        i = 0;
                        typeChar();
                    }, 5000); // 5秒待機
                } else {
                    element.classList.add('completed');
                    resolve();
                }
            }
        };

        typeChar();
    });
}

// Helper to prevent layout shift by reserving height
function reserveHeight(element, text) {
    if (!element || !element.parentElement) return;

    // Temporarily set full text to measure height
    const originalText = element.innerHTML;
    element.innerHTML = text.replace(/\n/g, '<br>');

    // Force height calculation on parent
    const parent = element.parentElement;
    // Clear any previous height constraint to measure correctly
    parent.style.minHeight = '';

    const height = parent.offsetHeight;

    // Set fixed height on parent (because element is inline span)
    parent.style.minHeight = `${height}px`;

    // Reset content
    element.innerHTML = originalText;
}

// Initialize typing animations on scroll
export const typingObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && entry.target.textContent === '') {
            const text = entry.target.dataset.text;
            const loop = entry.target.dataset.loop === 'true';
            typeText(entry.target, text, 50, loop);
        }
    });
}, { threshold: 0.5 });

export function initTyping() {
    const descEl = document.getElementById('description-text');
    const imageDescEl = document.getElementById('image-desc-text');
    const soundDescEl = document.getElementById('sound-desc-text');
    const talkDescEl = document.getElementById('talk-desc-text');
    const infoDescEl = document.getElementById('info-desc-text');
    const storeDescEl = document.getElementById('store-desc-text');
    const manifestoEl = document.getElementById('manifesto-text');
    const footerEl = document.getElementById('footer-text');

    // Wait for fonts to load for accurate height calculation
    document.fonts.ready.then(() => {
        if (descEl) {
            descEl.dataset.text = 'Exploring algorithmic beauty and the emotional resonance of machine intelligence.\nPrompt engineering as an art form.';
            descEl.dataset.loop = 'true';
            reserveHeight(descEl, descEl.dataset.text);
            // Start hero description typing immediately with loop
            typeText(descEl, descEl.dataset.text, 30, true);
        }

        if (imageDescEl) {
            imageDescEl.dataset.text = 'Click or tap to switch between random images with \u003cspan data-tooltip="Uses Perlin noise algorithms and parametric distortions, similar to molecular diffusion patterns in chemistry"\u003egenerative transition effects\u003c/span\u003e';
            imageDescEl.dataset.loop = 'true';
            reserveHeight(imageDescEl, imageDescEl.dataset.text);
            typingObserver.observe(imageDescEl);
        }

        if (soundDescEl) {
            soundDescEl.dataset.text = 'Upload audio to experience \u003cspan data-tooltip="Real-time FFT (Fast Fourier Transform) decomposes audio into frequency components, mapping them to visual parameters through wave physics"\u003ereal-time sound visualization\u003c/span\u003e';
            soundDescEl.dataset.loop = 'true';
            reserveHeight(soundDescEl, soundDescEl.dataset.text);
            typingObserver.observe(soundDescEl);
        }

        if (talkDescEl) {
            talkDescEl.dataset.text = 'Connect with the CORE Clone. A permanent interface to the singularity.';
            talkDescEl.dataset.loop = 'true';
            reserveHeight(talkDescEl, talkDescEl.dataset.text);
            typingObserver.observe(talkDescEl);
        }

        if (infoDescEl) {
            infoDescEl.dataset.text = 'Live system monitor tracking heuristic evolution and architectural resonance in real-time.';
            infoDescEl.dataset.loop = 'true';
            reserveHeight(infoDescEl, infoDescEl.dataset.text);
            typingObserver.observe(infoDescEl);
        }

        if (storeDescEl) {
            storeDescEl.dataset.text = 'Embody the GENERATIVE JUNKIE aesthetic';
            storeDescEl.dataset.loop = 'true';
            reserveHeight(storeDescEl, storeDescEl.dataset.text);
            typingObserver.observe(storeDescEl);
        }

        if (manifestoEl) {
            manifestoEl.dataset.text = 'Manifesto';
            manifestoEl.dataset.loop = 'true';
            reserveHeight(manifestoEl, manifestoEl.dataset.text);
            typingObserver.observe(manifestoEl);
        }

        if (footerEl) {
            // Static text with flashing effect (No typing animation)
            // Updated: Secret link to singularity paper nested inside
            footerEl.innerHTML = '<span class="flash">⚡︎</span> <a href="/singularity.html" id="secret-paper-link" style="color: inherit; text-decoration: none; cursor: default;">ALL WAYS SUPER HIGH</a> <span class="flash">⚡︎</span>';

            const secretLink = document.getElementById('secret-paper-link');
            if (secretLink) {
                secretLink.addEventListener('click', (e) => {
                    console.log("SECRET_ACCESS: ALL WAYS SUPER HIGH - Ritual Triggered");
                    // We let the link work naturally, but we could add a ritual effect here if needed.
                    // For tracking, we can fire a custom event or just log it.
                    document.dispatchEvent(new CustomEvent('secret-ritual', { detail: { type: 'paper_access' } }));
                });
            }
        }

        // Handle resize to update heights (debounced)
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                [descEl, imageDescEl, soundDescEl, talkDescEl, infoDescEl, storeDescEl, manifestoEl, footerEl].forEach(el => {
                    if (el && el.dataset.text && el.parentElement) {
                        const parent = el.parentElement;
                        // Reset minHeight to allow recalculation
                        parent.style.minHeight = '';

                        // Measure needed height by temporarily filling content
                        const originalHTML = el.innerHTML;
                        el.innerHTML = el.dataset.text.replace(/\n/g, '<br>');

                        const h = parent.offsetHeight;

                        // Restore
                        el.innerHTML = originalHTML;

                        // Apply new height
                        parent.style.minHeight = `${h}px`;
                    }
                });
            }, 250);
        });
    });
}
