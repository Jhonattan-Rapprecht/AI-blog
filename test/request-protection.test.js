const test = require('node:test');
const assert = require('node:assert/strict');

const original = { JWT_SECRET: process.env.JWT_SECRET, ADMIN_USERNAME: process.env.ADMIN_USERNAME, ADMIN_PASSWORD: process.env.ADMIN_PASSWORD };
process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'correct-password';
const { fingerprint, loginKeys, analyticsKeys, constantTimeMatches } = require('../src/utils/request-protection');
const { evaluateFixedWindow } = require('../src/utils/rate-window');

test.after(() => {
    for (const [key, value] of Object.entries(original)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
});

test('request-protection fingerprints are stable, opaque and scoped', () => {
    assert.match(fingerprint('example'), /^[a-f0-9]{64}$/);
    assert.equal(fingerprint('example'), fingerprint('example'));
    assert.notEqual(fingerprint('example'), fingerprint('other'));
    const login = loginKeys('Admin', '127.0.0.1');
    const analytics = analyticsKeys('11111111-1111-4111-8111-111111111111', '127.0.0.1');
    assert.notEqual(login.ip, analytics.ip);
    assert.notEqual(login.accountIp, login.ip);
});

test('credential comparison accepts only the configured pair without plain equality checks', () => {
    assert.equal(constantTimeMatches('admin', 'correct-password'), true);
    assert.equal(constantTimeMatches('admin', 'wrong-password'), false);
    assert.equal(constantTimeMatches('other', 'correct-password'), false);
});

test('fixed windows enforce the configured threshold and recover after expiry', () => {
    const start = new Date('2026-10-28T10:00:00.000Z');
    const beforeLimit = evaluateFixedWindow({ attempts: 4, startedAt: start, now: new Date('2026-10-28T10:01:00.000Z'), limit: 5, windowSeconds: 900 });
    const throttled = evaluateFixedWindow({ attempts: 5, startedAt: start, now: new Date('2026-10-28T10:01:00.000Z'), limit: 5, windowSeconds: 900 });
    const recovered = evaluateFixedWindow({ attempts: 5, startedAt: start, now: new Date('2026-10-28T10:15:00.000Z'), limit: 5, windowSeconds: 900 });
    assert.equal(beforeLimit.allowed, true);
    assert.equal(throttled.allowed, false);
    assert.equal(throttled.retryAfter, 840);
    assert.equal(recovered.allowed, true);
    assert.equal(recovered.expired, true);
});
