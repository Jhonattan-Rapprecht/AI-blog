function evaluateFixedWindow({ attempts = 0, startedAt, now = new Date(), limit, windowSeconds }) {
    const start = new Date(startedAt);
    const elapsed = now.getTime() - start.getTime();
    const expired = !Number.isFinite(start.getTime()) || elapsed >= windowSeconds * 1000;
    const currentAttempts = expired ? 0 : Number(attempts);
    return {
        allowed: currentAttempts < limit,
        attempts: currentAttempts,
        expired,
        retryAfter: Math.max(1, Math.ceil((windowSeconds * 1000 - Math.max(0, elapsed)) / 1000))
    };
}

module.exports = { evaluateFixedWindow };
