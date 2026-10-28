function positiveInteger(name, fallback, minimum = 1, maximum = 86400) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return fallback;
    if (!/^\d+$/.test(raw)) throw new Error(`${name} must be a whole number.`);
    const value = Number(raw);
    if (value < minimum || value > maximum) throw new Error(`${name} must be between ${minimum} and ${maximum}.`);
    return value;
}

function trustProxy() {
    const value = String(process.env.TRUST_PROXY || '').trim().toLowerCase();
    if (!value || value === 'false' || value === '0') return false;
    if (value === 'loopback' || value === 'linklocal' || value === 'uniquelocal') return value;
    if (/^[1-9]\d?$/.test(value)) return Number(value);
    throw new Error('TRUST_PROXY must be false, loopback, linklocal, uniquelocal, or a positive hop count.');
}

module.exports = {
    trustProxy: trustProxy(),
    auth: {
        accountIpLimit: positiveInteger('AUTH_LOGIN_ACCOUNT_IP_LIMIT', 5, 1, 100),
        ipLimit: positiveInteger('AUTH_LOGIN_IP_LIMIT', 20, 1, 500),
        windowSeconds: positiveInteger('AUTH_LOGIN_WINDOW_SECONDS', 900, 60, 86400)
    },
    analytics: {
        ipLimit: positiveInteger('PUBLIC_ANALYTICS_IP_LIMIT', 120, 1, 5000),
        windowSeconds: positiveInteger('PUBLIC_ANALYTICS_WINDOW_SECONDS', 60, 10, 3600),
        dedupeSeconds: positiveInteger('PUBLIC_ANALYTICS_DEDUPE_SECONDS', 1800, 30, 86400)
    }
};
