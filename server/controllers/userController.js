const { pool } = require('../db');

const getAllUsers = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, email, role FROM users WHERE role = $1', ['client']);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getAllUsers };