const { pool } = require('../db');
const { ROLES } = require('../config/rbac');

const STAFF_ROLES = new Set(['admin', 'employee']);
const LEARNING_ROLES = new Set([ROLES.STUDENT, ROLES.EMPLOYEE, ROLES.ADMIN]);

const getCourseIdByLesson = async (lessonId) => {
    const result = await pool.query(
        `SELECT m.course_id
         FROM lessons l
         JOIN modules m ON m.id = l.module_id
         WHERE l.id = $1`,
        [lessonId]
    );
    return result.rows[0]?.course_id || null;
};

const getCourseIdByAssignment = async (assignmentId) => {
    const result = await pool.query(
        `SELECT m.course_id
         FROM assignments a
         JOIN lessons l ON l.id = a.lesson_id
         JOIN modules m ON m.id = l.module_id
         WHERE a.id = $1`,
        [assignmentId]
    );
    return result.rows[0]?.course_id || null;
};

const canAccessCourse = async (user, courseId) => {
    if (!user || !courseId) return false;
    if (STAFF_ROLES.has(user.role)) return true;
    if (!LEARNING_ROLES.has(user.role)) return false;

    const directAuthor = await pool.query(
        'SELECT id FROM courses WHERE id = $1 AND author_id = $2 LIMIT 1',
        [courseId, user.id]
    );
    if (directAuthor.rows.length > 0) return true;

    const result = await pool.query(
        `SELECT id
         FROM orders
         WHERE user_id = $1
           AND course_id = $2
           AND status IN ('paid', 'completed', 'active')
         LIMIT 1`,
        [user.id, courseId]
    );
    return result.rows.length > 0;
};

const getUserById = async (userId) => {
    const result = await pool.query(
        `SELECT u.id, r.role_name AS role
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.id = $1`,
        [userId]
    );
    return result.rows[0] || null;
};

const canAccessCourseByUserId = async (userId, courseId) => {
    const user = await getUserById(userId);
    if (!user) return false;
    return canAccessCourse(user, courseId);
};

const requireCourseAccess = async (req, res, next) => {
    try {
        const courseId = Number(req.params.courseId || req.params.id || req.body.course_id);
        if (!courseId) {
            return res.status(400).json({ error: 'course_id is required' });
        }
        const ok = await canAccessCourse(req.user, courseId);
        if (!ok) {
            return res.status(403).json({ error: 'No access to this course' });
        }
        req.courseId = courseId;
        next();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    STAFF_ROLES,
    LEARNING_ROLES,
    canAccessCourse,
    getUserById,
    canAccessCourseByUserId,
    getCourseIdByLesson,
    getCourseIdByAssignment,
    requireCourseAccess
};
