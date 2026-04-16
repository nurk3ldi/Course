# Migration Strategy

The project now uses SQL-file migrations with checksum tracking.

## Apply migrations

```bash
npm run migrate
```

## How it works

1. SQL files from `server/migrations/*.sql` are sorted by filename.
2. Applied migrations are tracked in `schema_migrations`.
3. Checksum is validated to detect changed historical migrations.
4. Each migration runs in a transaction.

## Recommended workflow

1. Add a new SQL file with incremental prefix, for example:
   - `003_add_notifications.sql`
2. Keep previous migrations immutable.
3. Run `npm run migrate` on staging first, then production.
