const { pool } = require('../db');
const { STAFF_ROLES } = require('../services/accessService');

const promoteClientToStudentIfNeeded = async (client, orderId) => {
    const roleRes = await client.query(`SELECT id FROM roles WHERE role_name = 'student' LIMIT 1`);
    if (roleRes.rows.length === 0) return;
    const studentRoleId = roleRes.rows[0].id;
    await client.query(
        `UPDATE users
         SET role_id = $1
         WHERE id = (SELECT user_id FROM orders WHERE id = $2)
           AND role_id <> $1`,
        [studentRoleId, orderId]
    );
};

const canAccessOrder = async (user, orderId) => {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (result.rows.length === 0) return { ok: false, order: null };
    const order = result.rows[0];
    if (STAFF_ROLES.has(user.role) || Number(order.user_id) === Number(user.id)) {
        return { ok: true, order };
    }
    return { ok: false, order };
};

const createPayment = async (req, res) => {
    const client = await pool.connect();
    try {
        const { order_id, payment_system, amount, status, transaction_id } = req.body;
        if (!order_id || !amount) {
            return res.status(400).json({ error: 'order_id and amount are required' });
        }

        const access = await canAccessOrder(req.user, Number(order_id));
        if (!access.order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        if (!access.ok) {
            return res.status(403).json({ error: 'No access to this order' });
        }

        await client.query('BEGIN');
        const paymentResult = await client.query(
            `INSERT INTO payments (order_id, payment_system, amount, status, transaction_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [order_id, payment_system || 'manual', amount, status || 'pending', transaction_id || null]
        );

        const currentStatus = paymentResult.rows[0].status;
        if (['paid', 'completed', 'success'].includes(currentStatus)) {
            await client.query('UPDATE orders SET status = $1 WHERE id = $2', ['paid', order_id]);
            await promoteClientToStudentIfNeeded(client, order_id);
        }

        await client.query('COMMIT');
        res.status(201).json(paymentResult.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const listPayments = async (req, res) => {
    try {
        if (STAFF_ROLES.has(req.user.role)) {
            const result = await pool.query(
                `SELECT p.*, o.user_id, o.course_id
                 FROM payments p
                 JOIN orders o ON o.id = p.order_id
                 ORDER BY p.created_at DESC`
            );
            return res.json(result.rows);
        }

        const result = await pool.query(
            `SELECT p.*, o.user_id, o.course_id
             FROM payments p
             JOIN orders o ON o.id = p.order_id
             WHERE o.user_id = $1
             ORDER BY p.created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getPaymentById = async (req, res) => {
    try {
        const paymentId = Number(req.params.id);
        const result = await pool.query(
            `SELECT p.*, o.user_id, o.course_id
             FROM payments p
             JOIN orders o ON o.id = p.order_id
             WHERE p.id = $1`,
            [paymentId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const payment = result.rows[0];
        if (!STAFF_ROLES.has(req.user.role) && Number(payment.user_id) !== Number(req.user.id)) {
            return res.status(403).json({ error: 'No access to this payment' });
        }
        res.json(payment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updatePayment = async (req, res) => {
    const client = await pool.connect();
    try {
        const paymentId = Number(req.params.id);
        const { status, transaction_id, payment_system } = req.body;
        await client.query('BEGIN');
        const updated = await client.query(
            `UPDATE payments
             SET status = COALESCE($1, status),
                 transaction_id = COALESCE($2, transaction_id),
                 payment_system = COALESCE($3, payment_system)
             WHERE id = $4
             RETURNING *`,
            [status || null, transaction_id || null, payment_system || null, paymentId]
        );
        if (updated.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Payment not found' });
        }

        if (status && ['paid', 'completed', 'success'].includes(status)) {
            await client.query('UPDATE orders SET status = $1 WHERE id = $2', ['paid', updated.rows[0].order_id]);
            await promoteClientToStudentIfNeeded(client, updated.rows[0].order_id);
        }
        await client.query('COMMIT');
        res.json(updated.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

module.exports = {
    createPayment,
    listPayments,
    getPaymentById,
    updatePayment
};
