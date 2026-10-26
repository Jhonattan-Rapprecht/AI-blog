const AnalyticsModel = require('../models/analytics.model');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readPayload(body) {
    if (typeof body !== 'string') return body || {};
    try { return JSON.parse(body); } catch { return {}; }
}

class AnalyticsController {
    async startView(req, res) {
        const articleId = typeof req.body?.articleId === 'string' ? req.body.articleId : '';
        if (!UUID.test(articleId)) return res.status(400).json({ error: 'A valid article ID is required.' });

        try {
            const viewId = await AnalyticsModel.startView(articleId);
            if (!viewId) return res.status(404).json({ error: 'Published article not found.' });
            return res.status(201).json({ viewId });
        } catch (error) {
            console.error('[Analytics] Could not record article view:', error.message);
            return res.status(500).json({ error: 'Could not record article view.' });
        }
    }

    async finishView(req, res) {
        const payload = readPayload(req.body);
        const seconds = Number(payload.readSeconds);
        if (!UUID.test(req.params.viewId) || !Number.isFinite(seconds) || seconds < 0) {
            return res.status(400).json({ error: 'A valid view ID and reading duration are required.' });
        }

        try {
            const updated = await AnalyticsModel.finishView(req.params.viewId, Math.min(86400, Math.floor(seconds)));
            return res.status(updated ? 204 : 404).end();
        } catch (error) {
            console.error('[Analytics] Could not update article reading time:', error.message);
            return res.status(500).end();
        }
    }

    async overview(req, res) {
        try {
            const days = Number.parseInt(req.query.days, 10) || 30;
            const overview = await AnalyticsModel.getOverview(days);
            return res.json(overview);
        } catch (error) {
            console.error('[Analytics] Could not load overview:', error.message);
            return res.status(500).json({ error: 'Could not load article analytics.' });
        }
    }
}

module.exports = new AnalyticsController();
