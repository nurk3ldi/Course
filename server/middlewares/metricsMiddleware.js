const { trackRequest, maybeAlert } = require('../services/metricsService');

const metricsMiddleware = (req, res, next) => {
    const started = process.hrtime.bigint();
    res.on('finish', () => {
        const diffMs = Number(process.hrtime.bigint() - started) / 1_000_000;
        trackRequest({
            method: req.method,
            path: req.originalUrl || req.url,
            statusCode: res.statusCode,
            durationMs: diffMs
        });
        maybeAlert().catch((error) => {
            console.error('metrics alert error:', error.message);
        });
    });
    next();
};

module.exports = { metricsMiddleware };
