const crypto = require('crypto');

const MIGRATION_NAME = /^(\d{3})_([a-z0-9][a-z0-9_-]*)\.sql$/;

function checksum(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function orderMigrations(files) {
    const migrations = files.map((file) => {
        const match = MIGRATION_NAME.exec(file.name);
        if (!match) throw new Error(`Invalid migration filename: ${file.name}`);
        return { ...file, version: Number(match[1]), name: match[2] };
    }).sort((a, b) => a.version - b.version);
    for (let index = 1; index < migrations.length; index += 1) {
        if (migrations[index - 1].version === migrations[index].version) throw new Error(`Duplicate migration version: ${migrations[index].version}`);
    }
    return migrations;
}

function compareApplied(migrations, applied) {
    const appliedByVersion = new Map(applied.map((row) => [Number(row.version), row]));
    const mismatches = [];
    const pending = [];
    for (const migration of migrations) {
        const row = appliedByVersion.get(migration.version);
        if (!row) pending.push(migration);
        else if (row.checksum !== migration.checksum) mismatches.push({ version: migration.version, name: migration.name });
    }
    const unknownApplied = applied.filter((row) => !migrations.some((migration) => migration.version === Number(row.version)));
    return { pending, mismatches, unknownApplied };
}

module.exports = { checksum, orderMigrations, compareApplied };
