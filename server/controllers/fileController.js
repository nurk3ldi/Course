const fs = require('fs/promises');
const path = require('path');
const { pool } = require('../db');
const {
    privateAbsolutePath,
    toPosixRelative
} = require('../services/storageService');
const {
    canAccessCourse,
    getCourseIdByLesson,
    getCourseIdByAssignment,
    STAFF_ROLES
} = require('../services/accessService');

const resolveFileAccess = async (fileRow, user) => {
    if (!user) return false;
    if (STAFF_ROLES.has(user.role)) return true;
    if (fileRow.uploaded_by && Number(fileRow.uploaded_by) === Number(user.id)) return true;

    if (!fileRow.related_entity || !fileRow.related_id) return false;

    if (fileRow.related_entity === 'course') {
        return canAccessCourse(user, Number(fileRow.related_id));
    }
    if (fileRow.related_entity === 'lesson') {
        const courseId = await getCourseIdByLesson(Number(fileRow.related_id));
        return canAccessCourse(user, courseId);
    }
    if (fileRow.related_entity === 'assignment') {
        const courseId = await getCourseIdByAssignment(Number(fileRow.related_id));
        return canAccessCourse(user, courseId);
    }
    return false;
};

const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'File is required' });
        }

        const { related_entity, related_id } = req.body;
        const relativeFilePath = toPosixRelative(path.join('files', req.file.filename));
        const result = await pool.query(
            `INSERT INTO files (uploaded_by, file_path, file_type, size, related_entity, related_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                req.user.id,
                relativeFilePath,
                req.file.mimetype || null,
                req.file.size || null,
                related_entity || null,
                related_id ? Number(related_id) : null
            ]
        );

        res.status(201).json({
            ...result.rows[0],
            download_url: `/api/files/${result.rows[0].id}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getFileById = async (req, res) => {
    try {
        const fileId = Number(req.params.id);
        const result = await pool.query('SELECT * FROM files WHERE id = $1', [fileId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const fileRow = result.rows[0];
        const hasAccess = await resolveFileAccess(fileRow, req.user);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No access to file' });
        }

        const absPath = privateAbsolutePath(fileRow.file_path);
        const filename = path.basename(absPath);
        res.setHeader('Cache-Control', 'private, no-store');
        return res.download(absPath, filename);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteFile = async (req, res) => {
    try {
        const fileId = Number(req.params.id);
        const result = await pool.query('SELECT * FROM files WHERE id = $1', [fileId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const fileRow = result.rows[0];
        const isOwner = Number(fileRow.uploaded_by) === Number(req.user.id);
        if (!isOwner && !STAFF_ROLES.has(req.user.role)) {
            return res.status(403).json({ error: 'No permission to delete file' });
        }

        await pool.query('DELETE FROM files WHERE id = $1', [fileId]);
        try {
            const absPath = privateAbsolutePath(fileRow.file_path);
            await fs.unlink(absPath);
        } catch (_error) {
            // Physical file may already be missing.
        }

        res.json({ message: 'File deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    uploadFile,
    getFileById,
    deleteFile
};
