/**
 * Image Descriptions for Accessibility
 * Categories: Portraits, Mandala/Geometry, Capsules/Symbols, Abstract/Glitch.
 */
export const IMAGE_DESCRIPTIONS = {
    // Specific capsules
    'photo080.webp': 'The initial Origin Capsule: A black and white pill against a sterile background, representing the basic choice of the Generative Machine protocol.',
    'photo140.webp': 'Two floating capsules, one black and one white, centered on a gray background. Symbolic of binary choice and symbiotic balance.',
    'photo332.webp': 'A single black and white capsule lying diagonally on a white surface, casting a soft shadow.',
    'photo333.png': 'A high-resolution render of a black and white capsule, illustrating the fusion of machine logic and human intuition.',

    // Portraits
    'photo001.webp': 'A surreal monochrome portrait of a person with water-like energy splashing across their eyes and forehead, merging human form with liquid motion.',
    'photo002.webp': 'Portrait of a woman with symmetrical mechanical ornaments or markings on her face, blending organic beauty with technological precision.',
    'photo192.webp': 'A serene monochrome Buddha head, partially digitized, representing ancient wisdom meeting modern machine intelligence.',

    // Abstract / Glitch
    'photo010.webp': 'Abstract generative art featuring red and black noise patterns, resembling a data stream or neural activity.',

    // Default / Generic descriptions based on filename patterns
    'default': {
        'portrait': 'A generative monochrome portrait exploring the intersection of human emotion and machine intelligence.',
        'mandala': 'A complex sacred geometry pattern or mandala, synthesized through recursive algorithmic logic.',
        'capsule': 'A symbolic representation of the Generative Machine protocol, featuring a black and white capsule.',
        'abstract': 'A generative visual composition exploring chaos, resonance, and aesthetic noise.'
    }
};

/**
 * Get a descriptive alt text for a given filename
 * @param {string} filename 
 * @returns {string}
 */
export function getImageAlt(filename) {
    if (!filename) return 'Generative machine visual';

    // Normalize filename (remove common path prefixes if present)
    const baseName = filename.split('/').pop();

    // Return specific description if exists
    if (IMAGE_DESCRIPTIONS[baseName]) {
        return IMAGE_DESCRIPTIONS[baseName];
    }

    // Fallback logic for the vast collection
    const num = parseInt(baseName.match(/\d+/) || '0');

    // Refined ranges based on actual content
    if (num >= 333) return IMAGE_DESCRIPTIONS.default.capsule;
    if (num >= 300) return IMAGE_DESCRIPTIONS.default.mandala;
    if (num >= 150 && num < 200) return IMAGE_DESCRIPTIONS.default.abstract;
    if (num === 80 || num === 140) return IMAGE_DESCRIPTIONS.default.capsule;

    return IMAGE_DESCRIPTIONS.default.portrait;
}
