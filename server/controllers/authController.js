const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { pool } = require('../db');

const register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // 1. Проверяем, не занят ли email
        const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "Пользователь с таким email уже существует" });
        }

        const password_hash = await bcrypt.hash(password, 10);
        
        // 2. Получаем ID роли по умолчанию (у тебя в базе 'client' или 'student')
        const roleRes = await pool.query("SELECT id, role_name FROM roles WHERE role_name = 'client' LIMIT 1");
        if (roleRes.rows.length === 0) return res.status(500).json({ error: "Роль по умолчанию не найдена в БД" });
        
        const role_id = roleRes.rows[0].id;
        const role_name = roleRes.rows[0].role_name;

        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, role_id, phone, status) 
             VALUES ($1, $2, $3, $4, $5, 'active') RETURNING id, name, email, phone, status, role_id`,
            [name || 'Student', email, password_hash, role_id, phone || '']
        );
        
        res.status(201).json({ 
            id: result.rows[0].id,
            name: result.rows[0].name, 
            email: result.rows[0].email, 
            phone: result.rows[0].phone,
            role_id: role_id,
            role: role_name
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Получаем юзера сразу с именем его роли
        const result = await pool.query(`
            SELECT u.id, u.name, u.email, u.password_hash, u.status, u.role_id, r.role_name 
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.email = $1
        `, [email]);

        if (result.rows.length === 0) return res.status(400).json({ error: "Пользователь не найден" });

        const user = result.rows[0];
        if (user.status !== 'active') return res.status(403).json({ error: "Аккаунт заблокирован" });

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return res.status(400).json({ error: "Неверный пароль" });

        // Генерируем токен, записывая туда ID и ID роли (по таблице roles)
        const token = jwt.sign(
            { id: user.id, role_id: user.role_id, role: user.role_name }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        // Возвращаем данные без хеша пароля
        res.json({ 
            token, 
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                role_id: user.role_id,
                role: user.role_name 
            } 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const logout = async (req, res) => {
    res.json({ message: "Выход выполнен успешно" });
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: "Email не найден" });

        const code = Math.floor(100000 + Math.random() * 900000).toString();

        await pool.query(
            `UPDATE users SET reset_code = $1, reset_expires = NOW() + INTERVAL '15 minutes' WHERE email = $2`,
            [code, email]
        );

        // Настройка почты (используем твои переменные окружения)
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
        <div style="font-family: sans-serif; padding: 20px;">
            <h2>Код восстановления пароля</h2>
            <p>Ваш код подтверждения: <strong style="font-size: 24px;">${code}</strong></p>
            <p>Код действителен 15 минут.</p>
        </div>
        `;

        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject: 'Восстановление пароля',
            html: emailHTML 
        });

        res.json({ message: "Код отправлен на почту" });
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

        if (userRes.rows.length === 0) return res.status(400).json({ error: "Неверный или просроченный код" });

        const password_hash = await bcrypt.hash(newPassword, 10);

        await pool.query(
            `UPDATE users SET password_hash = $1, reset_code = NULL, reset_expires = NULL WHERE email = $2`,
            [password_hash, email]
        );

        res.json({ message: "Пароль успешно изменен" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { register, login, logout, forgotPassword, resetPassword };