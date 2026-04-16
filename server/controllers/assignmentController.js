const { pool } = require('../db');
const {
    canAccessCourse,
    getCourseIdByAssignment,
    STAFF_ROLES
} = require('../services/accessService');

const VALID_SUBMISSION_STATUSES = new Set(['submitted', 'checking', 'accepted', 'revision', 'rejected']);

const createAssignment = async (req, res) => {
    try {
        const { lesson_id, title, description, task_type = 'text', resource_url = null } = req.body;
        if (!lesson_id || !title) {
            return res.status(400).json({ error: 'lesson_id and title are required' });
        }

        const lesson = await pool.query('SELECT id FROM lessons WHERE id = $1', [lesson_id]);
        if (lesson.rows.length === 0) {
            return res.status(404).json({ error: 'Lesson not found' });
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

const getAssignmentById = async (req, res) => {
    try {
        const assignmentId = Number(req.params.id || req.params.assignmentId);
        const result = await pool.query(
            `SELECT a.*, l.title AS lesson_title, m.course_id
             FROM assignments a
             JOIN lessons l ON l.id = a.lesson_id
             JOIN modules m ON m.id = l.module_id
             WHERE a.id = $1`,
            [assignmentId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        const assignment = result.rows[0];
        if (!STAFF_ROLES.has(req.user.role)) {
            const hasAccess = await canAccessCourse(req.user, assignment.course_id);
            if (!hasAccess) {
                return res.status(403).json({ error: 'No access to this assignment' });
            }
        }

        res.json(assignment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const submitAssignment = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { assignment_id, text_answer, file_url } = req.body;
        if (!assignment_id) {
            return res.status(400).json({ error: 'assignment_id is required' });
        }

        const courseId = await getCourseIdByAssignment(Number(assignment_id));
        if (!courseId) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        const hasAccess = await canAccessCourse(req.user, courseId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No access to this assignment' });
        }

        const existing = await pool.query(
            'SELECT id FROM student_assignments WHERE assignment_id = $1 AND student_id = $2',
            [assignment_id, studentId]
        );

        if (existing.rows.length > 0) {
            const updated = await pool.query(
                `UPDATE student_assignments
                 SET text_answer = $1,
                     file_url = $2,
                     status = 'submitted',
                     updated_at = NOW()
                 WHERE id = $3
                 RETURNING *`,
                [text_answer || null, file_url || null, existing.rows[0].id]
            );
            return res.json(updated.rows[0]);
        }

        const created = await pool.query(
            `INSERT INTO student_assignments (assignment_id, student_id, text_answer, file_url, status)
             VALUES ($1, $2, $3, $4, 'submitted')
             RETURNING *`,
            [assignment_id, studentId, text_answer || null, file_url || null]
        );
        res.status(201).json(created.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAssignmentSubmissions = async (req, res) => {
    try {
        const assignmentId = Number(req.params.assignmentId);
        const result = await pool.query(
            `SELECT sa.*, u.name as student_name, u.email as student_email
             FROM student_assignments sa
             JOIN users u ON sa.student_id = u.id
             WHERE sa.assignment_id = $1
             ORDER BY sa.updated_at DESC`,
            [assignmentId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const reviewSubmission = async (req, res) => {
    try {
        const submissionId = Number(req.params.submissionId || req.body.submission_id);
        const { status, teacher_comment } = req.body;
        if (!submissionId) {
            return res.status(400).json({ error: 'submission_id is required' });
        }
        if (status && !VALID_SUBMISSION_STATUSES.has(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }

        const nextStatus = status || 'checking';
        const result = await pool.query(
            `UPDATE student_assignments
             SET status = $1,
                 teacher_comment = COALESCE($2, teacher_comment),
                 updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [nextStatus, teacher_comment || null, submissionId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getMySubmissions = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT sa.*, a.title as assignment_title, c.title as course_title
             FROM student_assignments sa
             JOIN assignments a ON sa.assignment_id = a.id
             JOIN lessons l ON a.lesson_id = l.id
             JOIN modules m ON l.module_id = m.id
             JOIN courses c ON m.course_id = c.id
             WHERE sa.student_id = $1
             ORDER BY sa.updated_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createAssignment,
    getAssignmentById,
    submitAssignment,
    getAssignmentSubmissions,
    reviewSubmission,
    getMySubmissions
};
