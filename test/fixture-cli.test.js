const test = require('node:test');
const assert = require('node:assert/strict');
const { readConfig, buildEnv, createStartupVerifier } = require('../database/testing/run-fixtures');

test('fixture CLI rejects malformed configuration and fixes the fixture endpoint', () => {
  assert.throws(() => readConfig(() => 'FIXTURE_RUNTIME_DATABASE=bad\n'), /Missing fixture/);
  assert.throws(() => readConfig(() => 'FIXTURE_RUNTIME_DATABASE=ai_blog\nFIXTURE_RUNTIME_USER=u\nFIXTURE_RUNTIME_PASSWORD=p\n'), /approved/);
  const env = buildEnv({ FIXTURE_RUNTIME_DATABASE: 'ai_blog_stage3_fixture_pending', FIXTURE_RUNTIME_USER: 'u', FIXTURE_RUNTIME_PASSWORD: 'p' }, 'id');
  assert.equal(env.DB_HOST, '127.0.0.1'); assert.equal(env.DB_PORT, '33310'); assert.equal(env.DB_TEST_DOCKER_PROJECT, 'ai-blog-stage3-fixtures');
});

test('fixture startup verifier reuses full production migration-history integrity checks', async () => {
  const migrations = [
    { version: 1, name: 'core', checksum: 'a' },
    { version: 2, name: 'security', checksum: 'b' }
  ];
  const cases = [
    { name: 'complete', applied: [{ version: 1, checksum: 'a' }, { version: 2, checksum: 'b' }], error: null },
    { name: 'pending', applied: [{ version: 1, checksum: 'a' }], error: /behind migration 2/ },
    { name: 'unknown', applied: [{ version: 1, checksum: 'a' }, { version: 2, checksum: 'b' }, { version: 9, checksum: 'x' }], error: /unknown versions/ },
    { name: 'checksum', applied: [{ version: 1, checksum: 'wrong' }, { version: 2, checksum: 'b' }], error: /checksum mismatch/ },
    { name: 'missing intermediate', applied: [{ version: 2, checksum: 'b' }], error: /behind migration 1/ },
    { name: 'earlier checksum despite latest', applied: [{ version: 1, checksum: 'wrong' }, { version: 2, checksum: 'b' }], error: /checksum mismatch/ }
  ];

  for (const scenario of cases) {
    let closed = false;
    let queryCalls = 0;
    const verifier = createStartupVerifier({
      migrations,
      connect: async () => ({ query: async () => { queryCalls += 1; }, end: async () => { closed = true; } }),
      readAppliedHistory: async () => scenario.applied
    });
    if (scenario.error) await assert.rejects(verifier, scenario.error);
    else assert.deepEqual(await verifier(), { ready: true });
    assert.equal(closed, true, `${scenario.name} connection closes`);
    assert.equal(queryCalls, 0, `${scenario.name} verifier performs no schema SQL itself`);
  }
});

test('fixture startup verifier propagates history-read failures', async () => {
  const databaseError = new Error('history unavailable');
  let closed = false;
  const verifier = createStartupVerifier({
    migrations: [],
    connect: async () => ({ end: async () => { closed = true; } }),
    readAppliedHistory: async () => { throw databaseError; }
  });

  await assert.rejects(verifier, databaseError);
  assert.equal(closed, true);
});
