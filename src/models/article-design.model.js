const db = require('../config/db');
const { normalizeLayoutSelection, normalizeStyleSelection, resolveArticleDesign } = require('../config/article-design.config');

const parseConfig = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return null; }
};

class ArticleDesignModel {
    async ensureSchema() { return; } // Provisioned by migration 003.

    async getPublicationSelection() {
        await this.ensureSchema();
        const rows = await db.query('SELECT design_config, updated_at FROM publication_design_settings WHERE id = 1 LIMIT 1');
        const config = normalizeLayoutSelection(parseConfig(rows[0]?.design_config));
        return { selection: config || { layout: 'classic' }, updatedAt: rows[0]?.updated_at || null };
    }

    async setPublicationSelection(selection) {
        await this.ensureSchema();
        await db.query(`UPDATE publication_design_settings
            SET schema_version = 1, design_config = ? WHERE id = 1`, [JSON.stringify(selection)]);
        return this.getPublicationSelection();
    }

    async getPublicationStyle() {
        await this.ensureSchema();
        const rows = await db.query('SELECT design_config, updated_at FROM publication_design_settings WHERE id = 1 LIMIT 1');
        const style = normalizeStyleSelection(parseConfig(rows[0]?.design_config)).value;
        return { selection: style, updatedAt: rows[0]?.updated_at || null };
    }

    async setPublicationStyle(style) {
        await this.ensureSchema();
        const rows = await db.query('SELECT design_config FROM publication_design_settings WHERE id = 1 LIMIT 1');
        const existing = parseConfig(rows[0]?.design_config) || {};
        await db.query('UPDATE publication_design_settings SET schema_version = 2, design_config = ? WHERE id = 1', [JSON.stringify({ ...existing, ...style })]);
        return this.getPublicationStyle();
    }

    async getArticleSelection(articleId) {
        await this.ensureSchema();
        const rows = await db.query('SELECT design_config, updated_at FROM article_design_overrides WHERE article_id = ? LIMIT 1', [articleId]);
        const selection = normalizeLayoutSelection(parseConfig(rows[0]?.design_config));
        return { selection, updatedAt: rows[0]?.updated_at || null };
    }

    async setArticleSelection(articleId, selection) {
        await this.ensureSchema();
        await db.query(`INSERT INTO article_design_overrides (article_id, design_config)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE design_config = VALUES(design_config), updated_at = CURRENT_TIMESTAMP`, [articleId, JSON.stringify(selection)]);
        return this.getArticleSelection(articleId);
    }

    async clearArticleSelection(articleId) {
        await this.ensureSchema();
        await db.query('DELETE FROM article_design_overrides WHERE article_id = ?', [articleId]);
    }

    async getArticleStyle(articleId) {
        await this.ensureSchema();
        const rows = await db.query('SELECT design_config, updated_at FROM article_design_overrides WHERE article_id = ? LIMIT 1', [articleId]);
        const style = normalizeStyleSelection(parseConfig(rows[0]?.design_config)).value;
        return { selection: style, updatedAt: rows[0]?.updated_at || null };
    }

    async setArticleStyle(articleId, style) {
        await this.ensureSchema();
        const rows = await db.query('SELECT design_config FROM article_design_overrides WHERE article_id = ? LIMIT 1', [articleId]);
        const existing = parseConfig(rows[0]?.design_config) || {};
        await db.query(`INSERT INTO article_design_overrides (article_id, design_config) VALUES (?, ?)
            ON DUPLICATE KEY UPDATE design_config = VALUES(design_config), updated_at = CURRENT_TIMESTAMP`, [articleId, JSON.stringify({ ...existing, ...style })]);
        return this.getArticleStyle(articleId);
    }

    async clearArticleStyle(articleId) {
        await this.ensureSchema();
        const rows = await db.query('SELECT design_config FROM article_design_overrides WHERE article_id = ? LIMIT 1', [articleId]);
        const existing = parseConfig(rows[0]?.design_config);
        if (!existing) return;
        delete existing.stylePreset; delete existing.typography; delete existing.imageTreatment;
        if (existing.layout) await db.query('UPDATE article_design_overrides SET design_config = ? WHERE article_id = ?', [JSON.stringify(existing), articleId]);
        else await db.query('DELETE FROM article_design_overrides WHERE article_id = ?', [articleId]);
    }

    async resolveForArticle(articleId) {
        const [publication, article] = await Promise.all([this.getPublicationSelection(), this.getArticleSelection(articleId)]);
        return {
            ...resolveArticleDesign(publication.selection, article.selection),
            source: article.selection ? 'article' : publication.selection ? 'publication' : 'fallback'
        };
    }
}

module.exports = new ArticleDesignModel();
