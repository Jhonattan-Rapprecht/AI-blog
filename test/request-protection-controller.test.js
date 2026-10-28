const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'correct-password';
// Models are stubbed below; these only satisfy the application's startup guard.
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_USER = process.env.DB_USER || 'test';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test';
process.env.DB_NAME = process.env.DB_NAME || 'test';
const AuthController = require('../src/controllers/auth.controller');
const AnalyticsController = require('../src/controllers/analytics.controller');
const RequestProtection = require('../src/models/request-protection.model');
const AnalyticsModel = require('../src/models/analytics.model');
const ActivityLog = require('../src/models/activity-log.model');

function response() {
    return { statusCode: null, body: null, headers: {}, status(code) { this.statusCode = code; return this; }, set(name, value) { this.headers[name] = value; return this; }, json(body) { this.body = body; return this; }, end() { return this; } };
}
function request(body = {}) { return { body, ip: '127.0.0.1', method: 'POST', originalUrl: '/api/example', params: {}, get: () => 'test' }; }

test('login responses remain generic and return Retry-After when throttled', async () => {
    const consume = RequestProtection.consume; const record = ActivityLog.record;
    RequestProtection.consume = async () => ({ allowed: true }); ActivityLog.record = async () => {};
    try {
        const invalid = response();
        await AuthController.login(request({ username: 'unknown', password: 'wrong' }), invalid);
        assert.equal(invalid.statusCode, 401);
        assert.equal(invalid.body.message, 'Invalid username or password.');
        RequestProtection.consume = async () => ({ allowed: false, retryAfter: 123 });
        const throttled = response();
        await AuthController.login(request({ username: 'unknown', password: 'wrong' }), throttled);
        assert.equal(throttled.statusCode, 429);
        assert.equal(throttled.headers['Retry-After'], '123');
        assert.doesNotMatch(throttled.body.message, /unknown/i);
    } finally { RequestProtection.consume = consume; ActivityLog.record = record; }
});

test('analytics rejects invalid payloads and throttles before database writes', async () => {
    const consume = RequestProtection.consume; const startView = AnalyticsModel.startView;
    try {
        RequestProtection.consume = async () => ({ allowed: true });
        AnalyticsModel.startView = async () => { throw new Error('must not write invalid payload'); };
        const invalid = response(); await AnalyticsController.startView(request({ articleId: 'not-a-uuid' }), invalid);
        assert.equal(invalid.statusCode, 400);
        RequestProtection.consume = async () => ({ allowed: false, retryAfter: 60 });
        const throttled = response(); await AnalyticsController.startView(request({ articleId: 'not-a-uuid' }), throttled);
        assert.equal(throttled.statusCode, 429);
        assert.equal(throttled.headers['Retry-After'], '60');
    } finally { RequestProtection.consume = consume; AnalyticsModel.startView = startView; }
});
