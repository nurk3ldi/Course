const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        const password_hash = await bcrypt.hash(password, 10);
        
        const roleRes = await pool.query("SELECT id FROM roles WHERE role_name = 'client'");
        const role_id = roleRes.rows[0].id;

        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, role_id, phone, status) 
             VALUES ($1, $2, $3, $4, $5, 'active') RETURNING id, name, email, phone, status`,
            [name || 'Student', email, password_hash, role_id, phone || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query(`
            SELECT u.*, r.role_name 
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.email = $1
        `, [email]);

        if (result.rows.length === 0) return res.status(400).json({ error: "User not found" });

        const user = result.rows[0];
        if (user.status !== 'active') return res.status(403).json({ error: "Account blocked" });

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return res.status(400).json({ error: "Invalid password" });

        const token = jwt.sign({ id: user.id, role: user.role_name }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role_name } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const logout = async (req, res) => {
    res.json({ message: "Logged out successfully" });
};

module.exports = { register, login, logout };