import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { migrate } from './schema.js';

/** Single shared connection (survives Next.js dev hot-reloads). */
export function getDb() {
  if (!globalThis.__carwashDb) {
    const file = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'carwash.db');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = new Database(file);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
    globalThis.__carwashDb = db;
  }
  return globalThis.__carwashDb;
}

/** Run fn inside a transaction (works with better-sqlite3 and the test wrapper). */
export function tx(db, fn) { return db.transaction(fn)(); }
