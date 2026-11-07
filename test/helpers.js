import { DatabaseSync } from 'node:sqlite';
import { migrate } from '../src/lib/schema.js';

/** In-memory SQLite with the tiny subset of the better-sqlite3 API the services use. */
export function makeDb() {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  const db = {
    exec: (s) => raw.exec(s),
    prepare: (s) => raw.prepare(s),
    pragma: (s) => raw.exec('PRAGMA ' + s),
    transaction: (fn) => () => { raw.exec('BEGIN'); try { const r = fn(); raw.exec('COMMIT'); return r; } catch (e) { raw.exec('ROLLBACK'); throw e; } },
  };
  migrate(db);
  return db;
}
