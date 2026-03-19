const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
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

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });

        const code = Math.floor(100000 + Math.random() * 900000).toString();

        await pool.query(
            `UPDATE users SET reset_code = $1, reset_expires = NOW() + INTERVAL '15 minutes' WHERE email = $2`,
            [code, email]
        );

        const transporter = nodemailer.createTransport({
            host: 'smtp.mail.ru',
            port: 465,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const emailHTML = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb; padding: 40px 20px;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center;">
                <h2 style="color: #111827; margin-top: 0; font-size: 24px;">TooOcenka LMS</h2>
                <p style="color: #4b5563; font-size: 16px; margin-bottom: 30px; line-height: 1.5;">
                    Вы запросили сброс пароля. Ваш код подтверждения:
                </p>
                
                <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                    <span style="font-size: 32px; font-weight: bold; color: #1d4ed8; letter-spacing: 6px;">${code}</span>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">
                    Введите этот 6-значный код на сайте, чтобы создать новый пароль. Код действителен 15 минут.
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                <p style="color: #9ca3af; font-size: 12px;">
                    Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо. Ваш аккаунт в безопасности.
                </p>
            </div>
        </div>
        `;

        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject: 'TooOcenka LMS: Код восстановления пароля',
            html: emailHTML 
        });

        res.json({ message: "Code sent successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        const userRes = await pool.query(
            `SELECT id FROM users WHERE email = $1 AND reset_code = $2 AND reset_expires > NOW()`,
            [email, code]
        );

        if (userRes.rows.length === 0) return res.status(400).json({ error: "Invalid or expired code" });

        const password_hash = await bcrypt.hash(newPassword, 10);

        await pool.query(
            `UPDATE users SET password_hash = $1, reset_code = NULL, reset_expires = NULL WHERE email = $2`,
            [password_hash, email]
        );

        res.json({ message: "Password reset successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { register, login, logout, forgotPassword, resetPassword };