const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class CategoryModel {
    async findAll() {
        const sql = 'SELECT * FROM categories ORDER BY name ASC';
        return await db.query(sql);
    }

    async create(data) {
        const { name, slug, description } = data;
        const id = uuidv4();
        const sql = 'INSERT INTO categories (id, name, slug, description) VALUES (?, ?, ?, ?)';
        await db.query(sql, [id, name, slug, description]);
        return id;
    }
}

module.exports = new CategoryModel();
