const test = require('node:test');
const assert = require('node:assert/strict');

test('API origin defaults to localhost only in development and same-origin in production', async () => {
    const { resolveApiOrigin } = await import('../frontend/src/api/origin.js');
    assert.equal(resolveApiOrigin('', true), 'http://localhost:3000');
    assert.equal(resolveApiOrigin('', false), '');
    assert.equal(resolveApiOrigin('https://api.example.com', false), 'https://api.example.com');
});

test('API origin rejects malformed, credentialed, and non-origin values', async () => {
    const { resolveApiOrigin } = await import('../frontend/src/api/origin.js');
    for (const value of ['api.example.com', 'ftp://api.example.com', 'https://user:pass@api.example.com', 'https://api.example.com/api', 'https://api.example.com?debug=1', 'https://api.example.com#fragment']) {
        assert.throws(() => resolveApiOrigin(value, false), /VITE_API_ORIGIN/);
    }
});
