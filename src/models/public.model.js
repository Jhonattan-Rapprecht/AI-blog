const db = require('../config/db');
const ArticleModel = require('./article.model');

const VISIBLE = `a.status = 'published' AND a.published_at IS NOT NULL AND a.published_at <= CURRENT_TIMESTAMP`;

const LIST_COLUMNS = `
    a.id, a.title, a.slug, a.excerpt, COALESCE(m.filepath, a.featured_image) AS featured_image, m.credit AS featured_image_credit, a.published_at, a.updated_at,
    c.id AS category_id, c.name AS category_name, c.slug AS category_slug
`;

class PublicBlogModel {
    async getPublicArticles({ limit = 10, offset = 0, category = null, q = null } = {}) {
        const where = [VISIBLE];
        const params = [];

        if (category) {
            if (category === 'uncategorized') {
                where.push('a.category_id IS NULL');
            } else {
                where.push('c.slug = ?');
                params.push(category);
            }
        }
        if (q) {
            where.push('(a.title LIKE ? OR a.excerpt LIKE ?)');
            params.push(`%${q}%`, `%${q}%`);
        }

        const from = `FROM articles a LEFT JOIN categories c ON c.id = a.category_id LEFT JOIN media m ON m.id = a.featured_media_id WHERE ${where.join(' AND ')}`;

        const [{ total }] = await db.query(`SELECT COUNT(*) AS total ${from}`, params);
        const articles = await db.query(
            `SELECT ${LIST_COLUMNS} ${from} ORDER BY a.published_at DESC LIMIT ? OFFSET ?`,
            [...params, String(limit), String(offset)]
        );

        return { articles, total: Number(total) };
    }

    async getArticleBySlug(slug) {
        const results = await db.query(
            `SELECT ${LIST_COLUMNS}, a.content, a.seo_title, a.seo_description, a.seo_keywords
             FROM articles a LEFT JOIN categories c ON c.id = a.category_id LEFT JOIN media m ON m.id = a.featured_media_id
             WHERE a.slug = ? AND ${VISIBLE}
             LIMIT 1`,
            [slug]
        );
        return results[0];
    }

    async getRelated(article, limit = 3) {
        return await db.query(
            `SELECT ${LIST_COLUMNS}
             FROM articles a LEFT JOIN categories c ON c.id = a.category_id LEFT JOIN media m ON m.id = a.featured_media_id
             WHERE ${VISIBLE} AND a.id <> ?
             ORDER BY (a.category_id <=> ?) DESC, a.published_at DESC
             LIMIT ?`,
            [article.id, article.category_id ?? null, String(limit)]
        );
    }

    async getCategories() {
        return await db.query(
            `(SELECT c.id, c.name, c.slug, c.description, COUNT(a.id) AS article_count
              FROM categories c
              LEFT JOIN articles a ON a.category_id = c.id AND ${VISIBLE}
              GROUP BY c.id, c.name, c.slug, c.description)
             UNION ALL
             (SELECT NULL AS id, 'Uncategorized' AS name, 'uncategorized' AS slug,
                     NULL AS description, COUNT(*) AS article_count
              FROM articles a
              WHERE ${VISIBLE} AND a.category_id IS NULL
              HAVING COUNT(*) > 0)
             ORDER BY name ASC`
        );
    }
}

module.exports = new PublicBlogModel();
