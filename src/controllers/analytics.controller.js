const AnalyticsModel = require('../models/analytics.model');
const RequestProtection = require('../models/request-protection.model');
const protection = require('../config/request-protection.config');
const { analyticsKeys } = require('../utils/request-protection');
const { errorDetails } = require('../utils/http-errors');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readPayload(body) {
    if (typeof body !== 'string') return body || {};
    try { return JSON.parse(body); } catch { return {}; }
}

class AnalyticsController {
    async startView(req, res) {
        const articleId = typeof req.body?.articleId === 'string' ? req.body.articleId : '';
        const visitorId = typeof req.body?.visitorId === 'string' ? req.body.visitorId : '';

        try {
            const keys = analyticsKeys(visitorId, req.ip);
            const allowed = await RequestProtection.consume([{ type: 'analytics-ip', key: keys.ip, limit: protection.analytics.ipLimit, windowSeconds: protection.analytics.windowSeconds }]);
            if (!allowed.allowed) {
                res.set('Retry-After', String(allowed.retryAfter));
                return res.status(429).json({ error: 'Too many analytics requests. Please try again later.' });
            }
            if (!UUID.test(articleId) || !UUID.test(visitorId)) return res.status(400).json({ error: 'A valid article ID and browser session are required.' });
            const view = await AnalyticsModel.startView(articleId, keys.visitor, protection.analytics.dedupeSeconds);
            if (!view) return res.status(404).json({ error: 'Published article not found.' });
            if (view.duplicate) return res.status(204).end();
            return res.status(201).json({ trackingToken: view.trackingToken });
        } catch (error) {
            console.error('[Analytics] Could not record article view:', errorDetails(error));
            return res.status(500).json({ error: 'Could not record article view.' });
        }
    }

    async finishView(req, res) {
        const payload = readPayload(req.body);
        const seconds = Number(payload.readSeconds);
        if (!UUID.test(req.params.viewId) || !Number.isFinite(seconds) || seconds < 0) {
            return res.status(400).json({ error: 'A valid tracking token and reading duration are required.' });
        }

        try {
            const updated = await AnalyticsModel.finishView(req.params.viewId, Math.min(86400, Math.floor(seconds)));
            return res.status(updated ? 204 : 404).end();
        } catch (error) {
            console.error('[Analytics] Could not update article reading time:', errorDetails(error));
            return res.status(500).end();
        }
    }

    async overview(req, res) {
        try {
            const days = Number.parseInt(req.query.days, 10) || 30;
            const overview = await AnalyticsModel.getOverview(days);
            return res.json(overview);
        } catch (error) {
            console.error('[Analytics] Could not load overview:', errorDetails(error));
            return res.status(500).json({ error: 'Could not load article analytics.' });
        }
    }
}

module.exports = new AnalyticsController();
