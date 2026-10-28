const crypto = require('crypto');

function secret() {
    // JWT_SECRET is already a required server-side secret; never send these hashes to clients.
    return process.env.JWT_SECRET || 'configuration-error';
}

function fingerprint(value) {
    return crypto.createHmac('sha256', secret()).update(String(value || '')).digest('hex');
}

function loginKeys(username, ip) {
    const account = String(username || '').trim().toLocaleLowerCase();
    return { accountIp: fingerprint(`login:account-ip:${account}:${ip || ''}`), ip: fingerprint(`login:ip:${ip || ''}`) };
}

function analyticsKeys(visitorId, ip) {
    return { ip: fingerprint(`analytics:ip:${ip || ''}`), visitor: fingerprint(`analytics:visitor:${visitorId || ''}`) };
}

function constantTimeMatches(username, password) {
    const candidate = crypto.createHmac('sha256', secret()).update(`${String(username || '')}\0${String(password || '')}`).digest();
    const expected = crypto.createHmac('sha256', secret()).update(`${String(process.env.ADMIN_USERNAME || '')}\0${String(process.env.ADMIN_PASSWORD || '')}`).digest();
    return crypto.timingSafeEqual(candidate, expected);
}

module.exports = { fingerprint, loginKeys, analyticsKeys, constantTimeMatches };
