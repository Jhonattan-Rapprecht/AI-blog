const test = require('node:test'); const assert = require('node:assert/strict');
const { assertIsolatedTarget } = require('../database/integration-safety');
const env = { DB_INTEGRATION_TEST_MODE: 'true', DB_HOST: '127.0.0.1', DB_PORT: '34567', DB_NAME: 'ai_blog_stage3_test', DB_TEST_HOST: '127.0.0.1', DB_TEST_PORT: '34567', DB_TEST_NAME: 'ai_blog_stage3_test', DB_TEST_DOCKER_PROJECT: 'ai-blog-stage3-test', DB_TEST_CONTAINER_ID: 'container-id' };
const metadata = { id: 'container-id', running: true, project: 'ai-blog-stage3-test', network: 'isolated', hostPort: '34567', hostIp: '127.0.0.1', containerPort: '3306' };
test('integration guard accepts only the explicitly matched disposable target', () => assert.doesNotThrow(() => assertIsolatedTarget(env, metadata)));
test('integration guard rejects default, missing, and mismatched targets before mysql2', () => {
    assert.throws(() => assertIsolatedTarget({ ...env, DB_PORT: '3306', DB_TEST_PORT: '3306' }, metadata), /default/);
    assert.throws(() => assertIsolatedTarget({ ...env, DB_TEST_CONTAINER_ID: 'other' }, metadata), /metadata/);
    assert.throws(() => assertIsolatedTarget({ ...env, DB_TEST_HOST: 'other' }, metadata), /endpoint/);
});
