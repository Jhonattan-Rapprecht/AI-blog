const { randomUUID } = require('crypto');
const db = require('../config/db');
const AnalyticsModel = require('./analytics.model');

const CATEGORIES = ['content', 'publishing', 'media', 'authentication', 'ai', 'settings', 'automation', 'errors', 'system', 'analytics'];

class ActivityLogModel {
    constructor() { this.ready = null; }

    ensureTable() {
        if (!this.ready) {
            this.ready = db.query(`CREATE TABLE IF NOT EXISTS system_activity_logs (
                id CHAR(36) PRIMARY KEY,
                category VARCHAR(40) NOT NULL,
                event_type VARCHAR(100) NOT NULL,
                severity ENUM('info', 'warning', 'error', 'critical') NOT NULL DEFAULT 'info',
                outcome ENUM('success', 'rejected', 'failure', 'observed') NOT NULL DEFAULT 'success',
                actor_type ENUM('administrator', 'system', 'anonymous') NOT NULL DEFAULT 'system',
                actor VARCHAR(255) NULL,
                \`source\` VARCHAR(100) NOT NULL,
                \`action\` VARCHAR(255) NOT NULL,
                target_type VARCHAR(60) NULL,
                target_id VARCHAR(255) NULL,
                target_label VARCHAR(500) NULL,
                method VARCHAR(10) NULL,
                path VARCHAR(500) NULL,
                status_code SMALLINT UNSIGNED NULL,
                ip_address VARCHAR(45) NULL,
                user_agent VARCHAR(500) NULL,
                details JSON NULL,
                created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                INDEX idx_activity_created (created_at),
                INDEX idx_activity_category_created (category, created_at),
                INDEX idx_activity_severity_created (severity, created_at),
                INDEX idx_activity_actor_created (actor, created_at),
                INDEX idx_activity_event_created (event_type, created_at)
            )`).catch((error) => { this.ready = null; throw error; });
        }
        return this.ready;
    }

