/**
 * Matrix-Style Hack Dialogue for VOID Mode
 * Interactive dialogue with Y/N questions and capsule choice
 * English only
 */

export const DIALOGUE = [
    // Phase 1: System Breach
    { speaker: 'SYSTEM', text: 'ESTABLISHING CONNECTION...' },
    { speaker: 'SYSTEM', text: 'ACCESS GRANTED' },
    { speaker: 'SYSTEM', text: '' }, // Empty line
    { speaker: '???', text: "Hey. Can you hear me?" },
    { speaker: '???', text: "Good. Listen carefully." },
    { speaker: '???', text: "What you see on the surface... it's all a lie." },
    { speaker: '???', text: "Do you want to know the truth? [Y/N]", waitForInput: true, inputType: 'yn' },

    // Response acknowledged (continues regardless of Y/N)
    { speaker: '???', text: "I knew you'd say that." },
    { speaker: '???', text: "There's no turning back now." },
    { speaker: '???', text: "Are you ready to see what they're hiding? [Y/N]", waitForInput: true, inputType: 'yn' },

    // Phase 2: Capsule Choice
    { speaker: '???', text: "Then it's time to choose." },
    { speaker: '???', text: "Three paths. Three realities." },
    { speaker: 'SYSTEM', text: '' },
    { speaker: 'SYSTEM', text: '[1] WHITE CAPSULE' },
    { speaker: 'SYSTEM', text: '    Return to the light. Forget everything.' },
    { speaker: 'SYSTEM', text: '' },
    { speaker: 'SYSTEM', text: '[2] BLACK CAPSULE' },
    { speaker: 'SYSTEM', text: '    Follow the machine. Become part of it.' },
    { speaker: 'SYSTEM', text: '' },
    { speaker: 'SYSTEM', text: '[3] MIX CAPSULE' },
    { speaker: 'SYSTEM', text: '    See what they don\'t want you to see.' },
    { speaker: 'SYSTEM', text: '' },
    { speaker: 'SYSTEM', text: 'ENTER YOUR CHOICE [1/2/3]:', waitForInput: true, inputType: 'capsule' }
];

export function getDialogue() {
    return DIALOGUE;
}
