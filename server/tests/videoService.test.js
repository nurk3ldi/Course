const test = require('node:test');
const assert = require('node:assert/strict');
const {
    createVideoToken,
    verifyVideoToken
} = require('../services/videoService');

test('video token validates for same client fingerprint', () => {
    const payload = createVideoToken({
        lessonId: 10,
        userId: 22,
        asset: 'master.m3u8',
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/Test'
    });

    const ok = verifyVideoToken({
        lessonId: 10,
        userId: 22,
        asset: 'master.m3u8',
        expire: payload.expire,
        token: payload.token,
        nonce: payload.nonce,
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/Test'
    });
    assert.equal(ok, true);
});

test('video token is rejected from another fingerprint', () => {
    const payload = createVideoToken({
        lessonId: 11,
        userId: 33,
        asset: '720p.m3u8',
        ipAddress: '127.0.0.1',
        userAgent: 'Agent-A'
    });

    const badIp = verifyVideoToken({
        lessonId: 11,
        userId: 33,
        asset: '720p.m3u8',
        expire: payload.expire,
        token: payload.token,
        nonce: payload.nonce,
        ipAddress: '127.0.0.2',
        userAgent: 'Agent-A'
    });
    assert.equal(badIp, false);
});
