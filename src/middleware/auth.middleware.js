const jwt = require('jsonwebtoken');
const ActivityLog = require('../models/activity-log.model');

function logRejectedAuth(req, action) {
    ActivityLog.record({
        category: 'authentication',
        eventType: 'authentication.token_rejected',
        severity: 'warning',
        outcome: 'rejected',
        actorType: 'anonymous',
        actor: null,
        source: 'auth_middleware',
        action,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        statusCode: 401,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });
}

module.exports = (req, res, next) => {
    try {
        // Extract token from Authorization header
        // Expected format: "Bearer <token>"
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logRejectedAuth(req, 'Rejected request without an administrator token');
            return res.status(401).json({
                message: 'Authentication required. Please provide a valid token.'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token using the secret from .env
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach decoded user info to the request object
        req.user = decoded;

        next();
    } catch (error) {
        console.error('JWT Verification Error:', error.message);
        logRejectedAuth(req, 'Rejected request with an invalid or expired administrator token');
        return res.status(401).json({
            message: 'Invalid or expired token. Please log in again.'
        });
    }
};
