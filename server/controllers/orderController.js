const { pool } = require('../db');
const { STAFF_ROLES } = require('../services/accessService');

const createOrder = async (req, res) => {
    try {
        const { course_id, price } = req.body;
        const userIdFromBody = req.body.user_id ? Number(req.body.user_id) : null;
        const userId = STAFF_ROLES.has(req.user.role) && userIdFromBody ? userIdFromBody : req.user.id;

        if (!course_id) {
            return res.status(400).json({ error: 'course_id is required' });
        }

        const courseCheck = await pool.query('SELECT id, price FROM courses WHERE id = $1', [course_id]);
        if (courseCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        const existing = await pool.query(
            `SELECT id
             FROM orders
             WHERE user_id = $1
               AND course_id = $2
               AND status IN ('new', 'pending', 'paid', 'completed')
             LIMIT 1`,
            [userId, course_id]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Order for this course already exists' });
        }

        const amount = price ?? courseCheck.rows[0].price ?? 0;
        const result = await pool.query(
            `INSERT INTO orders (user_id, course_id, price, status)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [userId, course_id, amount, 'pending']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getOrders = async (req, res) => {
    try {
        const baseQuery = `
            SELECT o.*, c.title AS course_title, u.name AS user_name
            FROM orders o
            JOIN courses c ON c.id = o.course_id
            JOIN users u ON u.id = o.user_id
        `;
        if (STAFF_ROLES.has(req.user.role)) {
            const result = await pool.query(`${baseQuery} ORDER BY o.created_at DESC`);
            return res.json(result.rows);
        }

        const result = await pool.query(
            `${baseQuery} WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getOrderById = async (req, res) => {
    try {
        const orderId = Number(req.params.id);
        const result = await pool.query(
            `SELECT o.*, c.title AS course_title, u.name AS user_name
             FROM orders o
             JOIN courses c ON c.id = o.course_id
             JOIN users u ON u.id = o.user_id
             WHERE o.id = $1`,
            [orderId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = result.rows[0];
        if (!STAFF_ROLES.has(req.user.role) && Number(order.user_id) !== Number(req.user.id)) {
            return res.status(403).json({ error: 'No access to this order' });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const orderId = Number(req.params.id);
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'status is required' });
        }

        const result = await pool.query(
            'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
            [status, orderId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createOrder,
    getOrders,
    getOrderById,
    updateOrderStatus
};
