const test = require('node:test'); const assert = require('node:assert/strict');
const { createMigrationConnection } = require('../database/migrate');
const env={ DB_INTEGRATION_TEST_MODE:'true', DB_HOST:'127.0.0.1', DB_PORT:'34567', DB_USER:'x', DB_PASSWORD:'y', DB_NAME:'ai_blog_stage3_test', DB_TEST_HOST:'127.0.0.1', DB_TEST_PORT:'34567', DB_TEST_NAME:'ai_blog_stage3_test', DB_TEST_DOCKER_PROJECT:'project', DB_TEST_CONTAINER_ID:'id' };
const meta={id:'id',running:true,project:'project',network:'n',hostIp:'127.0.0.1',hostPort:'34567',containerPort:'3306'};
test('migration guard permits mysql2 factory only after matched Docker metadata', async () => { let options; await createMigrationConnection(env, async (o)=>{options=o; return {};}, ()=>meta); assert.equal(options.port,34567); });
test('migration guard rejects mismatch before mysql2 factory', async () => { let called=false; await assert.rejects(() => createMigrationConnection({...env,DB_PORT:'3306',DB_TEST_PORT:'3306'}, async()=>{called=true;}, ()=>meta)); assert.equal(called,false); });
