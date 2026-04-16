const buckets = new Map();

const windowMs = Number(process.env.VIDEO_RATE_LIMIT_WINDOW_MS || 60_000);
const limit = Number(process.env.VIDEO_RATE_LIMIT_MAX || 1200);

const videoRateLimitMiddleware = (req, res, next) => {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
        .toString()
        .split(',')[0]
        .trim();
    const userId = String(req.query.user_id || 'anonymous');
    const key = `${ip}:${userId}`;
    const now = Date.now();

    const bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return next();
    }

    if (bucket.count >= limit) {
        const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({ error: 'Too many video requests' });
    }

    bucket.count += 1;
    next();
};

module.exports = { videoRateLimitMiddleware };
