const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class ArticleReviewModel {
    constructor() { this.ready = null; }

    ensureTables() {
        if (!this.ready) {
            this.ready = (async () => {
                await db.query(`CREATE TABLE IF NOT EXISTS article_reviews (
                    id CHAR(36) PRIMARY KEY,
                    article_id CHAR(36) NOT NULL,
                    model VARCHAR(100) NULL,
                    category VARCHAR(500) NULL,
                    reviewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
                    INDEX idx_article_reviews_article_date (article_id, reviewed_at)
                )`);
                await db.query(`CREATE TABLE IF NOT EXISTS article_review_findings (
                    id CHAR(36) PRIMARY KEY,
                    review_id CHAR(36) NOT NULL,
                    field_name VARCHAR(20) NOT NULL DEFAULT 'content',
                    finding_type VARCHAR(30) NOT NULL,
                    severity ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'low',
                    quote VARCHAR(500) NOT NULL,
                    sentence_quote TEXT NULL,
                    neutral_rewrite TEXT NULL,
                    explanation TEXT NOT NULL,
                    suggestion TEXT NOT NULL,
                    status ENUM('pending', 'dismissed', 'applied') NOT NULL DEFAULT 'pending',
                    action VARCHAR(30) NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (review_id) REFERENCES article_reviews(id) ON DELETE CASCADE,
                    INDEX idx_review_findings_review (review_id, created_at)
                )`);
            })().catch((error) => { this.ready = null; throw error; });
        }
        return this.ready;
    }

    async create(articleId, review) {
        if (!articleId) return null;
        await this.ensureTables();
        const articles = await db.query('SELECT id FROM articles WHERE id = ? LIMIT 1', [articleId]);
        if (!articles.length) return null;

        const reviewId = uuidv4();
        await db.query(`INSERT INTO article_reviews (id, article_id, model, category, reviewed_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`, [reviewId, articleId, review.model || null, review.category || null]);
        const findings = [];
        for (const finding of review.findings || []) {
            const id = uuidv4();
            const status = ['dismissed', 'applied'].includes(finding.status) ? finding.status : 'pending';
            await db.query(`INSERT INTO article_review_findings
                (id, review_id, field_name, finding_type, severity, quote, sentence_quote, neutral_rewrite, explanation, suggestion, status, action)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                id, reviewId, finding.field || 'content', finding.type || 'clarity', finding.severity || 'low',
                finding.quote || '', finding.sentenceQuote || null, finding.neutralRewrite || null,
                finding.explanation || '', finding.suggestion || '', status, finding.action || null
            ]);
            findings.push({ ...finding, id, status });
        }
        return { ...review, id: reviewId, findings };
    }

    async findHistory(articleId, limit = 20) {
        await this.ensureTables();
        const rows = await db.query(`SELECT r.id AS review_id, r.model, r.category, r.reviewed_at,
                f.id AS finding_id, f.field_name AS field, f.finding_type AS type, f.severity, f.quote,
                f.sentence_quote AS sentenceQuote, f.neutral_rewrite AS neutralRewrite,
                f.explanation, f.suggestion, f.status, f.action
            FROM article_reviews r
            INNER JOIN (
                SELECT id FROM article_reviews WHERE article_id = ? ORDER BY reviewed_at DESC LIMIT ?
            ) recent ON recent.id = r.id
            LEFT JOIN article_review_findings f ON f.review_id = r.id
            ORDER BY r.reviewed_at DESC, f.created_at ASC`, [articleId, Math.max(1, Math.min(Number(limit) || 20, 100))]);
        const reviews = new Map();
        for (const row of rows) {
            if (!reviews.has(row.review_id)) reviews.set(row.review_id, {
                id: row.review_id, model: row.model, category: row.category,
                reviewedAt: row.reviewed_at, titleReviewNote: null, liveSourcesChecked: false, findings: []
            });
            if (row.finding_id) reviews.get(row.review_id).findings.push({
                id: row.finding_id, field: row.field, type: row.type, severity: row.severity, quote: row.quote,
                sentenceQuote: row.sentenceQuote || '', neutralRewrite: row.neutralRewrite || '',
                explanation: row.explanation, suggestion: row.suggestion, status: row.status, action: row.action
            });
        }
        return [...reviews.values()];
    }

    async setFindingStatus(articleId, findingId, status, action = null) {
        if (!['dismissed', 'applied'].includes(status)) return false;
        await this.ensureTables();
        const result = await db.query(`UPDATE article_review_findings f
            INNER JOIN article_reviews r ON r.id = f.review_id
            SET f.status = ?, f.action = ?
            WHERE f.id = ? AND r.article_id = ?`, [status, action, findingId, articleId]);
        return result.affectedRows > 0;
    }
}

module.exports = new ArticleReviewModel();
