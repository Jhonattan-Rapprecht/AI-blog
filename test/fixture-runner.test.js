const test = require('node:test');
const assert = require('node:assert/strict');
const { assertFixtureName, evaluateMigrationHistory, withVerifiedFixture, runProductionFixture, runControlledPartialFailure, validateBaseline } = require('../database/testing/fixture-runner');

const migrations = [{ version: 1, name: 'core', checksum: 'a' }, { version: 2, name: 'security', checksum: 'b' }];
const env = { DB_INTEGRATION_TEST_MODE: 'true', DB_HOST: '127.0.0.1', DB_PORT: '33310', DB_NAME: 'fixture', DB_TEST_HOST: '127.0.0.1', DB_TEST_PORT: '33310', DB_TEST_NAME: 'fixture', DB_TEST_DOCKER_PROJECT: 'fixtures', DB_TEST_CONTAINER_ID: 'id', DB_TEST_DATABASE_LABEL: 'fixture' };
const metadata = { id: 'id', running: true, project: 'fixtures', databaseIdentity: 'fixture', hostIp: '127.0.0.1', hostPort: '33310', containerPort: '3306' };

test('fixture runner detects pending, checksum, and unknown migration states', () => {
  assert.equal(evaluateMigrationHistory(migrations, [{ version: 1, checksum: 'a' }]).reason, 'pending-migrations');
  assert.equal(evaluateMigrationHistory(migrations, [{ version: 1, checksum: 'wrong' }]).reason, 'checksum-mismatch');
  assert.equal(evaluateMigrationHistory(migrations, [{ version: 1, checksum: 'a' }, { version: 2, checksum: 'b' }, { version: 9, checksum: 'x' }]).reason, 'unknown-version');
});

test('fixture runner rejects unverified targets before opening a connection', async () => {
  let opened = false;
  await assert.rejects(() => withVerifiedFixture({ ...env, DB_PORT: '3306', DB_TEST_PORT: '3306' }, metadata, async () => { opened = true; }, async () => {}));
  assert.equal(opened, false);
});

test('fixture names and injected production functions are enforced', async () => {
  assert.throws(() => assertFixtureName('ai_blog')); assert.equal(assertFixtureName('ai_blog_stage3_fixture_pending'), 'ai_blog_stage3_fixture_pending');
  const calls=[]; const result=await runProductionFixture({ env:{...env,DB_NAME:'ai_blog_stage3_fixture_pending',DB_TEST_NAME:'ai_blog_stage3_fixture_pending'}, metadata, connect:async()=>({end:async()=>calls.push('end')}), migrations, appliedHistory:async()=>[], inspectSchema:async()=>({compatible:true}), assertStartup:async()=>({ready:true}) });
  assert.equal(result.migration.reason,'pending-migrations'); assert.deepEqual(calls,['end']);
});

test('fixture runner reports partial DDL without recording it and validates baseline safety', async () => {
  const result = await runControlledPartialFailure({ query: async (sql) => { if (sql === 'bad') throw new Error('synthetic failure'); } }, [{ name: 'create', sql: 'create' }, { name: 'fail', sql: 'bad' }]);
  assert.deepEqual(result.completed, ['create']); assert.equal(result.recorded, false);
  assert.equal(validateBaseline({ confirmed: false, report: { compatible: true }, migrations, applied: [] }).reason, 'confirmation-required');
  assert.equal(validateBaseline({ confirmed: true, report: { compatible: false }, migrations, applied: [] }).reason, 'schema-incompatible');
  assert.equal(validateBaseline({ confirmed: true, report: { compatible: true }, migrations, applied: [] }).accepted, true);
});
