const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class ArticleReviewModel {
    ensureTables() { return Promise.resolve(); } // Provisioned by migration 002.

    async create(articleId, review) {
        if (!articleId) return null;
        await this.ensureTables();
        const articles = await db.query('SELECT id FROM articles WHERE id = ? LIMIT 1', [articleId]);
        if (!articles.length) return null;

        const reviewId = uuidv4();
        const findings = [];
        const connection = await db.transaction();
        try {
            await connection.execute(`INSERT INTO article_reviews (id, article_id, model, category, check_type, reviewed_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [reviewId, articleId, review.model || null, review.category || null, review.checkType || null]);
            for (const finding of review.findings || []) {
                const id = uuidv4();
                const status = ['dismissed', 'applied'].includes(finding.status) ? finding.status : 'pending';
                await connection.execute(`INSERT INTO article_review_findings
                    (id, review_id, field_name, finding_type, severity, quote, sentence_quote, neutral_rewrite, explanation, suggestion, status, action)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    id, reviewId, finding.field || 'content', finding.type || 'clarity', finding.severity || 'low',
                    finding.quote || '', finding.sentenceQuote || null, finding.neutralRewrite || null,
                    finding.explanation || '', finding.suggestion || '', status, finding.action || null
                ]);
                findings.push({ ...finding, id, status });
            }
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        return { ...review, id: reviewId, findings };
    }

    async findHistory(articleId, limit = 20) {
        await this.ensureTables();
        const rows = await db.query(`SELECT r.id AS review_id, r.model, r.category, r.check_type, r.reviewed_at,
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
                id: row.review_id, model: row.model, category: row.category, checkType: row.check_type,
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
        if (result.affectedRows > 0) return true;
        const rows = await db.query(`SELECT f.status, f.action FROM article_review_findings f
            INNER JOIN article_reviews r ON r.id = f.review_id
            WHERE f.id = ? AND r.article_id = ? LIMIT 1`, [findingId, articleId]);
        return rows.length > 0 && rows[0].status === status && (rows[0].action || null) === (action || null);
    }
}

module.exports = new ArticleReviewModel();