    async record(event) {
        try {
            await this.ensureTable();
            await db.query(`INSERT INTO system_activity_logs
                (id, category, event_type, severity, outcome, actor_type, actor, \`source\`, \`action\`, target_type, target_id, target_label, method, path, status_code, ip_address, user_agent, details)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                randomUUID(),
                CATEGORIES.includes(event.category) ? event.category : 'system',
                String(event.eventType || 'system.event').slice(0, 100),
                ['info', 'warning', 'error', 'critical'].includes(event.severity) ? event.severity : 'info',
                ['success', 'rejected', 'failure', 'observed'].includes(event.outcome) ? event.outcome : 'observed',
                ['administrator', 'system', 'anonymous'].includes(event.actorType) ? event.actorType : 'system',
                event.actor ? String(event.actor).slice(0, 255) : null,
                String(event.source || 'application').slice(0, 100),
                String(event.action || event.eventType || 'System activity').slice(0, 255),
                event.targetType ? String(event.targetType).slice(0, 60) : null,
                event.targetId ? String(event.targetId).slice(0, 255) : null,
                event.targetLabel ? String(event.targetLabel).slice(0, 500) : null,
                event.method ? String(event.method).slice(0, 10) : null,
                event.path ? String(event.path).slice(0, 500) : null,
                Number.isInteger(event.statusCode) ? event.statusCode : null,
                event.ipAddress ? String(event.ipAddress).slice(0, 45) : null,
                event.userAgent ? String(event.userAgent).slice(0, 500) : null,
                event.details == null ? null : JSON.stringify(event.details)
            ]);
        } catch (error) {
            // Audit logging must never prevent the original application action.
            console.error('[Activity Log] Could not record event:', error.message);
        }
    }

    filters({ category, from, to }) {
        const clauses = [];
        const params = [];
        if (category === 'errors') clauses.push("(category = 'errors' OR outcome IN ('rejected', 'failure') OR severity IN ('error', 'critical'))");
        else if (category && category !== 'all' && CATEGORIES.includes(category)) { clauses.push('category = ?'); params.push(category); }
        if (from) { clauses.push('created_at >= ?'); params.push(`${from} 00:00:00`); }
        if (to) { clauses.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(`${to} 00:00:00`); }
        return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
    }

    dateFilters({ from, to }) {
        const clauses = [];
        const params = [];
        if (from) { clauses.push('created_at >= ?'); params.push(`${from} 00:00:00`); }
        if (to) { clauses.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(`${to} 00:00:00`); }
        return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
    }

    async listReaderActivity(filters, limit, offset) {
        await AnalyticsModel.ensureTable();
        const where = this.dateFilters(filters);
        const base = `FROM article_read_views v JOIN articles a ON a.id = v.article_id ${where.sql.replaceAll('created_at', 'v.created_at')}`;
        const [rows, counts] = await Promise.all([
            db.query(`SELECT v.id, 'analytics' AS category, 'article.read_view' AS event_type, 'info' AS severity, 'observed' AS outcome, 'anonymous' AS actor_type, NULL AS actor, 'public_article' AS source, 'Article page view recorded' AS action, 'article' AS target_type, v.article_id AS target_id, a.title AS target_label, 'GET' AS method, CONCAT('/blog/', a.slug) AS path, NULL AS status_code, NULL AS ip_address, NULL AS user_agent, JSON_OBJECT('readSeconds', v.read_seconds, 'readerIdentityTracked', false) AS details, v.created_at ${base} ORDER BY v.created_at DESC, v.id DESC LIMIT ? OFFSET ?`, [...where.params, limit, offset]),
            db.query(`SELECT COUNT(*) AS total ${base}`, where.params)
        ]);
        return { events: rows, total: Number(counts[0]?.total || 0) };
    }

    async listAllActivity(filters, limit, offset) {
        await AnalyticsModel.ensureTable();
        const auditWhere = this.filters({ ...filters, category: 'all' });
        const readerWhere = this.dateFilters(filters);
        const readerClause = readerWhere.sql.replaceAll('created_at', 'v.created_at');
        const readerSelect = `SELECT v.id, 'analytics' AS category, 'article.read_view' AS event_type, 'info' AS severity, 'observed' AS outcome, 'anonymous' AS actor_type, NULL AS actor, 'public_article' AS source, 'Article page view recorded' AS action, 'article' AS target_type, v.article_id AS target_id, a.title AS target_label, 'GET' AS method, CONCAT('/blog/', a.slug) AS path, NULL AS status_code, NULL AS ip_address, NULL AS user_agent, JSON_OBJECT('readSeconds', v.read_seconds, 'readerIdentityTracked', false) AS details, v.created_at FROM article_read_views v JOIN articles a ON a.id = v.article_id ${readerClause}`;
        const auditSelect = `SELECT * FROM system_activity_logs ${auditWhere.sql}`;
        const [rows, auditCounts, readerCounts] = await Promise.all([
            db.query(`SELECT * FROM (${auditSelect} UNION ALL ${readerSelect}) AS combined_activity ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [...auditWhere.params, ...readerWhere.params, limit, offset]),
            db.query(`SELECT COUNT(*) AS total FROM system_activity_logs ${auditWhere.sql}`, auditWhere.params),
            db.query(`SELECT COUNT(*) AS total FROM article_read_views WHERE ${readerWhere.sql ? readerWhere.sql.slice(6) : '1=1'}`, readerWhere.params)
        ]);
        return { events: rows, total: Number(auditCounts[0]?.total || 0) + Number(readerCounts[0]?.total || 0) };
    }

    async overview(filters) {
        await this.ensureTable();
        await AnalyticsModel.ensureTable();
        const where = this.dateFilters(filters);
        const [rows, readerCounts, errors, total] = await Promise.all([
            db.query(`SELECT category, COUNT(*) AS total FROM system_activity_logs ${where.sql} GROUP BY category`, where.params),
            db.query(`SELECT COUNT(*) AS total FROM article_read_views WHERE ${where.sql ? where.sql.slice(6) : '1=1'}`, where.params),
            db.query(`SELECT COUNT(*) AS total FROM system_activity_logs ${where.sql ? `${where.sql} AND` : 'WHERE'} (category = 'errors' OR outcome IN ('rejected', 'failure') OR severity IN ('error', 'critical'))`, where.params),
            db.query(`SELECT COUNT(*) AS total FROM system_activity_logs ${where.sql}`, where.params)
        ]);
        const counts = Object.fromEntries(rows.map((row) => [row.category, Number(row.total)]));
        counts.analytics = Number(readerCounts[0]?.total || 0);
        counts.errors = Number(errors[0]?.total || 0);
        return { counts, total: Number(total[0]?.total || 0) + counts.analytics };
    }

    async list(filters, limit = 50, offset = 0) {
        await this.ensureTable();
        if (filters.category === 'analytics') return this.listReaderActivity(filters, limit, offset);
        if (filters.category === 'all') return this.listAllActivity(filters, limit, offset);
        const where = this.filters(filters);
        const [rows, counts] = await Promise.all([
            db.query(`SELECT * FROM system_activity_logs ${where.sql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [...where.params, limit, offset]),
            db.query(`SELECT COUNT(*) AS total FROM system_activity_logs ${where.sql}`, where.params)
        ]);
        return { events: rows, total: Number(counts[0]?.total || 0) };
    }

    async exportRows(filters, limit = 50000) {
        await this.ensureTable();
        if (filters.category === 'analytics') {
            const result = await this.listReaderActivity(filters, limit + 1, 0);
            return { rows: result.events.slice(0, limit), truncated: result.total > limit };
        }
        if (filters.category === 'all') {
            const result = await this.listAllActivity(filters, limit + 1, 0);
            return { rows: result.events.slice(0, limit), truncated: result.total > limit };
        }
        const where = this.filters(filters);
        const rows = await db.query(`SELECT * FROM system_activity_logs ${where.sql} ORDER BY created_at DESC, id DESC LIMIT ?`, [...where.params, limit + 1]);
        return { rows: rows.slice(0, limit), truncated: rows.length > limit };
    }

    static categories() { return CATEGORIES; }
}

module.exports = new ActivityLogModel();
