const db = require('../config/db');

class PublicBlogModel {
    async getPublicArticles(pagination = { limit: 10, offset: 0 }) {
        const sql = `
            SELECT id, title, slug, excerpt, published_at, category_id
            FROM articles
            WHERE status = 'published'
            AND published_at <= CURRENT_TIMESTAMP
            ORDER BY published_at DESC
            LIMIT ? OFFSET ?
        `;
        return await db.query(sql, [parseInt(pagination.limit), parseInt(pagination.offset)]);
    }

    async getArticleBySlug(slug) {
        const sql = `
            SELECT id, title, slug, excerpt, content, featured_image, published_at, category_id
            FROM articles
            WHERE slug = ? AND status = 'published'
            AND published_at <= CURRENT_TIMESTAMP
            LIMIT 1
        `;
        const results = await db.query(sql, [slug]);
        return results[0];
    }
}

module.exports = new PublicBlogModel();
