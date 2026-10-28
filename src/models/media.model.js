const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class MediaModel {
    constructor() { this.ready = null; }

    ensureTable() {
        return Promise.resolve();
    }

    async create(item) {
        await this.ensureTable();
        const id = uuidv4();
        await db.query(`INSERT INTO media
            (id, filename, filepath, mime_type, file_size, media_type, source_type, source_url, thumbnail_url, width, height, provider, prompt, credit)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, item.filename, item.filepath || null, item.mime_type, item.file_size || 0, item.media_type || 'image', item.source_type || 'upload', item.source_url || null, item.thumbnail_url || null, item.width || null, item.height || null, item.provider || 'upload', item.prompt || null, item.credit || null]);
        return { id, ...item };
    }

    async findAll(type = 'image') {
        await this.ensureTable();
        if (type === 'all') return db.query('SELECT * FROM media ORDER BY created_at DESC');
        return db.query('SELECT * FROM media WHERE media_type = ? ORDER BY created_at DESC', [type === 'video' ? 'video' : 'image']);
    }

    async findById(id) {
        await this.ensureTable();
        const rows = await db.query('SELECT * FROM media WHERE id = ? LIMIT 1', [id]);
        return rows[0];
    }

    async updateCredit(id, credit) {
        await this.ensureTable();
        const value = typeof credit === 'string' ? credit.trim().slice(0, 500) : '';
        const result = await db.query('UPDATE media SET credit = ? WHERE id = ?', [value || null, id]);
        if (!result.affectedRows) {
            const existing = await this.findById(id);
            return existing ? { ...existing, credit: value || null } : null;
        }
        return this.findById(id);
    }

    async delete(id) {
        await this.ensureTable();
        const rows = await db.query('SELECT * FROM media WHERE id = ? LIMIT 1', [id]);
        if (!rows[0]) return null;
        const usage = await db.query(`SELECT COUNT(*) AS count FROM articles
            WHERE featured_media_id = ?
                OR (? IS NOT NULL AND LOCATE(?, content) > 0)
                OR (? IS NOT NULL AND LOCATE(?, content) > 0)`, [id, rows[0].filepath, rows[0].filepath, rows[0].source_url, rows[0].source_url]);
        if (Number(usage[0]?.count) > 0) return { inUse: true, ...rows[0] };
        await db.query('DELETE FROM media WHERE id = ?', [id]);
        return rows[0];
    }
}

module.exports = new MediaModel();
