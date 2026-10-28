const test = require('node:test');
const assert = require('node:assert/strict');
const { checksum, orderMigrations, compareApplied } = require('../database/migration-utils');
const { requiredTables, requiredIndexes } = require('../database/schema-manifest');

test('migration ordering is deterministic and rejects duplicate or invalid versions', () => {
    const ordered = orderMigrations([{ name: '004_security_analytics.sql' }, { name: '001_core_content.sql' }]);
    assert.deepEqual(ordered.map((item) => item.version), [1, 4]);
    assert.throws(() => orderMigrations([{ name: '001_one.sql' }, { name: '001_two.sql' }]), /Duplicate/);
    assert.throws(() => orderMigrations([{ name: 'not-a-migration.sql' }]), /Invalid/);
});

test('checksums detect modified and unknown migration history without accepting it', () => {
    const migrations = [{ version: 1, name: 'core', checksum: checksum('one') }, { version: 2, name: 'next', checksum: checksum('two') }];
    const state = compareApplied(migrations, [{ version: 1, checksum: checksum('changed') }, { version: 9, checksum: checksum('old') }]);
    assert.equal(state.pending.length, 1);
    assert.equal(state.mismatches[0].version, 1);
    assert.equal(state.unknownApplied[0].version, 9);
});

test('adoption manifest requires Stage 2 protection and opaque analytics structures', () => {
    assert.ok(requiredTables.request_protection_buckets.includes('bucket_key'));
    assert.ok(requiredTables.article_view_deduplications.includes('visitor_hash'));
    assert.ok(requiredTables.article_read_views.includes('client_token'));
    assert.ok(requiredIndexes.article_read_views.includes('client_token'));
});
