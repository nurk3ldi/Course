const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { runBackup, pruneBackups } = require('./backupLib');

const main = async () => {
    const manifest = await runBackup();
    const removed = await pruneBackups();
    console.log('Backup completed:', manifest.backup_dir);
    if (manifest.db_backup_status !== 'ok') {
        console.warn('Database backup warning:', manifest.db_backup_error);
    }
    if (removed.length > 0) {
        console.log('Pruned backups:', removed.length);
    }
};

main().catch((error) => {
    console.error('Backup failed:', error.message);
    process.exit(1);
});
