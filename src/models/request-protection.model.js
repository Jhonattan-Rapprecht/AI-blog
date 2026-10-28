const db = require('../config/db');
const { evaluateFixedWindow } = require('../utils/rate-window');

class RequestProtectionModel {
    constructor() { this.ready = null; }

    ensureTable() { return Promise.resolve(); }

    async consume(buckets) {
        await this.ensureTable();
        const connection = await db.transaction();
        try {
            const [clockRows] = await connection.execute('SELECT CURRENT_TIMESTAMP(3) AS now');
            const now = new Date(clockRows[0].now);
            const outcomes = [];
            for (const bucket of buckets) {
                await connection.execute(`INSERT INTO request_protection_buckets (bucket_type, bucket_key, attempts, window_started_at, updated_at)
                    VALUES (?, ?, 0, ?, ?) ON DUPLICATE KEY UPDATE bucket_key = VALUES(bucket_key)`, [bucket.type, bucket.key, now, now]);
                const [rows] = await connection.execute('SELECT attempts, window_started_at FROM request_protection_buckets WHERE bucket_type = ? AND bucket_key = ? FOR UPDATE', [bucket.type, bucket.key]);
                const row = rows[0];
                const startedAt = new Date(row.window_started_at);
                const decision = evaluateFixedWindow({ attempts: row.attempts, startedAt, now, limit: bucket.limit, windowSeconds: bucket.windowSeconds });
                outcomes.push({ bucket, ...decision, startedAt });
            }
            const blocked = outcomes.filter((outcome) => !outcome.expired && outcome.attempts >= outcome.bucket.limit);
            if (blocked.length) { await connection.rollback(); return { allowed: false, retryAfter: Math.max(...blocked.map((item) => item.retryAfter)) }; }
            for (const outcome of outcomes) {
                await connection.execute(`UPDATE request_protection_buckets SET attempts = ?, window_started_at = ?, updated_at = ?
                    WHERE bucket_type = ? AND bucket_key = ?`, [outcome.attempts + 1, outcome.expired ? now : outcome.startedAt, now, outcome.bucket.type, outcome.bucket.key]);
            }
            await connection.execute('DELETE FROM request_protection_buckets WHERE updated_at < DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 2 DAY) LIMIT 100');
            await connection.commit();
            return { allowed: true };
        } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    }

    async clear(type, key) {
        await this.ensureTable();
        await db.query('DELETE FROM request_protection_buckets WHERE bucket_type = ? AND bucket_key = ?', [type, key]);
    }
}

module.exports = new RequestProtectionModel();
