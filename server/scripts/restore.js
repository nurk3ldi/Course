const fs = require('fs/promises');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { STORAGE_ROOT, runCommand } = require('./backupLib');

const ensureDir = async (dirPath) => {
    await fs.mkdir(dirPath, { recursive: true });
};

const main = async () => {
    const backupDir = process.argv[2];
    if (!backupDir) {
        throw new Error('Usage: node scripts/restore.js <backup_dir>');
    }

    const resolvedBackupDir = path.resolve(backupDir);
    const dbFile = path.join(resolvedBackupDir, 'db.sql');
    const filesDir = path.join(resolvedBackupDir, 'files');

    const dbEnv = {
        ...process.env,
        PGPASSWORD: process.env.DB_PASSWORD || ''
    };

    try {
        await fs.access(dbFile);
        await runCommand('psql', [
            '-h', process.env.DB_HOST || 'localhost',
            '-p', String(process.env.DB_PORT || '5432'),
            '-U', process.env.DB_USER || 'postgres',
            '-d', process.env.DB_NAME || 'postgres',
            '-f', dbFile
        ], dbEnv);
        console.log('Database restored from:', dbFile);
    } catch (error) {
        console.warn('Database restore skipped:', error.message);
    }

    try {
        await fs.access(filesDir);
        await ensureDir(STORAGE_ROOT);
        await fs.cp(filesDir, STORAGE_ROOT, { recursive: true, force: true });
        console.log('Files restored from:', filesDir);
    } catch (error) {
        console.warn('Files restore skipped:', error.message);
    }
};

main().catch((error) => {
    console.error('Restore failed:', error.message);
    process.exit(1);
});
