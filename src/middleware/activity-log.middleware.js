const ActivityLog = require('../models/activity-log.model');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SAFE_FIELDS = new Set(['status', 'category_id', 'featured_media_id', 'scheduled_at', 'filename', 'media_type', 'file_size', 'name', 'model', 'language', 'tone', 'audience', 'articleLength']);

function describeRequest(pathname, method) {
    const parts = pathname.split('/').filter(Boolean);
    const root = parts[1] || 'system';
    const suffix = parts.slice(2).filter((part) => !/^[0-9a-f-]{24,}$/i.test(part));
    const operation = suffix.at(-1) || method.toLowerCase();
    if (root === 'articles' && operation === 'publish') return { category: 'publishing', eventType: 'article.published', action: 'Publish article', targetType: 'article' };
    if (root === 'articles' && operation === 'schedule') return { category: 'publishing', eventType: 'article.scheduled', action: 'Schedule article', targetType: 'article' };
    const map = {
        articles: ['content', 'article', 'Article'],
        media: ['media', 'media', 'Media item'],
        categories: ['content', 'category', 'Category'],
        settings: ['settings', 'settings', 'System settings'],
        ai: ['ai', 'ai_action', 'AI action'],
        automation: ['automation', 'automation', 'Automation job'],
        analytics: ['analytics', 'analytics', 'Analytics'],
        auth: ['authentication', 'authentication', 'Administrator session']
    };
    const [category, type, label] = map[root] || ['system', root, root];
    const noun = root === 'articles' ? 'article' : root === 'media' ? 'media' : root === 'categories' ? 'category' : root;
    const verb = method === 'POST' ? 'created' : method === 'PUT' || method === 'PATCH' ? 'updated' : method === 'DELETE' ? 'deleted' : 'requested';
    const eventType = `${noun}.${operation === 'upload' ? 'uploaded' : operation === 'video-link' ? 'link_added' : verb}`;
    const actionVerb = method === 'POST' ? 'Create' : method === 'PUT' || method === 'PATCH' ? 'Update' : method === 'DELETE' ? 'Delete' : 'Request';
    const actionSuffix = operation === method.toLowerCase() ? '' : ` (${operation})`;
    return { category, eventType, action: `${actionVerb} ${label}${actionSuffix}`, targetType: type };
}

function safeDetails(req) {
    const body = req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : {};
    const details = {};
    const originalPath = req.originalUrl.split('?')[0];
    if (body.title && /^\/api\/articles(?:\/|$)/.test(originalPath)) details.articleTitle = String(body.title).slice(0, 255);
    if (body.title && originalPath === '/api/media/video-link') details.mediaTitle = String(body.title).slice(0, 255);
    if (originalPath === '/api/media/upload') {
        const filename = String(req.query.filename || '').replace(/[\\/\0-\x1f]/g, '').slice(0, 255);
        if (filename) details.filename = filename;
        const size = Number(req.get('content-length'));
        if (Number.isFinite(size) && size >= 0) details.file_size = size;
        details.media_type = req.get('content-type')?.startsWith('video/') ? 'video' : 'image';
    }
    if (originalPath === '/api/media/video-link' && typeof body.url === 'string') {
        try { details.videoHost = new URL(body.url).hostname.slice(0, 255); } catch { /* Invalid URLs are recorded as rejected without their full value. */ }
    }
    const changedFields = Object.keys(body).filter((key) => SAFE_FIELDS.has(key));
    if (changedFields.length) details.changedFields = changedFields;
    for (const key of ['status', 'category_id', 'featured_media_id', 'scheduled_at', 'filename', 'media_type', 'file_size', 'name', 'model']) {
        if (body[key] !== undefined && (typeof body[key] !== 'object' || body[key] === null)) details[key] = String(body[key]).slice(0, 255);
    }
    return Object.keys(details).length ? details : null;
}

module.exports = (req, res, next) => {
    const pathname = req.originalUrl.split('?')[0];
    const isReportRead = pathname.startsWith('/api/activity-logs');
    if (isReportRead) return next();
    if (req.activityLogListenerAttached) return next();
    req.activityLogListenerAttached = true;
    const started = Date.now();
    res.on('finish', () => {
        if (req.activityErrorRecorded && res.statusCode >= 400) return;
        if (!MUTATING_METHODS.has(req.method) && res.statusCode < 400) return;
        const descriptor = describeRequest(pathname, req.method);
        const rejected = res.statusCode >= 400 && res.statusCode < 500;
        const failed = res.statusCode >= 500;
        const pathParts = pathname.split('/').filter(Boolean);
        const root = pathParts[1];
        const pathTargetId = ['articles', 'media', 'categories'].includes(root) ? (pathParts[2] && !['upload', 'video-link'].includes(pathParts[2]) ? pathParts[2] : null)
            : root === 'ai' && ['history', 'review-history', 'review-findings'].includes(pathParts[2]) ? pathParts[3] || null
                : null;
        const targetId = req.params?.id || req.params?.articleId || req.params?.findingId || req.body?.articleId || pathTargetId;
        const details = safeDetails(req) || {};
        details.durationMs = Date.now() - started;
        ActivityLog.record({
            ...descriptor,
            category: failed ? 'errors' : descriptor.category,
            eventType: failed ? 'api.request_failed' : descriptor.eventType,
            action: failed ? `${descriptor.action} failed` : descriptor.action,
            severity: failed ? 'error' : rejected ? 'warning' : 'info',
            outcome: failed ? 'failure' : rejected ? 'rejected' : 'success',
            actorType: req.user?.username ? 'administrator' : 'system',
            actor: req.user?.username || 'system',
            source: 'admin_api',
            targetId,
        targetLabel: req.activityTargetLabel || details.articleTitle || details.mediaTitle || details.filename || details.name || null,
            method: req.method,
            path: req.route?.path ? `${req.baseUrl}${req.route.path}` : pathname,
            statusCode: res.statusCode,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details
        });
    });
    next();
};
