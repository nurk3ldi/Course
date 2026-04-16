const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { pruneBackups } = require('./backupLib');

const main = async () => {
    const removed = await pruneBackups();
    console.log(`Removed ${removed.length} backup directories`);
};

main().catch((error) => {
    console.error('Prune failed:', error.message);
    process.exit(1);
});
