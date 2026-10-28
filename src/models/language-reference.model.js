const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class LanguageReferenceModel {
    ensureTable() { return Promise.resolve(); } // Provisioned by migration 002.

    async list() {
        await this.ensureTable();
        return db.query(`SELECT id, language_id AS languageId, reference_type AS referenceType, source_name AS sourceName,
            license, version, source_reference AS sourceReference, checksum, review_state AS reviewState,
            validation_state AS validationState, created_at AS createdAt, updated_at AS updatedAt
            FROM language_references ORDER BY language_id, reference_type, updated_at DESC`);
    }

    async create(reference) {
        await this.ensureTable();
        const id = uuidv4();
        await db.query(`INSERT INTO language_references
            (id, language_id, reference_type, source_name, license, version, source_reference, checksum, review_state, validation_state)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, reference.languageId, reference.referenceType, reference.sourceName,
            reference.license, reference.version, reference.sourceReference, reference.checksum || null, reference.reviewState, reference.validationState]);
        return this.findById(id);
    }

    async findById(id) {
        await this.ensureTable();
        const rows = await db.query(`SELECT id, language_id AS languageId, reference_type AS referenceType, source_name AS sourceName,
            license, version, source_reference AS sourceReference, checksum, review_state AS reviewState,
            validation_state AS validationState, created_at AS createdAt, updated_at AS updatedAt
            FROM language_references WHERE id = ? LIMIT 1`, [id]);
        return rows[0] || null;
    }

    async update(id, reference) {
        await this.ensureTable();
        const result = await db.query(`UPDATE language_references SET language_id = ?, reference_type = ?, source_name = ?, license = ?,
            version = ?, source_reference = ?, checksum = ?, review_state = ?, validation_state = ? WHERE id = ?`,
        [reference.languageId, reference.referenceType, reference.sourceName, reference.license, reference.version,
            reference.sourceReference, reference.checksum || null, reference.reviewState, reference.validationState, id]);
        return result.affectedRows ? this.findById(id) : null;
    }

    async remove(id) {
        await this.ensureTable();
        const existing = await this.findById(id);
        if (!existing) return null;
        await db.query('DELETE FROM language_references WHERE id = ?', [id]);
        return existing;
    }
}

module.exports = new LanguageReferenceModel();
