const fs = require('fs/promises');
const path = require('path');

const PRIVATE_ROOT = path.join(__dirname, '..', 'storage', 'private');
const FILES_DIR = path.join(PRIVATE_ROOT, 'files');
const VIDEO_RAW_DIR = path.join(PRIVATE_ROOT, 'videos', 'raw');
const VIDEO_HLS_DIR = path.join(PRIVATE_ROOT, 'videos', 'hls');

const ensureStorageDirs = async () => {
    await fs.mkdir(FILES_DIR, { recursive: true });
    await fs.mkdir(VIDEO_RAW_DIR, { recursive: true });
    await fs.mkdir(VIDEO_HLS_DIR, { recursive: true });
};

const toPosixRelative = (value) => value.split(path.sep).join('/');

const sanitizeRelativePath = (relativePath) => {
    const normalized = path.posix.normalize(relativePath.replace(/\\/g, '/'));
    if (normalized.startsWith('..') || path.posix.isAbsolute(normalized)) {
        throw new Error('Unsafe path');
    }
    return normalized;
};

const privateAbsolutePath = (relativePath) => {
    const safeRelative = sanitizeRelativePath(relativePath);
    const absolute = path.join(PRIVATE_ROOT, safeRelative);
    const rootNormalized = path.resolve(PRIVATE_ROOT);
    const absNormalized = path.resolve(absolute);
    if (!absNormalized.startsWith(rootNormalized)) {
        throw new Error('Unsafe path');
    }
    return absNormalized;
};

module.exports = {
    PRIVATE_ROOT,
    FILES_DIR,
    VIDEO_RAW_DIR,
    VIDEO_HLS_DIR,
    ensureStorageDirs,
    toPosixRelative,
    sanitizeRelativePath,
    privateAbsolutePath
};
