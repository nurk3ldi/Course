const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { pool } = require('../db');
const { runMigrations } = require('../services/migrationService');

const main = async () => {
    await runMigrations(pool);
    console.log('Migrations completed');
    await pool.end();
};

main().catch(async (error) => {
    console.error('Migration failed:', error.message);
    try {
        await pool.end();
    } catch (_e) {}
    process.exit(1);
});
