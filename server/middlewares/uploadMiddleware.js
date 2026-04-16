const path = require('path');
const multer = require('multer');
const { FILES_DIR, VIDEO_RAW_DIR } = require('../services/storageService');

const makeFilename = (file) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
};

const fileStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, FILES_DIR),
    filename: (_req, file, cb) => cb(null, makeFilename(file))
});

const videoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, VIDEO_RAW_DIR),
    filename: (_req, file, cb) => cb(null, makeFilename(file))
});

const fileUpload = multer({
    storage: fileStorage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
});

const videoUpload = multer({
    storage: videoStorage,
    limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2 GB
});

module.exports = { fileUpload, videoUpload };
