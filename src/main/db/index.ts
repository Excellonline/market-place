import Database from 'better-sqlite3';
import { paths } from '../paths';
import { logger } from '../logger';
import { MIGRATIONS } from './migrations';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) throw new Error('DB not initialized — call initDb() first');
  return db;
}

export function initDb(dbPath: string = paths.db): Database.Database {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  runMigrations(db);
  return db;
}

function runMigrations(d: Database.Database): void {
  const log = logger();
  // Bootstrap schema_version table if it doesn't exist yet (it's the first table the migration creates,
  // but we want to read from it before knowing whether any migrations have run).
  d.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)');

  const currentRow = d.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as
    | { version: number }
    | undefined;
  const current = currentRow?.version ?? 0;

  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    log.info({ name: m.name, version: m.version }, 'running migration');
    d.exec('BEGIN');
    try {
      d.exec(m.sql);
      d.exec('COMMIT');
    } catch (err) {
      d.exec('ROLLBACK');
      throw err;
    }
  }
}

export function closeDb(): void {
  db?.close();
  db = null;
}
