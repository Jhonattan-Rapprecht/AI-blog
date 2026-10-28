const test = require('node:test');
const assert = require('node:assert/strict');

function loadConfig(overrides = {}) {
    const path = require.resolve('../src/config/request-protection.config');
    const before = {};
    for (const key of Object.keys(overrides)) { before[key] = process.env[key]; process.env[key] = overrides[key]; }
    delete require.cache[path];
    try { return require('../src/config/request-protection.config'); }
    finally {
        for (const key of Object.keys(overrides)) {
            if (before[key] === undefined) delete process.env[key]; else process.env[key] = before[key];
        }
        delete require.cache[path];
    }
}

test('request protection has conservative defaults and explicit proxy trust', () => {
    const config = loadConfig({ TRUST_PROXY: '' });
    assert.equal(config.trustProxy, false);
    assert.equal(config.auth.accountIpLimit, 5);
    assert.equal(config.auth.windowSeconds, 900);
});

test('request protection rejects unsafe proxy and rate-limit configuration', () => {
    assert.throws(() => loadConfig({ TRUST_PROXY: 'true' }), /TRUST_PROXY/);
    assert.throws(() => loadConfig({ AUTH_LOGIN_ACCOUNT_IP_LIMIT: '0' }), /AUTH_LOGIN_ACCOUNT_IP_LIMIT/);
    assert.equal(loadConfig({ TRUST_PROXY: '1' }).trustProxy, 1);
});
