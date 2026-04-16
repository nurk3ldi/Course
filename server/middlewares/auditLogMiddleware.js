const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const decodeUserFromAuthHeader = (req) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded?.id || null;
    } catch (_error) {
        return null;
    }
};

const parseEntityFromPath = (pathValue) => {
    const chunks = pathValue.split('/').filter(Boolean);
    if (chunks.length < 2) return { entity: 'unknown', entityId: null };
    const entity = chunks[1];
    const possibleId = Number(chunks[2]);
    return {
        entity,
        entityId: Number.isNaN(possibleId) ? null : possibleId
    };
};

const auditLogMiddleware = (req, res, next) => {
    if (!req.path.startsWith('/api')) {
        return next();
    }

    const startedAt = Date.now();
    const tokenUserId = decodeUserFromAuthHeader(req);

    res.on('finish', async () => {
        try {
            const userId = req.user?.id || tokenUserId || null;
            const { entity, entityId } = parseEntityFromPath(req.originalUrl.split('?')[0]);
            const action = `${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${Date.now() - startedAt}ms`;
            const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
                .toString()
                .split(',')[0]
                .trim();

            await pool.query(
                `INSERT INTO logs (user_id, action, entity, entity_id, ip_address)
                 VALUES ($1, $2, $3, $4, $5)`,
                [userId, action, entity, entityId, ipAddress || null]
            );
        } catch (error) {
            console.error('Audit log error:', error.message);
        }
    });

    next();
};

module.exports = { auditLogMiddleware };
