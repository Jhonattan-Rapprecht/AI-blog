const test = require('node:test');
const assert = require('node:assert/strict');
const { errorDetails, sendUnexpectedError } = require('../src/utils/http-errors');

test('unexpected errors expose only the configured client-safe message', () => {
    const response = { statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    const secret = new Error('ER_ACCESS_DENIED: password=do-not-disclose');
    const original = console.error;
    console.error = () => {};
    try { sendUnexpectedError(response, 'Test', secret, 'Could not load data.'); }
    finally { console.error = original; }
    assert.equal(response.statusCode, 500);
    assert.deepEqual(response.body, { error: 'Could not load data.' });
    assert.deepEqual(errorDetails(secret), { name: 'Error', code: null, messageLength: secret.message.length });
});
