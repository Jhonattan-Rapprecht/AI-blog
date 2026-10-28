const { execFileSync } = require('child_process');
const PROJECT = 'ai-blog-stage3-fixtures';
const LABEL = 'com.ai-blogstudio.fixture.disposable=true';
const ID = /^[a-f0-9]{64}$/;
function discoverFixtureContainer(execute = execFileSync) {
  const context = String(execute('docker', ['context', 'show'], { encoding: 'utf8', windowsHide: true })).trim();
  if (context !== 'desktop-linux') throw new Error('Unexpected Docker context.');
  const rows = String(execute('docker', ['ps', '-a', '--no-trunc', '--filter', `label=com.docker.compose.project=${PROJECT}`, '--filter', `label=${LABEL}`, '--format', '{{.ID}}'], { encoding: 'utf8', windowsHide: true })).trim().split(/\r?\n/).filter(Boolean);
  if (rows.length !== 1 || !ID.test(rows[0])) throw new Error('Expected exactly one valid fixture container.');
  return rows[0];
}
module.exports = { discoverFixtureContainer, PROJECT };
