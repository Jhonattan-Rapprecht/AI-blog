const test = require('node:test'); const assert = require('node:assert/strict');
const { readDockerMetadata } = require('../database/docker-isolation');
test('narrow Docker inspection parses only required non-secret metadata', () => {
 const calls=[]; const meta=readDockerMetadata('id', (file,args) => { calls.push([file,args]); return 'id\ntrue\nproject\nfixture-db\nnetwork\n127.0.0.1\n34567\n'; });
 assert.deepEqual(meta, { id:'id', running:true, project:'project', databaseIdentity:'fixture-db', network:'network', hostIp:'127.0.0.1', hostPort:'34567', containerPort:'3306' }); assert.equal(calls[0][0], 'docker'); assert.equal(calls[0][1][0], 'inspect');
});
test('Docker inspection rejects missing or ambiguous metadata', () => assert.throws(() => readDockerMetadata('id', () => 'id\ntrue\nproject\nnetwork\n\n'), /failed/));
