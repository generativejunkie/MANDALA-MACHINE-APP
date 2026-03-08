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

export function initHero() {
    const descEl = document.getElementById('description-text');
    const imageDescEl = document.getElementById('image-desc-text');
    const soundDescEl = document.getElementById('sound-desc-text');
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
            imageDescEl.dataset.text = 'Click or tap to switch between random images with generative transition effects';
            imageDescEl.dataset.loop = 'true';
            reserveHeight(imageDescEl, imageDescEl.dataset.text);
            typingObserver.observe(imageDescEl);
        }

        if (soundDescEl) {
            soundDescEl.dataset.text = 'Upload audio to experience real-time sound visualization';
            soundDescEl.dataset.loop = 'true';
            reserveHeight(soundDescEl, soundDescEl.dataset.text);
            typingObserver.observe(soundDescEl);
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
            footerEl.innerHTML = '<span class="flash">⚡︎</span> <a href="/singularity.html" id="secret-paper-link" style="color: inherit; text-decoration: none;">ALL WAYS SUPER HIGH</a> <span class="flash">⚡︎</span>';

            const secretLink = document.getElementById('secret-paper-link');
            if (secretLink) {
                secretLink.addEventListener('click', (e) => {
                    console.log("SECRET_ACCESS: ALL WAYS SUPER HIGH - Ritual Triggered");

                    // Trigger Internal System Log
                    document.dispatchEvent(new CustomEvent('secret-ritual', { detail: { type: 'paper_access' } }));

                    // Trigger Google Analytics Event
                    if (typeof gtag === 'function') {
                        gtag('event', 'secret_archive_access', {
                            'event_category': 'Engagement',
                            'event_label': 'ALL WAYS SUPER HIGH Link',
                            'value': 1
                        });
                    }
                });
            }
        }

        // Handle resize to update heights (debounced)
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                [descEl, imageDescEl, soundDescEl, storeDescEl, manifestoEl, footerEl].forEach(el => {
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
