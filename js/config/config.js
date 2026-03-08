// Core Configuration for GENERATIVE MACHINE
export const CONFIG = {
    // Image Machine Settings
    IMAGE_MACHINE: {
        TOTAL_IMAGES: 363,
        PNG_START_INDEX: 333,
        PATH_PREFIX: '/photos/photo',
        FILE_EXTENSION: '.webp',
        PNG_EXTENSION: '.png',
        INITIAL_IMAGE_INDEX: 139, // photo140.webp (0-indexed)
        CHAOS_DURATION: 10,
        TRANSITION_DURATION: 10 // GOD SPEED
    },

    // Sound Machine Settings
    SOUND_MACHINE: {
        FFT_SIZE: 1024,
        SMOOTHING_TIME_CONSTANT: 0.8,
        DEFAULT_PARAMS: {
            PILL_COUNT: 1,
            PILL_SIZE: 0.7,
            SPREAD_WIDTH: 0,
            ROTATION_SPEED: 1,
            SCALE_INTENSITY: 1
        },
        CONTROL_LIMITS: {
            PILL_COUNT: { MIN: 1, MAX: 12 },
            SPREAD: { MIN: 0, MAX: 5 },
            PILL_SIZE: { MIN: 0.3, MAX: 1.5 },
            ROTATION: { MIN: 0, MAX: 3 },
            SCALE: { MIN: 0, MAX: 3 }
        }
    },

    // Color Patterns (Fallback)
    COLOR_PATTERNS: [
        ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE'],
        ['#96CEB4', '#FFEAA7', '#DFE6E9', '#74B9FF', '#FD79A8'],
        ['#A29BFE', '#FD79A8', '#FDCB6E', '#6C5CE7', '#00B894'],
        ['#74B9FF', '#A29BFE', '#FD79A8', '#FDCB6E', '#00CEC9'],
        ['#00B894', '#00CEC9', '#0984E3', '#6C5CE7', '#FD79A8'],
        ['#E17055', '#FDCB6E', '#00B894', '#74B9FF', '#A29BFE'],
        ['#2D3436', '#636E72', '#B2BEC3', '#DFE6E9', '#FFFFFF']
    ]
};
