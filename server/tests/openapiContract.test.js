const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('openapi contract includes critical endpoints', () => {
    const content = fs.readFileSync(path.join(__dirname, '..', 'openapi.yaml'), 'utf8');
    const requiredPaths = [
        '/api/auth/login',
        '/api/courses',
        '/api/assignments/submit',
        '/api/videos/stream/{lessonId}/{asset}',
        '/api/system/metrics'
    ];

    for (const p of requiredPaths) {
        assert.equal(content.includes(p), true, `Missing path ${p}`);
    }
});
