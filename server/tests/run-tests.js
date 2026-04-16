const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { hasCapability, ROLES } = require('../config/rbac');
const { createVideoToken, verifyVideoToken } = require('../services/videoService');

let failed = 0;

const run = async (name, fn) => {
    try {
        await fn();
        console.log(`PASS ${name}`);
    } catch (error) {
        failed += 1;
        console.error(`FAIL ${name}: ${error.message}`);
    }
};

const main = async () => {
    await run('RBAC admin full access', () => {
        assert.equal(hasCapability(ROLES.ADMIN, 'orders.create'), true);
        assert.equal(hasCapability(ROLES.ADMIN, 'learning.access'), true);
    });

    await run('RBAC matrix for employee/client/student', () => {
        assert.equal(hasCapability(ROLES.EMPLOYEE, 'assignments.review'), true);
        assert.equal(hasCapability(ROLES.EMPLOYEE, 'orders.create'), false);
        assert.equal(hasCapability(ROLES.CLIENT, 'orders.create'), true);
        assert.equal(hasCapability(ROLES.CLIENT, 'learning.access'), false);
        assert.equal(hasCapability(ROLES.STUDENT, 'learning.access'), true);
        assert.equal(hasCapability(ROLES.STUDENT, 'assignments.review'), false);
    });

    await run('Video token fingerprint binding', () => {
        const tokenPayload = createVideoToken({
            lessonId: 42,
            userId: 7,
            asset: 'master.m3u8',
            ipAddress: '127.0.0.1',
            userAgent: 'QA-Agent'
        });

        const ok = verifyVideoToken({
            lessonId: 42,
            userId: 7,
            asset: 'master.m3u8',
            token: tokenPayload.token,
            expire: tokenPayload.expire,
            nonce: tokenPayload.nonce,
            ipAddress: '127.0.0.1',
            userAgent: 'QA-Agent'
        });
        assert.equal(ok, true);

        const wrongIp = verifyVideoToken({
            lessonId: 42,
            userId: 7,
            asset: 'master.m3u8',
            token: tokenPayload.token,
            expire: tokenPayload.expire,
            nonce: tokenPayload.nonce,
            ipAddress: '127.0.0.2',
            userAgent: 'QA-Agent'
        });
        assert.equal(wrongIp, false);
    });

    await run('OpenAPI contains critical paths', () => {
        const openapi = fs.readFileSync(path.join(__dirname, '..', 'openapi.yaml'), 'utf8');
        const required = [
            '/api/auth/login',
            '/api/courses',
            '/api/assignments/submit',
            '/api/videos/stream/{lessonId}/{asset}',
            '/api/system/metrics'
        ];
        for (const p of required) {
            assert.equal(openapi.includes(p), true, `Missing ${p}`);
        }
    });

    if (process.env.RUN_E2E === '1') {
        await run('E2E health + login', async () => {
            const { startServer } = require('../index');
            const port = Number(process.env.E2E_PORT || 5055);
            const { server } = await startServer(port);
            try {
                const health = await fetch(`http://localhost:${port}/api/system/healthz`);
                assert.equal(health.status, 200);

                const login = await fetch(`http://localhost:${port}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: 'admin@mail.com', password: 'admin123' })
                });
                assert.equal(login.status, 200);
            } finally {
                server.close();
            }
        });
    } else {
        console.log('SKIP E2E (set RUN_E2E=1)');
    }

    if (failed > 0) {
        process.exit(1);
    }
};

main().catch((error) => {
    console.error('Test runner crashed:', error.message);
    process.exit(1);
});
