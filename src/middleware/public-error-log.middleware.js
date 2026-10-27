const ActivityLog = require('../models/activity-log.model');

module.exports = (req, res, next) => {
    res.on('finish', () => {
        if (req.activityErrorRecorded) return;
        if (res.statusCode < 500) return;
        ActivityLog.record({
            category: 'errors',
            eventType: 'public.request_failed',
            severity: 'error',
            outcome: 'failure',
            actorType: 'anonymous',
            source: 'public_site',
            action: 'Public site request failed',
            method: req.method,
            path: req.originalUrl.split('?')[0],
            statusCode: res.statusCode,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
    });
    next();
};
