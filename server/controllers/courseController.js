const { pool } = require('../db');

const createCourse = async (req, res) => {
    try {
        const { title, description } = req.body;
        const result = await pool.query(
            'INSERT INTO courses (title, description) VALUES ($1, $2) RETURNING *',
            [title, description]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
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
            'UPDATE courses SET title = $1, description = $2 WHERE id = $3 RETURNING *',
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
        const { course_id, title } = req.body;
        if (!req.file) return res.status(400).json({ error: "Video file is required" });
        
        const fileUrl = `/uploads/${req.file.filename}`;
        
        const result = await pool.query(
            'INSERT INTO videos (course_id, title, url) VALUES ($1, $2, $3) RETURNING *',
            [course_id, title, fileUrl]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, url } = req.body;
        const result = await pool.query(
            'UPDATE videos SET title = $1, url = $2 WHERE id = $3 RETURNING *',
            [title, url, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteVideo = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM videos WHERE id = $1', [id]);
        res.json({ message: "Video deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const grantAccess = async (req, res) => {
    try {
        const { user_id, course_id } = req.body;
        const result = await pool.query(
            'INSERT INTO access (user_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
            [user_id, course_id]
        );
        res.status(201).json(result.rows[0] || { message: "Access already exists" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const revokeAccess = async (req, res) => {
    try {
        const { user_id, course_id } = req.body;
        await pool.query('DELETE FROM access WHERE user_id = $1 AND course_id = $2', [user_id, course_id]);
        res.json({ message: "Access revoked" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getMyCourses = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            `SELECT c.* FROM courses c 
             JOIN access a ON c.id = a.course_id 
             WHERE a.user_id = $1`,
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

        if (req.user.role !== 'admin') {
            const accessCheck = await pool.query(
                'SELECT * FROM access WHERE user_id = $1 AND course_id = $2',
                [userId, courseId]
            );
            if (accessCheck.rows.length === 0) return res.status(403).json({ error: "Access denied" });
        }

        const result = await pool.query('SELECT * FROM videos WHERE course_id = $1 ORDER BY id ASC', [courseId]);
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