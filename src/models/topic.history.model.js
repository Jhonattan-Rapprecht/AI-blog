const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const normalize = (text) =>
    String(text).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'for', 'to', 'and', 'how', 'is', 'are', 'with', 'your', 'you', 'what', 'why']);

const keywords = (text) =>
    new Set(normalize(text).split(' ').filter((w) => w.length > 2 && !STOP_WORDS.has(w)));

// Word overlap (Jaccard) catches light rewordings of the same topic.
const similarity = (a, b) => {
    const A = keywords(a);
    const B = keywords(b);
    if (!A.size || !B.size) return 0;
    let shared = 0;
    for (const w of A) if (B.has(w)) shared++;
    return shared / (A.size + B.size - shared);
};

const SIMILARITY_THRESHOLD = 0.6;

class TopicHistoryModel {
    constructor() {
        this.ready = null;
    }

    // Creates the table on first use so existing databases need no manual migration.
    ensureTable() {
        if (!this.ready) {
            this.ready = db.query(`
                CREATE TABLE IF NOT EXISTS topic_history (
                    id CHAR(36) PRIMARY KEY,
                    topic VARCHAR(500) NOT NULL,
                    normalized VARCHAR(500) NOT NULL,
                    source ENUM('suggested', 'generated') NOT NULL DEFAULT 'suggested',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_topic_normalized (normalized(191)),
                    INDEX idx_topic_created (created_at)
                )
            `).catch((err) => {
                this.ready = null;
                throw err;
            });
        }
        return this.ready;
    }

    async record(topic, source = 'suggested') {
        const text = String(topic || '').trim();
        const normalized = normalize(text);
        if (!normalized) return;
        await this.ensureTable();
        await db.query(
            'INSERT IGNORE INTO topic_history (id, topic, normalized, source) VALUES (?, ?, ?, ?)',
            [uuidv4(), text.slice(0, 500), normalized.slice(0, 500), source]
        );
    }

    async recordMany(topics, source = 'suggested') {
        for (const topic of topics) await this.record(topic, source);
    }

    // Everything considered "used": past suggestions, generated topics and existing article titles.
    async findAllUsed() {
        await this.ensureTable();
        const rows = await db.query(
            `SELECT topic, created_at FROM topic_history
             UNION ALL
             SELECT title AS topic, created_at FROM articles
             ORDER BY created_at DESC`
        );
        return rows.map((r) => r.topic);
    }

    isDuplicate(topic, usedTopics) {
        const normalized = normalize(topic);
        return usedTopics.some((used) => normalize(used) === normalized || similarity(topic, used) >= SIMILARITY_THRESHOLD);
    }
}

module.exports = new TopicHistoryModel();
