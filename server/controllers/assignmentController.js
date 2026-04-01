const { pool } = require('../db');

const submitAssignment = async (req, res) => {
    try {
        const student_id = req.user.id;
        const { assignment_id, text_answer, file_url } = req.body;

        // Проверка, что задание существует
        const assignment = await pool.query('SELECT id FROM assignments WHERE id = $1', [assignment_id]);
        if (assignment.rows.length === 0) {
            return res.status(404).json({ error: 'Задание не найдено' });
        }

        // Если уже есть ответ студента, обновляем его
        const existing = await pool.query(
            'SELECT id FROM student_assignments WHERE assignment_id = $1 AND student_id = $2',
            [assignment_id, student_id]
        );

        if (existing.rows.length > 0) {
            const id = existing.rows[0].id;
            const updated = await pool.query(
                'UPDATE student_assignments SET text_answer = $1, file_url = $2, status = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
                [text_answer || null, file_url || null, 'submitted', id]
            );
            return res.json(updated.rows[0]);
        }

        const result = await pool.query(
            'INSERT INTO student_assignments (assignment_id, student_id, text_answer, file_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [assignment_id, student_id, text_answer || null, file_url || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAssignmentSubmissions = async (req, res) => {
    try {
        const { assignmentId } = req.params;

        const result = await pool.query(`
            SELECT sa.*, u.name as student_name, u.email as student_email
            FROM student_assignments sa
            JOIN users u ON sa.student_id = u.id
            WHERE sa.assignment_id = $1
        `, [assignmentId]);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const reviewSubmission = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { status, teacher_comment } = req.body;

        const result = await pool.query(
            'UPDATE student_assignments SET status = $1, teacher_comment = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
            [status || 'reviewed', teacher_comment || null, submissionId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Ответ не найден' });

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getMySubmissions = async (req, res) => {
    try {
        const student_id = req.user.id;
        const result = await pool.query(`
            SELECT sa.*, a.title as assignment_title, c.title as course_title
            FROM student_assignments sa
            JOIN assignments a ON sa.assignment_id = a.id
            JOIN lessons l ON a.lesson_id = l.id
            JOIN modules m ON l.module_id = m.id
            JOIN courses c ON m.course_id = c.id
            WHERE sa.student_id = $1
            ORDER BY sa.updated_at DESC
        `, [student_id]);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    submitAssignment,
    getAssignmentSubmissions,
    reviewSubmission,
    getMySubmissions
};