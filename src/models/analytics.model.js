const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const PUBLIC_ARTICLE = `a.status = 'published' AND a.published_at IS NOT NULL AND a.published_at <= CURRENT_TIMESTAMP`;
const toCount = (value) => Number(value || 0);

const wordsIn = (html = '') => String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;|&#xA0;/gi, ' ')
    .replace(/&(?:amp|lt|gt|quot|#39);/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

function parseKeywords(value) {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
        if (typeof parsed === 'string') return parsed.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
    } catch { /* Keywords may be stored as a comma-separated string. */ }
    return String(value).split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
}

function parseTopic(prompt) {
    if (!prompt) return '';
    try {
        const parsed = JSON.parse(prompt);
        return typeof parsed.topic === 'string' ? parsed.topic.trim() : '';
    } catch {
        return '';
    }
}

class AnalyticsModel {
    constructor() {
        this.ready = null;
    }

    ensureTable() {
        if (!this.ready) {
            this.ready = db.query(`
                CREATE TABLE IF NOT EXISTS article_read_views (
                    id CHAR(36) PRIMARY KEY,
                    article_id CHAR(36) NOT NULL,
                    read_seconds INT UNSIGNED NOT NULL DEFAULT 0,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
                    INDEX idx_article_read_views_date (created_at),
                    INDEX idx_article_read_views_article_date (article_id, created_at)
                )
            `).catch((error) => {
                this.ready = null;
                throw error;
            });
        }
        return this.ready;
    }

    async startView(articleId) {
        await this.ensureTable();
        const articles = await db.query(
            `SELECT a.id FROM articles a WHERE a.id = ? AND ${PUBLIC_ARTICLE} LIMIT 1`,
            [articleId]
        );
        if (!articles.length) return null;
        const id = uuidv4();
        await db.query('INSERT INTO article_read_views (id, article_id) VALUES (?, ?)', [id, articleId]);
        return id;
    }

    async finishView(viewId, readSeconds) {
        await this.ensureTable();
        const result = await db.query(
            'UPDATE article_read_views SET read_seconds = GREATEST(read_seconds, ?) WHERE id = ?',
            [readSeconds, viewId]
        );
        return result.affectedRows > 0;
    }

    async getOverview(days = 30) {
        await this.ensureTable();
        const period = Math.min(90, Math.max(7, Number.parseInt(days, 10) || 30));

        const [totals] = await db.query(`
            SELECT COUNT(*) AS total_articles,
                   SUM(status = 'published') AS published_articles,
                   SUM(status = 'draft') AS drafts,
                   SUM(status = 'review') AS in_review,
                   SUM(status = 'scheduled') AS scheduled,
                   SUM(status = 'archived') AS archived,
                   SUM(category_id IS NULL) AS uncategorized
            FROM articles
        `);

        const statuses = await db.query(
            'SELECT status, COUNT(*) AS article_count FROM articles GROUP BY status ORDER BY status'
        );

        const rangeViews = await db.query(`
            SELECT COUNT(*) AS views,
                   SUM(read_seconds >= 10) AS engaged_views,
                   AVG(NULLIF(read_seconds, 0)) AS average_read_seconds
            FROM article_read_views
            WHERE created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${period} DAY)
        `);

        const [engagement] = rangeViews;
        const categories = await db.query(`
            SELECT COALESCE(c.name, 'Uncategorized') AS name,
                   COUNT(DISTINCT a.id) AS article_count,
                   COALESCE(SUM(v.views), 0) AS views
            FROM articles a
            LEFT JOIN categories c ON c.id = a.category_id
            LEFT JOIN (
                SELECT article_id, COUNT(*) AS views
                FROM article_read_views
                WHERE created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${period} DAY)
                GROUP BY article_id
            ) v ON v.article_id = a.id
            WHERE ${PUBLIC_ARTICLE}
            GROUP BY c.id, c.name
            ORDER BY article_count DESC, name ASC
        `);

        const trendRows = await db.query(`
            SELECT DATE_FORMAT(published_at, '%Y-%m') AS month_key, COUNT(*) AS article_count
            FROM articles
            WHERE status = 'published' AND published_at IS NOT NULL AND published_at <= CURRENT_TIMESTAMP
              AND published_at >= DATE_SUB(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 5 MONTH)
            GROUP BY DATE_FORMAT(published_at, '%Y-%m')
            ORDER BY month_key ASC
        `);
        const trendCounts = new Map(trendRows.map((row) => [row.month_key, toCount(row.article_count)]));
        const publishingTrend = [];
        const monthCursor = new Date();
        monthCursor.setDate(1);
        monthCursor.setHours(12, 0, 0, 0);
        for (let offset = 5; offset >= 0; offset -= 1) {
            const month = new Date(monthCursor.getFullYear(), monthCursor.getMonth() - offset, 1, 12);
            const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
            publishingTrend.push({ month: key, label: month.toLocaleDateString('en', { month: 'short' }), article_count: trendCounts.get(key) || 0 });
        }

        const topArticles = await db.query(`
            SELECT a.id, a.title, a.slug, COUNT(v.id) AS views,
                   AVG(NULLIF(v.read_seconds, 0)) AS average_read_seconds
            FROM article_read_views v
            JOIN articles a ON a.id = v.article_id
            WHERE v.created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${period} DAY)
              AND ${PUBLIC_ARTICLE}
            GROUP BY a.id, a.title, a.slug
            ORDER BY views DESC, average_read_seconds DESC
            LIMIT 8
        `);

        const topicRows = await db.query(`
            SELECT a.id, a.title, a.seo_keywords, g.prompt
            FROM articles a
            LEFT JOIN ai_generations g ON g.article_id = a.id AND g.status = 'completed'
            WHERE ${PUBLIC_ARTICLE}
            ORDER BY a.published_at DESC
        `);
        const topicMap = new Map();
        const keywordMap = new Map();
        const articleTopicsSeen = new Set();
        for (const row of topicRows) {
            if (!articleTopicsSeen.has(row.id)) {
                const topic = parseTopic(row.prompt) || row.title;
                const normalized = topic.toLocaleLowerCase();
                if (topicMap.has(normalized)) topicMap.get(normalized).article_count += 1;
                else topicMap.set(normalized, { topic, article_count: 1 });
                for (const keyword of new Set(parseKeywords(row.seo_keywords))) {
                    const normalizedKeyword = keyword.toLocaleLowerCase();
                    if (keywordMap.has(normalizedKeyword)) keywordMap.get(normalizedKeyword).article_count += 1;
                    else keywordMap.set(normalizedKeyword, { keyword, article_count: 1 });
                }
                articleTopicsSeen.add(row.id);
            }
        }

        let totalEstimatedMinutes = 0;
        let estimatedArticleCount = 0;
        const readRows = await db.query(`SELECT a.content FROM articles a WHERE ${PUBLIC_ARTICLE}`);
        for (const row of readRows) {
            totalEstimatedMinutes += Math.max(1, Math.round(wordsIn(row.content) / 220));
            estimatedArticleCount += 1;
        }

        return {
            days: period,
            summary: {
                total_articles: toCount(totals.total_articles),
                published_articles: toCount(totals.published_articles),
                drafts: toCount(totals.drafts),
                in_review: toCount(totals.in_review),
                scheduled: toCount(totals.scheduled),
                archived: toCount(totals.archived),
                uncategorized: toCount(totals.uncategorized),
                views: toCount(engagement.views),
                engaged_views: toCount(engagement.engaged_views),
                average_read_seconds: Math.round(Number(engagement.average_read_seconds || 0)),
                average_estimated_read_minutes: estimatedArticleCount
                    ? Number((totalEstimatedMinutes / estimatedArticleCount).toFixed(1))
                    : 0,
            },
            statuses: statuses.map((row) => ({ status: row.status, article_count: toCount(row.article_count) })),
            categories: categories.map((row) => ({
                name: row.name,
                article_count: toCount(row.article_count),
                views: toCount(row.views),
            })),
            publishing_trend: publishingTrend,
            top_articles: topArticles.map((row) => ({
                ...row,
                views: toCount(row.views),
                average_read_seconds: Math.round(Number(row.average_read_seconds || 0)),
            })),
            top_topics: [...topicMap.values()].sort((a, b) => b.article_count - a.article_count).slice(0, 8),
            top_keywords: [...keywordMap.values()].sort((a, b) => b.article_count - a.article_count).slice(0, 12),
        };
    }
}

module.exports = new AnalyticsModel();
