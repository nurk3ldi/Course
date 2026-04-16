const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { runBackup, pruneBackups } = require('./backupLib');

const backupHour = Number(process.env.BACKUP_HOUR_24 || 3);
const backupMinute = Number(process.env.BACKUP_MINUTE || 0);

const runCycle = async () => {
    const manifest = await runBackup();
    await pruneBackups();
    console.log(`[backup] done at ${new Date().toISOString()} -> ${manifest.backup_dir}`);
};

const msUntilNextRun = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(backupHour, backupMinute, 0, 0);
    if (next <= now) {
        next.setDate(next.getDate() + 1);
    }
    return next.getTime() - now.getTime();
};

const start = () => {
    const delay = msUntilNextRun();
    console.log(`[backup] first run in ${Math.round(delay / 1000)}s`);
    setTimeout(async () => {
        try {
            await runCycle();
        } catch (error) {
            console.error('[backup] cycle error:', error.message);
        }

        setInterval(async () => {
            try {
                await runCycle();
            } catch (error) {
                console.error('[backup] cycle error:', error.message);
            }
        }, 24 * 60 * 60 * 1000);
    }, delay);
};

start();
