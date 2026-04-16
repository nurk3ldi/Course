# Backup And Restore

## Daily backup

Run once:

```bash
npm run backup
```

Run as a long-running daily scheduler:

```bash
npm run backup:daily
```

Environment variables:

- `BACKUP_ROOT` default: `server/backups`
- `BACKUP_RETENTION_DAYS` default: `30`
- `BACKUP_HOUR_24` default: `3`
- `BACKUP_MINUTE` default: `0`

## Restore

```bash
npm run restore -- "server/backups/YYYYMMDD-HHMMSS"
```

Restore script attempts:

1. `db.sql` via `psql`
2. files from `files/` into `server/storage/private`

## Notes

- Database dump/restore uses PostgreSQL CLI tools (`pg_dump`, `psql`).
- Retention pruning removes backup folders older than configured days.
