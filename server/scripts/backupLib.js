const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');

const BACKUP_ROOT = process.env.BACKUP_ROOT || path.join(__dirname, '..', 'backups');
const STORAGE_ROOT = path.join(__dirname, '..', 'storage', 'private');

const formatTimestamp = (date = new Date()) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
};

const runCommand = (command, args, env = process.env) =>
    new Promise((resolve, reject) => {
        const child = spawn(command, args, { env, stdio: 'inherit' });
        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) return resolve();
            reject(new Error(`${command} exited with code ${code}`));
        });
    });

const ensureDir = async (dirPath) => {
    await fs.mkdir(dirPath, { recursive: true });
};

const runBackup = async () => {
    const ts = formatTimestamp();
    const backupDir = path.join(BACKUP_ROOT, ts);
    const dbFile = path.join(backupDir, 'db.sql');
    const filesDir = path.join(backupDir, 'files');

    await ensureDir(backupDir);

    const dbEnv = {
        ...process.env,
        PGPASSWORD: process.env.DB_PASSWORD || ''
    };

    let dbBackupStatus = 'ok';
    let dbBackupError = null;

    try {
        await runCommand('pg_dump', [
            '-h', process.env.DB_HOST || 'localhost',
            '-p', String(process.env.DB_PORT || '5432'),
            '-U', process.env.DB_USER || 'postgres',
            '-d', process.env.DB_NAME || 'postgres',
            '-f', dbFile
        ], dbEnv);
    } catch (error) {
        dbBackupStatus = 'failed';
        dbBackupError = error.message;
        await fs.writeFile(dbFile, '-- pg_dump failed. Please verify PostgreSQL client tools.\n', 'utf8');
    }

    try {
        await fs.cp(STORAGE_ROOT, filesDir, { recursive: true, force: true });
    } catch (_error) {
        await ensureDir(filesDir);
    }

    const manifest = {
        created_at: new Date().toISOString(),
        backup_dir: backupDir,
        db_backup_status: dbBackupStatus,
        db_backup_error: dbBackupError,
        db_file: dbFile,
        files_dir: filesDir
    };
    await fs.writeFile(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

    return manifest;
};

const pruneBackups = async (retentionDays = Number(process.env.BACKUP_RETENTION_DAYS || 30)) => {
    await ensureDir(BACKUP_ROOT);
    const entries = await fs.readdir(BACKUP_ROOT, { withFileTypes: true });
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const removed = [];

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const fullPath = path.join(BACKUP_ROOT, entry.name);
        const stat = await fs.stat(fullPath);
        if (stat.mtimeMs < cutoff) {
            await fs.rm(fullPath, { recursive: true, force: true });
            removed.push(fullPath);
        }
    }

    return removed;
};

module.exports = {
    BACKUP_ROOT,
    STORAGE_ROOT,
    runBackup,
    pruneBackups,
    runCommand
};
