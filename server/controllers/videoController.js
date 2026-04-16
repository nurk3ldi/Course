const fs = require('fs/promises');
const path = require('path');
const { pool } = require('../db');
const { canAccessCourse, getUserById } = require('../services/accessService');
const { privateAbsolutePath, sanitizeRelativePath } = require('../services/storageService');
const {
    createVideoToken,
    verifyVideoToken,
    rewriteManifestWithSignature
} = require('../services/videoService');

const getLessonWithCourse = async (lessonId) => {
    const result = await pool.query(
        `SELECT l.id, l.video_url, m.course_id
         FROM lessons l
         JOIN modules m ON m.id = l.module_id
         WHERE l.id = $1`,
        [lessonId]
    );
    return result.rows[0] || null;
};

const getClientIp = (req) =>
    (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
        .toString()
        .split(',')[0]
        .trim();

const getLessonVideoUrl = async (req, res) => {
    try {
        const lessonId = Number(req.params.lessonId);
        const lesson = await getLessonWithCourse(lessonId);
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found' });
        }
        if (!lesson.video_url) {
            return res.status(404).json({ error: 'Video is not attached to lesson' });
        }

        const hasAccess = await canAccessCourse(req.user, lesson.course_id);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No access to this lesson video' });
        }

        if (/^https?:\/\//i.test(lesson.video_url)) {
            return res.json({
                lesson_id: lessonId,
                type: 'external',
                stream_url: lesson.video_url,
                expires_at: null
            });
        }

        const normalized = sanitizeRelativePath(lesson.video_url);
        const asset = path.posix.basename(normalized);
        const { token, expire, nonce } = createVideoToken({
            lessonId,
            userId: req.user.id,
            asset,
            ipAddress: getClientIp(req),
            userAgent: req.headers['user-agent'] || ''
        });
        const streamUrl = `/api/videos/stream/${lessonId}/${encodeURIComponent(asset)}?token=${token}&expire=${expire}&user_id=${req.user.id}&nonce=${nonce}`;

        res.json({
            lesson_id: lessonId,
            type: 'protected',
            stream_url: streamUrl,
            expires_at: new Date(expire * 1000).toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const streamVideoAsset = async (req, res) => {
    try {
        const lessonId = Number(req.params.lessonId);
        const asset = sanitizeRelativePath(decodeURIComponent(req.params.asset));
        const token = String(req.query.token || '');
        const expire = Number(req.query.expire);
        const userId = Number(req.query.user_id);
        const nonce = String(req.query.nonce || '');
        const clientIp = getClientIp(req);
        const userAgent = req.headers['user-agent'] || '';

        if (!token || !expire || !userId || !nonce) {
            return res.status(401).json({ error: 'Missing token params' });
        }

        const tokenOk = verifyVideoToken({
            lessonId,
            userId,
            asset,
            expire,
            token,
            nonce,
            ipAddress: clientIp,
            userAgent
        });
        if (!tokenOk) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const lesson = await getLessonWithCourse(lessonId);
        if (!lesson || !lesson.video_url) {
            return res.status(404).json({ error: 'Video not found' });
        }

        const user = await getUserById(userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found for token' });
        }
        const hasAccess = await canAccessCourse(user, lesson.course_id);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No access to this course video' });
        }

        const videoRelative = sanitizeRelativePath(lesson.video_url);
        const videoDir = path.posix.dirname(videoRelative);
        const requestedRelative = sanitizeRelativePath(path.posix.join(videoDir, asset));
        const absPath = privateAbsolutePath(requestedRelative);

        if (asset.endsWith('.m3u8')) {
            const manifest = await fs.readFile(absPath, 'utf8');
            const query = `token=${encodeURIComponent(token)}&expire=${expire}&user_id=${userId}&nonce=${encodeURIComponent(nonce)}`;
            const rewrittenManifest = rewriteManifestWithSignature(manifest, query);
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Cache-Control', 'private, no-store');
            return res.send(rewrittenManifest);
        }

        if (asset.endsWith('.ts')) {
            res.type('video/mp2t');
        } else if (asset.endsWith('.key')) {
            res.type('application/octet-stream');
        } else if (asset.endsWith('.mp4')) {
            res.type('video/mp4');
        }
        res.setHeader('Cache-Control', 'private, no-store');
        return res.sendFile(absPath);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getLessonVideoUrl,
    streamVideoAsset
};
