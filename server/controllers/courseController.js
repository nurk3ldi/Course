const { pool } = require('../db');

const createCourse = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { title, description } = req.body;
        
        const courseRes = await client.query(
            'INSERT INTO courses (title, description, author_id, status) VALUES ($1, $2, $3, $4) RETURNING *',
            [title, description, req.user.id, 'active']
        );
        const course = courseRes.rows[0];

        await client.query(
            'INSERT INTO modules (course_id, title, position) VALUES ($1, $2, $3)',
            [course.id, 'Негізгі модуль', 1]
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

const getAllCourses = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM courses');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description } = req.body;
        const result = await pool.query(
            'UPDATE courses SET title = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            [title, description, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM courses WHERE id = $1', [id]);
        res.json({ message: "Course deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const addVideo = async (req, res) => {
    try {
        const { course_id, title, url } = req.body;
        let video_url = url;
        if (req.file) {
            video_url = `/storage/private/${req.file.filename}`;
        }

        const moduleRes = await pool.query('SELECT id FROM modules WHERE course_id = $1 LIMIT 1', [course_id]);
        if (moduleRes.rows.length === 0) return res.status(400).json({ error: "Module not found" });
        
        const module_id = moduleRes.rows[0].id;

        const result = await pool.query(
            'INSERT INTO lessons (module_id, title, video_url) VALUES ($1, $2, $3) RETURNING *',
            [module_id, title, video_url]
        );
        res.status(201).json({ id: result.rows[0].id, course_id, title, url: video_url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        const result = await pool.query(
            'UPDATE lessons SET title = $1 WHERE id = $2 RETURNING *',
            [title, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteVideo = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM lessons WHERE id = $1', [id]);
        res.json({ message: "Video deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const grantAccess = async (req, res) => {
    try {
        const { user_id, course_id } = req.body;
        const result = await pool.query(
            `INSERT INTO orders (user_id, course_id, price, status) VALUES ($1, $2, 0, 'paid') RETURNING *`,
            [user_id, course_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const revokeAccess = async (req, res) => {
    try {
        const { user_id, course_id } = req.body;
        await pool.query('DELETE FROM orders WHERE user_id = $1 AND course_id = $2', [user_id, course_id]);
        res.json({ message: "Access revoked" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getMyCourses = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            `SELECT c.* FROM courses c JOIN orders o ON c.id = o.course_id WHERE o.user_id = $1 AND o.status = 'paid'`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getCourseVideos = async (req, res) => {
    try {
        const userId = req.user.id;
        const { courseId } = req.params;

        if (req.user.role !== 'admin' && req.user.role !== 'employee') {
            const accessCheck = await pool.query(
                "SELECT * FROM orders WHERE user_id = $1 AND course_id = $2 AND status = 'paid'",
                [userId, courseId]
            );
            if (accessCheck.rows.length === 0) return res.status(403).json({ error: "Access denied" });
        }

        const result = await pool.query(
            `SELECT l.id, l.title, l.video_url as url FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = $1 ORDER BY l.id ASC`,
            [courseId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createCourse, getAllCourses, updateCourse, deleteCourse,
    addVideo, updateVideo, deleteVideo,
    grantAccess, revokeAccess, getMyCourses, getCourseVideos
};