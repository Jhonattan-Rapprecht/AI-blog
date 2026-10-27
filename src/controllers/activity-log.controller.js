const ActivityLog = require('../models/activity-log.model');
const { csvFor, xlsxFor, pdfFor } = require('../utils/activity-report-export');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_EXPORT_ROWS = 50000;

function validDate(value) {
    if (!DATE_RE.test(value || '')) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function readFilters(query) {
    const category = String(query.category || 'all');
    const from = String(query.from || '');
    const to = String(query.to || '');
    if (!['all', ...ActivityLog.constructor.categories()].includes(category)) return { error: 'Choose a valid report type.' };
    if ((from && !validDate(from)) || (to && !validDate(to))) return { error: 'Enter valid dates in YYYY-MM-DD format.' };
    if (from && to && from > to) return { error: 'The start date must be on or before the end date.' };
    return { category, from, to };
}

class ActivityLogController {
    async clientError(req, res) {
        const data = req.body || {};
        const allowedTypes = new Set(['browser.uncaught_exception', 'browser.unhandled_rejection', 'browser.api_connection_error']);
        if (!allowedTypes.has(data.eventType) || typeof data.message !== 'string' || !data.message.trim()) {
            return res.status(400).json({ error: 'A supported browser error type and message are required.' });
        }
        const clientPath = typeof data.clientPath === 'string' && data.clientPath.startsWith('/') ? data.clientPath.split('?')[0].slice(0, 255) : null;
        const sourcePath = typeof data.sourcePath === 'string' ? data.sourcePath.split('?')[0].slice(0, 255) : null;
        const safeMessage = data.message.trim().slice(0, 500)
            .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
            .replace(/([?&](?:token|key|password|secret)=)[^&\s]+/gi, '$1[redacted]');
        void ActivityLog.record({
            category: 'errors',
            eventType: data.eventType,
            severity: 'error',
            outcome: 'failure',
            actorType: 'administrator',
            actor: req.user?.username || null,
            source: 'admin_browser',
            action: data.eventType === 'browser.uncaught_exception' ? 'Browser reported an uncaught error'
                : data.eventType === 'browser.unhandled_rejection' ? 'Browser reported an unhandled promise rejection'
                    : 'Administrator browser could not reach the API',
            targetType: 'admin_page',
            targetLabel: clientPath,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details: {
                errorName: typeof data.errorName === 'string' ? data.errorName.slice(0, 100) : 'Error',
                message: safeMessage,
                sourcePath,
                requestPath: typeof data.requestPath === 'string' && data.requestPath.startsWith('/api/') ? data.requestPath.split('?')[0].slice(0, 255) : null,
                requestMethod: typeof data.requestMethod === 'string' ? data.requestMethod.slice(0, 10).toUpperCase() : null,
                line: Number.isInteger(data.line) ? data.line : null,
                column: Number.isInteger(data.column) ? data.column : null
            }
        });
        return res.status(202).json({ accepted: true });
    }

    async reports(req, res) {
        const filters = readFilters(req.query);
        if (filters.error) return res.status(400).json({ error: filters.error });
        const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
        const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);
        try {
            const [result, overview] = await Promise.all([ActivityLog.list(filters, limit, offset), ActivityLog.overview(filters)]);
            return res.json({ ...result, overview, limit, offset, categories: ActivityLog.constructor.categories() });
        } catch (error) {
            console.error('[Activity Log] Report query failed:', error.message);
            void ActivityLog.record({ category: 'errors', eventType: 'activity_report.query_failed', severity: 'error', outcome: 'failure', actorType: 'administrator', actor: req.user?.username, source: 'activity_reports', action: 'Activity report could not be loaded', details: { errorName: error.name, errorCode: error.code || null } });
            return res.status(500).json({ error: 'Could not load activity report.' });
        }
    }

    async export(req, res) {
        const filters = readFilters(req.query);
        if (filters.error) return res.status(400).json({ error: filters.error });
        const format = String(req.query.format || 'xlsx').toLowerCase();
        if (!['xlsx', 'csv', 'pdf'].includes(format)) return res.status(400).json({ error: 'Choose XLSX, CSV, or PDF export.' });
        try {
            const result = await ActivityLog.exportRows(filters, MAX_EXPORT_ROWS);
            if (result.truncated) return res.status(413).json({ error: `This report has more than ${MAX_EXPORT_ROWS.toLocaleString()} rows. Narrow the date range before exporting.` });
            const overview = await ActivityLog.overview(filters);
            const dateStamp = new Date().toISOString().slice(0, 10);
            const category = filters.category === 'all' ? 'all-activity' : filters.category;
            const reportLabels = { all: 'All activity', content: 'Articles and content', publishing: 'Publishing and scheduling', media: 'Media Library', authentication: 'Administrator access', ai: 'AI and model status', settings: 'Settings changes', automation: 'Automation', errors: 'Errors and rejected actions', system: 'System events', analytics: 'Reader activity' };
            const metadata = {
                reportLabel: reportLabels[filters.category] || filters.category,
                from: filters.from,
                to: filters.to,
                generatedAt: new Date().toISOString().replace('T', ' ').replace('Z', ''),
                total: result.rows.length
            };
            const filename = `blogstudio-${category}-${dateStamp}.${format}`;
            if (format === 'csv') {
                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                return res.send(csvFor(result.rows));
            }
            if (format === 'pdf') {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                return res.send(pdfFor(result.rows, overview, metadata));
            }
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(xlsxFor(result.rows, overview, metadata));
        } catch (error) {
            console.error('[Activity Log] Export failed:', error.message);
            void ActivityLog.record({ category: 'errors', eventType: 'activity_report.export_failed', severity: 'error', outcome: 'failure', actorType: 'administrator', actor: req.user?.username, source: 'activity_reports', action: 'Activity report export failed', details: { errorName: error.name, errorCode: error.code || null } });
            return res.status(500).json({ error: 'Could not export activity report.' });
        }
    }
}

module.exports = new ActivityLogController();
