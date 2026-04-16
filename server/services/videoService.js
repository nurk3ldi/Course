const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { VIDEO_HLS_DIR } = require('./storageService');
const { createSession, validateAndTouchSession } = require('./videoSessionStore');

const execFileAsync = promisify(execFile);

const getVideoSecret = () => process.env.VIDEO_SIGNING_SECRET || process.env.JWT_SECRET || 'video-secret';

const hashFingerprint = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 24);

const signVideoPayload = ({ lessonId, userId, asset, expire, nonce, ipHash, uaHash }) => {
    const payload = `${lessonId}:${userId}:${asset}:${expire}:${nonce}:${ipHash}:${uaHash}`;
    return crypto.createHmac('sha256', getVideoSecret()).update(payload).digest('hex');
};

const createVideoToken = ({
    lessonId,
    userId,
    asset = 'master.m3u8',
    ttlSeconds = 900,
    ipAddress = '',
    userAgent = ''
}) => {
    const expire = Math.floor(Date.now() / 1000) + ttlSeconds;
    const nonce = crypto.randomBytes(12).toString('hex');
    const ipHash = hashFingerprint(ipAddress);
    const uaHash = hashFingerprint(userAgent);
    const token = signVideoPayload({ lessonId, userId, asset, expire, nonce, ipHash, uaHash });

    createSession({
        nonce,
        userId,
        lessonId,
        ipHash,
        uaHash,
        expire,
        maxHits: Number(process.env.VIDEO_SESSION_MAX_HITS || 6000)
    });

    return { token, expire, nonce };
};

const verifyVideoToken = ({ lessonId, userId, asset, expire, token, nonce, ipAddress = '', userAgent = '' }) => {
    const now = Math.floor(Date.now() / 1000);
    if (!expire || Number(expire) < now || !nonce) return false;
    const ipHash = hashFingerprint(ipAddress);
    const uaHash = hashFingerprint(userAgent);
    const expected = signVideoPayload({
        lessonId: Number(lessonId),
        userId: Number(userId),
        asset,
        expire: Number(expire),
        nonce,
        ipHash,
        uaHash
    });
    const presented = String(token || '');
    if (expected.length !== presented.length) return false;
    const signatureOk = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(presented));
    if (!signatureOk) return false;

    return validateAndTouchSession({
        nonce,
        userId,
        lessonId,
        ipHash,
        uaHash,
        nowUnix: now
    });
};

const rewriteManifestWithSignature = (manifestContent, queryString) => {
    const appendQuery = (value) => `${value}${value.includes('?') ? '&' : '?'}${queryString}`;
    const lines = manifestContent.split(/\r?\n/);
    const rewritten = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
            return line;
        }

        if (trimmed.startsWith('#EXT-X-KEY') || trimmed.startsWith('#EXT-X-MAP')) {
            return line.replace(/URI="([^"]+)"/, (_m, uri) => `URI="${appendQuery(uri)}"`);
        }

        if (trimmed.startsWith('#')) {
            return line;
        }

        return appendQuery(trimmed);
    });
    return rewritten.join('\n');
};

const convertMp4ToHls = async (inputPath, lessonId) => {
    const outputDir = path.join(VIDEO_HLS_DIR, String(lessonId));
    await fs.mkdir(outputDir, { recursive: true });

    const keyPath = path.join(outputDir, 'enc.key');
    const keyInfoPath = path.join(outputDir, 'enc.keyinfo');
    const iv = crypto.randomBytes(16).toString('hex');
    await fs.writeFile(keyPath, crypto.randomBytes(16));
    await fs.writeFile(keyInfoPath, `enc.key\n${keyPath}\n${iv}\n`, 'utf8');

    const renditions = [
        { name: '360p', height: 360, bandwidth: 800000, videoBitrate: '600k', maxrate: '800k', bufsize: '1200k', audioBitrate: '96k', resolution: '640x360' },
        { name: '720p', height: 720, bandwidth: 2800000, videoBitrate: '2200k', maxrate: '2800k', bufsize: '4200k', audioBitrate: '128k', resolution: '1280x720' },
        { name: '1080p', height: 1080, bandwidth: 5000000, videoBitrate: '4200k', maxrate: '5000k', bufsize: '7500k', audioBitrate: '192k', resolution: '1920x1080' }
    ];

    for (const rendition of renditions) {
        const playlistPath = path.join(outputDir, `${rendition.name}.m3u8`);
        const segmentPattern = path.join(outputDir, `${rendition.name}_%03d.ts`);

        await execFileAsync('ffmpeg', [
            '-y',
            '-i', inputPath,
            '-vf', `scale=-2:${rendition.height}`,
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-profile:v', 'main',
            '-crf', '22',
            '-g', '48',
            '-keyint_min', '48',
            '-sc_threshold', '0',
            '-c:a', 'aac',
            '-ar', '48000',
            '-b:v', rendition.videoBitrate,
            '-maxrate', rendition.maxrate,
            '-bufsize', rendition.bufsize,
            '-b:a', rendition.audioBitrate,
            '-hls_time', '4',
            '-hls_playlist_type', 'vod',
            '-hls_flags', 'independent_segments',
            '-hls_key_info_file', keyInfoPath,
            '-hls_segment_filename', segmentPattern,
            playlistPath
        ]);
    }

    const masterManifest = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        ...renditions.flatMap((rendition) => [
            `#EXT-X-STREAM-INF:BANDWIDTH=${rendition.bandwidth},RESOLUTION=${rendition.resolution},CODECS="avc1.4d401f,mp4a.40.2"`,
            `${rendition.name}.m3u8`
        ])
    ].join('\n');

    await fs.writeFile(path.join(outputDir, 'master.m3u8'), `${masterManifest}\n`, 'utf8');
    return `videos/hls/${lessonId}/master.m3u8`;
};

module.exports = {
    createVideoToken,
    verifyVideoToken,
    rewriteManifestWithSignature,
    convertMp4ToHls,
    hashFingerprint
};
