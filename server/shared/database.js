import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openDatabase(file = './data/lobby.sqlite') {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS schema_version(version INTEGER PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('student','faculty','admin','security')),
      department TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', affiliation TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, filename TEXT NOT NULL, created_by INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL CHECK(status IN ('Review','Approved')), rows_json TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS codes (
      id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, visitor_id INTEGER NOT NULL REFERENCES visitors(id),
      creator_id INTEGER NOT NULL REFERENCES users(id), host TEXT NOT NULL, purpose TEXT NOT NULL,
      valid_from TEXT NOT NULL, valid_to TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
      CHECK(valid_to > valid_from)
    );
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY, visitor_id INTEGER NOT NULL REFERENCES visitors(id), requester_id INTEGER NOT NULL REFERENCES users(id),
      host TEXT NOT NULL, purpose TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Pending','Approved','Rejected','Lapsed')),
      source TEXT NOT NULL CHECK(source IN ('request','direct','group','code')), group_id INTEGER REFERENCES groups(id),
      code_id INTEGER REFERENCES codes(id), remarks TEXT NOT NULL DEFAULT '', decided_by INTEGER REFERENCES users(id),
      decided_at TEXT, created_at TEXT NOT NULL, CHECK(ends_at > starts_at)
    );
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY, request_id INTEGER NOT NULL UNIQUE REFERENCES requests(id), visitor_id INTEGER NOT NULL REFERENCES visitors(id),
      entry_at TEXT NOT NULL, exit_at TEXT, permitted_end TEXT NOT NULL, overstay INTEGER NOT NULL DEFAULT 0,
      entered_by INTEGER NOT NULL REFERENCES users(id), exited_by INTEGER REFERENCES users(id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_visit_per_visitor ON visits(visitor_id) WHERE exit_at IS NULL;
    CREATE INDEX IF NOT EXISTS visitor_name ON visitors(name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS visitor_phone ON visitors(phone);
    CREATE INDEX IF NOT EXISTS request_dates ON requests(starts_at,ends_at);
    CREATE INDEX IF NOT EXISTS request_owner ON requests(requester_id,status);
    CREATE INDEX IF NOT EXISTS active_visits ON visits(exit_at,permitted_end);
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), event_key TEXT NOT NULL,
      title TEXT NOT NULL, message TEXT NOT NULL, request_id INTEGER REFERENCES requests(id), created_at TEXT NOT NULL,
      read_at TEXT, UNIQUE(user_id,event_key)
    );
    CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY, event_key TEXT NOT NULL UNIQUE, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
      visit_id INTEGER REFERENCES visits(id), status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT, created_at TEXT NOT NULL, sent_at TEXT
    );
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY, actor_id INTEGER REFERENCES users(id), action TEXT NOT NULL, entity TEXT NOT NULL,
      entity_id INTEGER, details TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
    );
    INSERT OR IGNORE INTO schema_version VALUES(1);
  `);
  if (!db.prepare('SELECT version FROM schema_version WHERE version=2').get()) {
    transaction(db, () => {
      db.exec("ALTER TABLE visitors ADD COLUMN relation TEXT NOT NULL DEFAULT ''; ALTER TABLE visitors ADD COLUMN id_proof TEXT NOT NULL DEFAULT ''; INSERT INTO schema_version VALUES(2);");
    });
  }
  return db;
}

export function transaction(db, work) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = work(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}

export const one = (db, sql, ...args) => db.prepare(sql).get(...args);
export const all = (db, sql, ...args) => db.prepare(sql).all(...args);
export const run = (db, sql, ...args) => db.prepare(sql).run(...args);
export function audit(ctx, user, action, entity, id, details = {}) {
  run(ctx.db, 'INSERT INTO audit(actor_id,action,entity,entity_id,details,created_at) VALUES(?,?,?,?,?,?)', user?.id ?? null, action, entity, id ?? null, JSON.stringify(details), ctx.now());
}
