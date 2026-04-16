const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

const checksum = (content) => crypto.createHash('sha256').update(content).digest('hex');

const ensureMigrationsTable = async (pool) => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) UNIQUE NOT NULL,
            checksum VARCHAR(64) NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
};

const runMigrations = async (pool) => {
    await ensureMigrationsTable(pool);
    const files = (await fs.readdir(MIGRATIONS_DIR))
        .filter((name) => name.endsWith('.sql'))
        .sort();

    for (const filename of files) {
        const fullPath = path.join(MIGRATIONS_DIR, filename);
        const sql = await fs.readFile(fullPath, 'utf8');
        const digest = checksum(sql);
        const already = await pool.query('SELECT id, checksum FROM schema_migrations WHERE filename = $1', [filename]);
        if (already.rows.length > 0) {
            if (already.rows[0].checksum !== digest) {
                throw new Error(`Checksum mismatch for applied migration ${filename}`);
            }
            continue;
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query(
                'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
                [filename, digest]
            );
            await client.query('COMMIT');
            console.log(`Applied migration: ${filename}`);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = {
    MIGRATIONS_DIR,
    runMigrations
};
