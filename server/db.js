const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

const initDB = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            role VARCHAR(10) DEFAULT 'client',
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS courses (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT
        );
        CREATE TABLE IF NOT EXISTS videos (
            id SERIAL PRIMARY KEY,
            course_id INT REFERENCES courses(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            url TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS access (
            user_id INT REFERENCES users(id) ON DELETE CASCADE,
            course_id INT REFERENCES courses(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, course_id)
        );
    `);

    const adminCheck = await pool.query("SELECT * FROM users WHERE role = 'admin'");
    if (adminCheck.rows.length === 0) {
        const hashedPw = await bcrypt.hash('admin123', 10);
        await pool.query(
            "INSERT INTO users (email, password, role) VALUES ($1, $2, 'admin')",
            ['admin@mail.com', hashedPw]
        );
        console.log("Default admin created: admin@mail.com / admin123");
    }
};

module.exports = { pool, initDB };