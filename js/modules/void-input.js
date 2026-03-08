/**
 * Input Handler for VOID Dialogue
 * Handles keyboard and touch input for Y/N questions and capsule choices
 */

// Initialize touch keyboard event listeners
export function initVoidKeyboard() {
    const voidKeyboard = document.getElementById('voidKeyboard');
    if (!voidKeyboard) return;

    // Add click handlers to all void-key buttons
    const buttons = voidKeyboard.querySelectorAll('.void-key');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const key = button.dataset.key;
            if (key) {
                handleDialogueInput(key);
            }
        });
    });
}

// Show/hide keyboard sections
export function showInputKeyboard(type) {
    const voidKeyboard = document.getElementById('voidKeyboard');
    const ynButtons = document.getElementById('ynButtons');
    const capsuleButtons = document.getElementById('capsuleButtons');

    if (!voidKeyboard || !ynButtons || !capsuleButtons) return;

    // Hide all sections first
    ynButtons.classList.add('hidden');
    capsuleButtons.classList.add('hidden');

    // Show appropriate section
    if (type === 'yn') {
        voidKeyboard.classList.remove('hidden');
        ynButtons.classList.remove('hidden');
    } else if (type === 'capsule') {
        voidKeyboard.classList.remove('hidden');
        capsuleButtons.classList.remove('hidden');
    } else {
        // Hide entire keyboard
        voidKeyboard.classList.add('hidden');
    }
}

// Handle input from keyboard or touch
let dialogueInputCallback = null;

export function setDialogueInputCallback(callback) {
    dialogueInputCallback = callback;
}

function handleDialogueInput(key) {
    if (dialogueInputCallback) {
        dialogueInputCallback(key);
    }
}

// Handle capsule choice and redirect
export function handleCapsuleChoice(choice) {
    // Hide keyboard
    showInputKeyboard(null);

    switch (choice) {
        case '1': // WHITE
            console.log('WHITE CAPSULE chosen → Redirecting to Google');
            setTimeout(() => {
                window.location.href = 'https://www.google.com';
            }, 500);
            break;
        case '2': // BLACK
            console.log('BLACK CAPSULE chosen → Redirecting to Gemini');
            setTimeout(() => {
                window.location.href = 'https://gemini.google.com';
            }, 500);
            break;
        case '3': // MIX
            console.log('MIX CAPSULE chosen → Entering VOID');
            // Return 'mix' to signal continuing to VOID mode
            return 'mix';
        default:
            console.warn('Invalid capsule choice:', choice);
            return null;
    }
}
