const { pool } = require('../db');

const getAllUsers = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.name, u.email, u.phone, r.role_name 
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE r.role_name IN ('client', 'student')
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getAllUsers };