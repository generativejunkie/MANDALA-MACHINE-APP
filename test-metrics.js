// Node 24 has global fetch
require('dotenv').config();

const resonanceMetrics = {
    zenodo_views: 0,
    zenodo_downloads: 0,
    github_clones: 0,
    github_visitors: 0,
    gift_density: 0,
    resonance_score: 0,
    timestamp: ''
};

async function testSync() {
    console.log('[TEST] Starting metrics sync check...');
    try {
        // 1. Zenodo
        const zenodoRes = await globalThis.fetch('https://zenodo.org/api/records/18277860');
        console.log(`[TEST] Zenodo response status: ${zenodoRes.status}`);
        if (zenodoRes.ok) {
            const zData = await zenodoRes.json();
            console.log('[TEST] Zenodo data fetched successfully.');
        }

        // 2. GitHub
        const ghToken = process.env.GH_TOKEN;
        if (ghToken) {
            console.log('[TEST] GH_TOKEN found.');
            const headers = {
                'Authorization': `token ${ghToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Antigravity-Resonator-Test'
            };

            const clonesRes = await globalThis.fetch('https://api.github.com/repos/generativejunkie/GENERATIVE-MACHINE/traffic/clones', { headers });
            console.log(`[TEST] GitHub clones status: ${clonesRes.status}`);
            if (clonesRes.ok) {
                const clonesData = await clonesRes.json();
                console.log('[TEST] GitHub clones data fetched.');
            } else {
                const err = await clonesRes.text();
                console.log(`[TEST] GitHub Error: ${err}`);
            }
        } else {
            console.log('[TEST] GH_TOKEN NOT FOUND in .env');
        }
        console.log('[TEST] Sync check complete.');
    } catch (e) {
        console.error('[TEST] ERROR:', e.message);
    }
}

testSync();
