const jwt = require('jsonwebtoken');
const ActivityLog = require('../models/activity-log.model');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            void ActivityLog.record({ category: 'authentication', eventType: 'authentication.login_incomplete', severity: 'warning', outcome: 'rejected', actorType: 'anonymous', actor: typeof username === 'string' ? username.slice(0, 255) : null, source: 'auth', action: 'Administrator sign-in request was missing credentials', method: req.method, path: req.originalUrl.split('?')[0], statusCode: 400, ipAddress: req.ip, userAgent: req.get('user-agent') });
            return res.status(400).json({ message: 'Username and password are required' });
        }

        // Verify against .env credentials
        if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
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

        void ActivityLog.record({ category: 'authentication', eventType: 'authentication.login_failed', severity: 'warning', outcome: 'rejected', actorType: 'anonymous', actor: typeof username === 'string' ? username.slice(0, 255) : null, source: 'auth', action: 'Administrator sign-in failed', method: req.method, path: req.originalUrl.split('?')[0], statusCode: 401, ipAddress: req.ip, userAgent: req.get('user-agent') });
        return res.status(401).json({ message: 'Invalid username or password' });
    } catch (error) {
        console.error('Login error:', error);
        void ActivityLog.record({ category: 'errors', eventType: 'authentication.login_error', severity: 'error', outcome: 'failure', actorType: 'anonymous', source: 'auth', action: 'Administrator login handler failed', method: req.method, path: req.originalUrl.split('?')[0], statusCode: 500, ipAddress: req.ip, userAgent: req.get('user-agent'), details: { errorName: error.name, errorCode: error.code || null } });
        res.status(500).json({ message: 'Internal server error' });
    }
};
