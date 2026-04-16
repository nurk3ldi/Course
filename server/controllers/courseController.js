const path = require('path');
const { pool } = require('../db');
const { canAccessCourse, STAFF_ROLES } = require('../services/accessService');
const { createVideoToken } = require('../services/videoService');
const { sanitizeRelativePath } = require('../services/storageService');

const getClientIp = (req) =>
    (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
        .toString()
        .split(',')[0]
        .trim();

const createCourse = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { title, description, price } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'title is required' });
        }

        const courseRes = await client.query(
            `INSERT INTO courses (title, description, price, author_id, status)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [title, description || null, price || 0, req.user.id, 'active']
        );
        const course = courseRes.rows[0];

        await client.query(
            'INSERT INTO modules (course_id, title, position) VALUES ($1, $2, $3)',
            [course.id, 'Main module', 1]
        );

        await client.query('COMMIT');
        res.status(201).json(course);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const getAllCourses = async (_req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.*, u.name as author_name
             FROM courses c
             LEFT JOIN users u ON c.author_id = u.id
             ORDER BY c.created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getCourseById = async (req, res) => {
    try {
        const courseId = Number(req.params.id);
        const result = await pool.query(
            `SELECT c.*, u.name as author_name
             FROM courses c
             LEFT JOIN users u ON c.author_id = u.id
             WHERE c.id = $1`,
            [courseId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getFullCourseData = async (req, res) => {
    try {
        const courseId = Number(req.params.id);
        const hasAccess = await canAccessCourse(req.user, courseId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No access to this course' });
        }

        const result = await pool.query(
            `SELECT
                m.id as module_id, m.title as module_title,
                l.id as lesson_id, l.title as lesson_title, l.video_url, l.description as lesson_desc,
                a.id as assignment_id, a.title as assignment_title, a.description as assignment_body,
                a.task_type as assignment_type, a.resource_url as assignment_resource
             FROM modules m
             LEFT JOIN lessons l ON l.module_id = m.id
             LEFT JOIN assignments a ON a.lesson_id = l.id
             WHERE m.course_id = $1
             ORDER BY m.position, l.position, a.id`,
            [courseId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const addVideo = async (req, res) => {
    try {
        const { course_id, title, description, url } = req.body;
        if (!course_id || !title) {
            return res.status(400).json({ error: 'course_id and title are required' });
        }
        const moduleRes = await pool.query(
            'SELECT id FROM modules WHERE course_id = $1 ORDER BY position ASC LIMIT 1',
            [course_id]
        );
        if (moduleRes.rows.length === 0) {
            return res.status(400).json({ error: 'Create module first' });
        }
        const result = await pool.query(
            `INSERT INTO lessons (module_id, title, description, video_url)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [moduleRes.rows[0].id, title, description || null, url || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const addAssignment = async (req, res) => {
    try {
        const { lesson_id, title, description, task_type = 'text', resource_url = null } = req.body;
        if (!lesson_id || !title) {
            return res.status(400).json({ error: 'lesson_id and title are required' });
        }
        const result = await pool.query(
            `INSERT INTO assignments (lesson_id, title, description, task_type, resource_url)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [lesson_id, title, description || null, task_type, resource_url]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createModule = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, position } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'title is required' });
        }

        const result = await pool.query(
            'INSERT INTO modules (course_id, title, position) VALUES ($1, $2, $3) RETURNING *',
            [courseId, title, position || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const addLessonToModule = async (req, res) => {
    try {
        const { courseId, moduleId } = req.params;
        const { title, description, video_url, position } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'title is required' });
        }

        const moduleRes = await pool.query(
            'SELECT id FROM modules WHERE id = $1 AND course_id = $2',
            [moduleId, courseId]
        );
        if (moduleRes.rows.length === 0) {
            return res.status(400).json({ error: 'Module not found for this course' });
        }

        const result = await pool.query(
            `INSERT INTO lessons (module_id, title, description, video_url, position)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [moduleId, title, description || null, video_url || null, position || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const grantAccess = async (req, res) => {
    try {
        const { user_id, course_id } = req.body;
        if (!user_id || !course_id) {
            return res.status(400).json({ error: 'user_id and course_id are required' });
        }
        const check = await pool.query(
            'SELECT id FROM orders WHERE user_id = $1 AND course_id = $2 AND status IN ($3, $4, $5)',
            [user_id, course_id, 'paid', 'completed', 'active']
        );
        if (check.rows.length > 0) {
            return res.status(400).json({ error: 'Access already granted' });
        }

        const result = await pool.query(
            `INSERT INTO orders (user_id, course_id, price, status)
             VALUES ($1, $2, 0, 'paid')
             RETURNING *`,
            [user_id, course_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getMyCourses = async (req, res) => {
    try {
        if (STAFF_ROLES.has(req.user.role)) {
            const staffCourses = await pool.query(
                `SELECT c.*, u.name as author_name
                 FROM courses c
                 LEFT JOIN users u ON c.author_id = u.id
                 ORDER BY c.created_at DESC`
            );
            return res.json(staffCourses.rows);
        }

        const result = await pool.query(
            `SELECT c.*, u.name as author_name
             FROM orders o
             JOIN courses c ON c.id = o.course_id
             LEFT JOIN users u ON c.author_id = u.id
             WHERE o.user_id = $1
               AND o.status IN ('paid', 'completed', 'active')
             ORDER BY c.created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM courses WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        res.json({ message: 'Course deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, status } = req.body;
        const result = await pool.query(
            `UPDATE courses
             SET title = COALESCE($1, title),
                 description = COALESCE($2, description),
                 price = COALESCE($3, price),
                 status = COALESCE($4, status),
                 updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [title || null, description || null, price ?? null, status || null, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getCourseVideos = async (req, res) => {
    try {
        const courseId = Number(req.params.id);
        const hasAccess = await canAccessCourse(req.user, courseId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No access to this course videos' });
        }

        const result = await pool.query(
            `SELECT l.id as lesson_id, l.title as lesson_title, l.video_url
             FROM lessons l
             JOIN modules m ON m.id = l.module_id
             WHERE m.course_id = $1
             ORDER BY m.position, l.position`,
            [courseId]
        );

        const rows = result.rows.map((lesson) => {
            if (!lesson.video_url) {
                return { ...lesson, stream_url: null, expires_at: null };
            }
            if (/^https?:\/\//i.test(lesson.video_url)) {
                return { ...lesson, stream_url: lesson.video_url, expires_at: null };
            }

            const normalized = sanitizeRelativePath(lesson.video_url);
            const asset = path.posix.basename(normalized);
            const { token, expire, nonce } = createVideoToken({
                lessonId: lesson.lesson_id,
                userId: req.user.id,
                asset,
                ipAddress: getClientIp(req),
                userAgent: req.headers['user-agent'] || ''
            });

            return {
                ...lesson,
                stream_url: `/api/videos/stream/${lesson.lesson_id}/${encodeURIComponent(asset)}?token=${token}&expire=${expire}&user_id=${req.user.id}&nonce=${nonce}`,
                expires_at: new Date(expire * 1000).toISOString()
            };
        });

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createCourse,
    getAllCourses,
    getCourseById,
    getFullCourseData,
    updateCourse,
    deleteCourse,
    addVideo,
    addAssignment,
    createModule,
    addLessonToModule,
    grantAccess,
    getMyCourses,
    getCourseVideos
};
