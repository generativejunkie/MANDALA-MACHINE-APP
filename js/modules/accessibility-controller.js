/**
 * Accessibility Controller
 * Manages global settings for High Contrast and Reduced Motion.
 */

export const AccessibilitySettings = {
    highContrast: false,
    reducedMotion: false,

    init() {
        // Detect OS preferences
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Load saved settings from localStorage
        const saved = localStorage.getItem('gj_accessibility_settings');
        if (saved) {
            const data = JSON.parse(saved);
            this.highContrast = data.highContrast ?? this.highContrast;
            this.reducedMotion = data.reducedMotion ?? this.reducedMotion;
        }

        this.updateDOM();
        this.initListeners();

        console.log('[ACCESSIBILITY] Initialized', {
            highContrast: this.highContrast,
            reducedMotion: this.reducedMotion
        });
    },

    toggleHighContrast() {
        this.highContrast = !this.highContrast;
        this.save();
        this.updateDOM();
    },

    setReducedMotion(val) {
        this.reducedMotion = val;
        this.save();
        this.updateDOM();
    },

    save() {
        localStorage.setItem('gj_accessibility_settings', JSON.stringify({
            highContrast: this.highContrast,
            reducedMotion: this.reducedMotion
        }));
    },

    updateDOM() {
        // High Contrast class on root
        if (this.highContrast) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }

        // Reduced Motion class on root
        if (this.reducedMotion) {
            document.documentElement.classList.add('reduced-motion');
        } else {
            document.documentElement.classList.remove('reduced-motion');
        }

        // Update any specific UI elements if needed
        window.dispatchEvent(new CustomEvent('gj-accessibility-update', {
            detail: { highContrast: this.highContrast, reducedMotion: this.reducedMotion }
        }));
    },

    initListeners() {
        // Listen for OS reduced motion changes
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => {
            this.setReducedMotion(e.matches);
        });
    }
};

/**
 * Universal Design helper to check if heavy effects should be minimized
 */
export function shouldReduceMotion() {
    return AccessibilitySettings.reducedMotion;
}
