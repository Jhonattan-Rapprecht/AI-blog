const jwt = require('jsonwebtoken');
const ActivityLog = require('../models/activity-log.model');
const RequestProtection = require('../models/request-protection.model');
const protection = require('../config/request-protection.config');
const { loginKeys, constantTimeMatches } = require('../utils/request-protection');
const { errorDetails } = require('../utils/http-errors');

const INVALID_CREDENTIALS = 'Invalid username or password.';

function rejectedLogin(res, retryAfter) {
    if (retryAfter) res.set('Retry-After', String(retryAfter));
    return res.status(retryAfter ? 429 : 401).json({ message: retryAfter ? 'Too many sign-in attempts. Please try again later.' : INVALID_CREDENTIALS });
}

function recordFailedAttempt(keys) {
    return RequestProtection.consume([
        { type: 'login-account-ip', key: keys.accountIp, limit: protection.auth.accountIpLimit, windowSeconds: protection.auth.windowSeconds },
        { type: 'login-ip', key: keys.ip, limit: protection.auth.ipLimit, windowSeconds: protection.auth.windowSeconds }
    ]);
}

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body || {};
        const keys = loginKeys(username, req.ip);

        if (!username || !password) {
            const result = await recordFailedAttempt(keys);
            const statusCode = result.allowed ? 401 : 429;
            void ActivityLog.record({ category: 'authentication', eventType: result.allowed ? 'authentication.login_incomplete' : 'authentication.login_throttled', severity: 'warning', outcome: 'rejected', actorType: 'anonymous', source: 'auth', action: result.allowed ? 'Administrator sign-in rejected' : 'Administrator sign-in throttled', method: req.method, path: req.originalUrl.split('?')[0], statusCode, ipAddress: req.ip, userAgent: req.get('user-agent') });
            return rejectedLogin(res, result.allowed ? null : result.retryAfter);
        }

        if (constantTimeMatches(username, password)) {
            await RequestProtection.clear('login-account-ip', keys.accountIp);
            const token = jwt.sign(
                { username: process.env.ADMIN_USERNAME },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            void ActivityLog.record({ category: 'authentication', eventType: 'authentication.login_succeeded', severity: 'info', outcome: 'success', actorType: 'administrator', actor: process.env.ADMIN_USERNAME, source: 'auth', action: 'Administrator signed in', method: req.method, path: req.originalUrl.split('?')[0], statusCode: 200, ipAddress: req.ip, userAgent: req.get('user-agent') });
            return res.json({
                token,
                username: process.env.ADMIN_USERNAME,
                message: 'Login successful'
            });
        }

        const result = await recordFailedAttempt(keys);
        const statusCode = result.allowed ? 401 : 429;
        void ActivityLog.record({ category: 'authentication', eventType: result.allowed ? 'authentication.login_failed' : 'authentication.login_throttled', severity: 'warning', outcome: 'rejected', actorType: 'anonymous', source: 'auth', action: result.allowed ? 'Administrator sign-in failed' : 'Administrator sign-in throttled', method: req.method, path: req.originalUrl.split('?')[0], statusCode, ipAddress: req.ip, userAgent: req.get('user-agent') });
        return rejectedLogin(res, result.allowed ? null : result.retryAfter);
    } catch (error) {
        console.error('[Authentication] Login handler failed:', errorDetails(error));
        void ActivityLog.record({ category: 'errors', eventType: 'authentication.login_error', severity: 'error', outcome: 'failure', actorType: 'anonymous', source: 'auth', action: 'Administrator login handler failed', method: req.method, path: req.originalUrl.split('?')[0], statusCode: 500, ipAddress: req.ip, userAgent: req.get('user-agent'), details: { errorName: error.name, errorCode: error.code || null } });
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.INVALID_CREDENTIALS = INVALID_CREDENTIALS;
