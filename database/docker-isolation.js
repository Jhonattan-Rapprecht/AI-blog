const { execFileSync } = require('child_process');

const TEMPLATE = '{{.Id}}\n{{.State.Running}}\n{{index .Config.Labels "com.docker.compose.project"}}\n{{index .Config.Labels "com.ai-blogstudio.fixture.database"}}\n{{.HostConfig.NetworkMode}}\n{{(index (index .NetworkSettings.Ports "3306/tcp") 0).HostIp}}\n{{(index (index .NetworkSettings.Ports "3306/tcp") 0).HostPort}}';

function readDockerMetadata(containerId, execute = execFileSync) {
    try {
        const fields = String(execute('docker', ['inspect', '--format', TEMPLATE, containerId], { encoding: 'utf8', windowsHide: true })).trim().split(/\r?\n/);
        if (fields.length !== 7 || fields.filter((_, index) => index !== 3).some((field) => !field)) throw new Error('missing required Docker metadata');
        const [id, running, project, databaseIdentity, network, hostIp, hostPort] = fields;
        return { id, running: running === 'true', project, databaseIdentity: databaseIdentity || null, network, hostIp, hostPort, containerPort: '3306' };
    } catch (error) { throw new Error(`Disposable Docker inspection failed: ${error.message}`); }
}

module.exports = { readDockerMetadata };
