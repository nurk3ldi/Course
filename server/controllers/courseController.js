const { pool } = require('../db');

// --- КУРСЫ ---

const createCourse = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { title, description, price } = req.body;
        
        // Создаем курс. Статус 'active' для мгновенного доступа или 'draft'
        const courseRes = await client.query(
            'INSERT INTO courses (title, description, price, author_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, description, price || 0, req.user.id, 'active']
        );
        const course = courseRes.rows[0];

        // Автоматически создаем первый модуль, чтобы админу не нужно было делать это вручную
        await client.query(
            'INSERT INTO modules (course_id, title, position) VALUES ($1, $2, $3)',
            [course.id, 'Основной модуль', 1]
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
        // Получаем все курсы с именем автора
        const result = await pool.query(`
            SELECT c.*, u.name as author_name 
            FROM courses c 
            LEFT JOIN users u ON c.author_id = u.id 
            ORDER BY c.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getFullCourseData = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Получаем структуру: Модули -> Уроки -> Задания
        const result = await pool.query(`
            SELECT 
                m.id as module_id, m.title as module_title,
                l.id as lesson_id, l.title as lesson_title, l.video_url, l.description as lesson_desc,
                a.id as assignment_id, a.title as assignment_title, a.description as assignment_body, a.task_type as assignment_type, a.resource_url as assignment_resource
            FROM modules m
            LEFT JOIN lessons l ON l.module_id = m.id
            LEFT JOIN assignments a ON a.lesson_id = l.id
            WHERE m.course_id = $1
            ORDER BY m.position, l.position, a.id
        `, [id]);
        
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- ВИДЕО И УРОКИ ---

const addVideo = async (req, res) => {
    try {
        const { course_id, title, description, url } = req.body;
        let video_url = url;

        if (req.file) {
            video_url = `/storage/private/${req.file.filename}`;
        }

        // Берем первый доступный модуль курса
        const moduleRes = await pool.query('SELECT id FROM modules WHERE course_id = $1 ORDER BY position ASC LIMIT 1', [course_id]);
        if (moduleRes.rows.length === 0) return res.status(400).json({ error: "Сначала создайте модуль для курса" });
        
        const module_id = moduleRes.rows[0].id;

        const result = await pool.query(
            'INSERT INTO lessons (module_id, title, description, video_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [module_id, title, description, video_url]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- ЗАДАНИЯ ---

const addAssignment = async (req, res) => {
    try {
        const { lesson_id, title, description, task_type = 'text', resource_url = null } = req.body;
        
        const result = await pool.query(
            'INSERT INTO assignments (lesson_id, title, description, task_type, resource_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [lesson_id, title, description, task_type, resource_url]
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

        // проверка, что модуль принадлежит курсу
        const moduleRes = await pool.query('SELECT id FROM modules WHERE id = $1 AND course_id = $2', [moduleId, courseId]);
        if (moduleRes.rows.length === 0) {
            return res.status(400).json({ error: 'Модуль не найден для этого курса' });
        }

        const result = await pool.query(
            'INSERT INTO lessons (module_id, title, description, video_url, position) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [moduleId, title, description, video_url || null, position || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- ДОСТУП И ПРАВА ---

const grantAccess = async (req, res) => {
    try {
        const { user_id, course_id } = req.body;
        // Проверяем, нет ли уже доступа
        const check = await pool.query('SELECT id FROM orders WHERE user_id = $1 AND course_id = $2', [user_id, course_id]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Доступ уже предоставлен" });

        const result = await pool.query(
            `INSERT INTO orders (user_id, course_id, price, status) VALUES ($1, $2, 0, 'paid') RETURNING *`,
            [user_id, course_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getMyCourses = async (req, res) => {
    try {
        // Все пользователи кроме админов видят все доступные курсы
        // Останется как есть, когда включится система платежей
        const query = `
            SELECT c.*, u.name as author_name 
            FROM courses c 
            LEFT JOIN users u ON c.author_id = u.id 
            WHERE c.status = 'active'
            ORDER BY c.created_at DESC
        `;
        
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- УДАЛЕНИЕ И ОБНОВЛЕНИЕ ---

const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM courses WHERE id = $1', [id]);
        res.json({ message: "Курс и все связанные материалы удалены" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, status } = req.body;

        const result = await pool.query(
            `UPDATE courses SET title = $1, description = $2, price = $3, status = $4, updated_at = NOW() WHERE id = $5 RETURNING *`,
            [title, description, price || 0, status || 'active', id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Курс не найден' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const revokeAccess = async (req, res) => {
    try {
        const { user_id, course_id } = req.body;
        const result = await pool.query(
            'DELETE FROM orders WHERE user_id = $1 AND course_id = $2 RETURNING *',
            [user_id, course_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Доступ не найден' });
        }

        res.json({ message: 'Доступ отозван', revoked: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getCourseVideos = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT l.id as lesson_id, l.title as lesson_title, l.video_url FROM lessons l
            JOIN modules m ON m.id = l.module_id
            WHERE m.course_id = $1
            ORDER BY m.position, l.position`,
            [id]
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Экспортируем все функции
module.exports = {
    createCourse,
    getAllCourses,
    getFullCourseData,
    updateCourse,
    deleteCourse,
    addVideo,
    addAssignment,
    createModule,
    addLessonToModule,
    grantAccess,
    revokeAccess,
    getMyCourses,
    getCourseVideos
};