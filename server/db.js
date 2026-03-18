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
        CREATE TABLE IF NOT EXISTS roles (
            id SERIAL PRIMARY KEY,
            role_name VARCHAR(50) UNIQUE NOT NULL,
            description TEXT
        );

        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role_id INT REFERENCES roles(id) ON DELETE SET NULL,
            phone VARCHAR(50),
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS courses (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            price DECIMAL(10, 2) DEFAULT 0.00,
            cover_image TEXT,
            author_id INT REFERENCES users(id) ON DELETE SET NULL,
            status VARCHAR(20) DEFAULT 'draft',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS modules (
            id SERIAL PRIMARY KEY,
            course_id INT REFERENCES courses(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            position INT DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS lessons (
            id SERIAL PRIMARY KEY,
            module_id INT REFERENCES modules(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            video_url TEXT,
            position INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS assignments (
            id SERIAL PRIMARY KEY,
            lesson_id INT REFERENCES lessons(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS student_assignments (
            id SERIAL PRIMARY KEY,
            assignment_id INT REFERENCES assignments(id) ON DELETE CASCADE,
            student_id INT REFERENCES users(id) ON DELETE CASCADE,
            file_url TEXT,
            text_answer TEXT,
            status VARCHAR(50) DEFAULT 'submitted',
            teacher_comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS files (
            id SERIAL PRIMARY KEY,
            uploaded_by INT REFERENCES users(id) ON DELETE SET NULL,
            file_path TEXT NOT NULL,
            file_type VARCHAR(50),
            size INT,
            related_entity VARCHAR(50),
            related_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(id) ON DELETE CASCADE,
            course_id INT REFERENCES courses(id) ON DELETE CASCADE,
            price DECIMAL(10, 2) NOT NULL,
            status VARCHAR(50) DEFAULT 'new',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS payments (
            id SERIAL PRIMARY KEY,
            order_id INT REFERENCES orders(id) ON DELETE CASCADE,
            payment_system VARCHAR(50),
            amount DECIMAL(10, 2) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            transaction_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS logs (
            id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(id) ON DELETE SET NULL,
            action VARCHAR(255) NOT NULL,
            entity VARCHAR(50),
            entity_id INT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ip_address VARCHAR(45)
        );
    `);

    // Қате осы жерде болған, енді дұрыс жазылды
    const roles = ['admin', 'employee', 'client', 'student'];
    for (const role of roles) {
        await pool.query(
            'INSERT INTO roles (role_name, description) VALUES ($1, $2) ON CONFLICT (role_name) DO NOTHING',
            [role, `Role for ${role}`] 
        );
    }

    const adminRoleRes = await pool.query("SELECT id FROM roles WHERE role_name = 'admin'");
    if (adminRoleRes.rows.length > 0) {
        const adminRoleId = adminRoleRes.rows[0].id;
        const adminCheck = await pool.query("SELECT * FROM users WHERE role_id = $1", [adminRoleId]);
        if (adminCheck.rows.length === 0) {
            const hashedPw = await bcrypt.hash('admin123', 10);
            await pool.query(
                "INSERT INTO users (name, email, password_hash, role_id, phone, status) VALUES ($1, $2, $3, $4, $5, $6)",
                ['Super Admin', 'admin@mail.com', hashedPw, adminRoleId, '+77770000000', 'active']
            );
        }
    }
};

module.exports = { pool, initDB };