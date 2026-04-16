const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../index');

test('health and login smoke e2e', async (t) => {
    if (process.env.RUN_E2E !== '1') {
        t.skip('Set RUN_E2E=1 to run E2E test');
        return;
    }

    const port = Number(process.env.E2E_PORT || 5055);
    const { server } = await startServer(port);
    t.after(() => server.close());

    const health = await fetch(`http://localhost:${port}/api/system/healthz`);
    assert.equal(health.status, 200);

    const login = await fetch(`http://localhost:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@mail.com', password: 'admin123' })
    });

    assert.equal(login.status, 200);
    const data = await login.json();
    assert.equal(Boolean(data.token), true);
});
