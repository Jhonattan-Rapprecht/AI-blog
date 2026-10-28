const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

const { requiredIndexes } = require('../database/schema-manifest');
const {
    FIXTURE_PREFIX,
    MISSING_INDEX,
    createFixtureSchemaName,
    formatFixtureFailure,
    isExpectedStartupRejection,
    migrationHistoryCount
} = require('../database/testing/incompatible-legacy-fixture');

test('incompatible legacy fixture targets a safe manifest-required article index', () => {
    const migration = fs.readFileSync(path.join(__dirname, '../database/migrations/001_core_content.sql'), 'utf8');

    assert.equal(MISSING_INDEX, 'idx_articles_published_at');
    assert.ok(requiredIndexes.articles.includes(MISSING_INDEX));
    assert.match(migration, /INDEX idx_articles_published_at \(published_at\)/);
    assert.doesNotMatch(migration, /FOREIGN KEY \(published_at\)/);
});

test('incompatible legacy fixture names are owned, valid MySQL identifiers', () => {
    const schema = createFixtureSchemaName();

    assert.ok(schema.startsWith(FIXTURE_PREFIX));
    assert.match(schema, /^ai_blog_stage3_fixture_[a-z0-9_]+$/);
    assert.ok(schema.length <= 64);
});

test('fixture history assertions accept an absent table or an empty history only', async () => {
    const absentHistory = {
        query: async () => {
            const error = new Error('missing table');
            error.code = 'ER_NO_SUCH_TABLE';
            throw error;
        }
    };
    const emptyHistory = { query: async () => [[{ count: 0 }]] };
    const recordedHistory = { query: async () => [[{ count: 4 }]] };

    assert.equal(await migrationHistoryCount(absentHistory), 0);
    assert.equal(await migrationHistoryCount(emptyHistory), 0);
    assert.equal(await migrationHistoryCount(recordedHistory), 4);
});

test('fixture diagnostics retain failure phase and cleanup status without connection secrets', () => {
    const error = new Error('mysql://user:password@127.0.0.1:33310/test password=secret');
    error.code = 'ER_TEST';
    error.fixtureState = {
        failurePhase: 'baseline-rejection',
        schema: 'ai_blog_stage3_fixture_incompatible_test',
        cleanupSucceeded: true,
        cleanupError: null
    };

    const diagnostic = formatFixtureFailure(error);
    assert.equal(diagnostic.phase, 'baseline-rejection');
    assert.equal(diagnostic.cleanupSucceeded, true);
    assert.match(diagnostic.message, /\[REDACTED\]/);
    assert.doesNotMatch(diagnostic.message, /password@|password=secret/);
});

test('fixture accepts only the production schema-behind startup rejection', () => {
    assert.equal(
        isExpectedStartupRejection('Database schema is behind migration 1. Run `npm run db:migrate:status` and `npm run db:migrate` before starting the API.'),
        true
    );
    assert.equal(isExpectedStartupRejection('ER_ACCESS_DENIED_ERROR'), false);
    assert.equal(isExpectedStartupRejection('connect ECONNREFUSED 127.0.0.1:33310'), false);
    assert.equal(isExpectedStartupRejection('You have an error in your SQL syntax'), false);
    assert.equal(isExpectedStartupRejection(''), false);
});
