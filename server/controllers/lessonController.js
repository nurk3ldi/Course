const path = require('path');
const { pool } = require('../db');
const { convertMp4ToHls } = require('../services/videoService');
const { toPosixRelative } = require('../services/storageService');

const enrichLesson = async (lessonId) => {
    const result = await pool.query(
        `SELECT l.*, m.course_id
         FROM lessons l
         JOIN modules m ON m.id = l.module_id
         WHERE l.id = $1`,
        [lessonId]
    );
    return result.rows[0] || null;
};

const getLessonById = async (req, res) => {
    try {
        const lessonId = Number(req.params.id);
        const lesson = await enrichLesson(lessonId);
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found' });
        }

        const assignments = await pool.query(
            `SELECT id, title, description, created_at, task_type, resource_url
             FROM assignments
             WHERE lesson_id = $1
             ORDER BY id DESC`,
            [lessonId]
        );

        res.json({ ...lesson, assignments: assignments.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createLesson = async (req, res) => {
    const client = await pool.connect();
    try {
        const { module_id, title, description, position, video_url } = req.body;
        if (!module_id || !title) {
            return res.status(400).json({ error: 'module_id and title are required' });
        }

        const moduleCheck = await client.query('SELECT id FROM modules WHERE id = $1', [module_id]);
        if (moduleCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Module not found' });
        }

        await client.query('BEGIN');
        const inserted = await client.query(
            `INSERT INTO lessons (module_id, title, description, video_url, position)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [module_id, title, description || null, video_url || null, position || 0]
        );

        const lesson = inserted.rows[0];

        if (req.file) {
            const rawRelative = toPosixRelative(path.join('videos', 'raw', req.file.filename));
            let finalVideoPath = rawRelative;
            finalVideoPath = await convertMp4ToHls(req.file.path, lesson.id);

            const updated = await client.query(
                'UPDATE lessons SET video_url = $1 WHERE id = $2 RETURNING *',
                [finalVideoPath, lesson.id]
            );
            await client.query('COMMIT');
            return res.status(201).json(updated.rows[0]);
        }

        await client.query('COMMIT');
        res.status(201).json(lesson);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const updateLesson = async (req, res) => {
    const client = await pool.connect();
    try {
        const lessonId = Number(req.params.id);
        const { module_id, title, description, video_url, position } = req.body;

        const existing = await client.query('SELECT * FROM lessons WHERE id = $1', [lessonId]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Lesson not found' });
        }

        await client.query('BEGIN');
        let nextVideoUrl = video_url ?? existing.rows[0].video_url;
        if (req.file) {
            const rawRelative = toPosixRelative(path.join('videos', 'raw', req.file.filename));
            nextVideoUrl = rawRelative;
            nextVideoUrl = await convertMp4ToHls(req.file.path, lessonId);
        }

        const result = await client.query(
            `UPDATE lessons
             SET module_id = COALESCE($1, module_id),
                 title = COALESCE($2, title),
                 description = COALESCE($3, description),
                 video_url = COALESCE($4, video_url),
                 position = COALESCE($5, position)
             WHERE id = $6
             RETURNING *`,
            [module_id || null, title || null, description || null, nextVideoUrl || null, position ?? null, lessonId]
        );

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const uploadLessonVideo = async (req, res) => {
    const client = await pool.connect();
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'video file is required' });
        }
        const lessonId = Number(req.params.id);
        const lessonCheck = await client.query('SELECT id FROM lessons WHERE id = $1', [lessonId]);
        if (lessonCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Lesson not found' });
        }

        await client.query('BEGIN');
        const rawRelative = toPosixRelative(path.join('videos', 'raw', req.file.filename));
        let finalVideoPath = rawRelative;
        finalVideoPath = await convertMp4ToHls(req.file.path, lessonId);

        const result = await client.query(
            'UPDATE lessons SET video_url = $1 WHERE id = $2 RETURNING *',
            [finalVideoPath, lessonId]
        );
        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const deleteLesson = async (req, res) => {
    try {
        const lessonId = Number(req.params.id);
        const result = await pool.query('DELETE FROM lessons WHERE id = $1 RETURNING *', [lessonId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lesson not found' });
        }
        res.json({ message: 'Lesson deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getLessonById,
    createLesson,
    updateLesson,
    uploadLessonVideo,
    deleteLesson
};
