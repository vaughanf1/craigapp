import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { env } from './env.ts'

let db: DatabaseSync | null = null

export function getDb(): DatabaseSync {
  if (db) return db
  db = openDb(env.dbPath)
  return db
}

/** Open (or create) a database and apply the schema. Exported for tests. */
export function openDb(path: string): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const d = new DatabaseSync(path)
  d.exec('PRAGMA journal_mode = WAL')
  d.exec('PRAGMA foreign_keys = ON')
  d.exec(SCHEMA)
  return d
}

export function useDb(d: DatabaseSync) {
  db = d
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  profile_json TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS otps (
  phone TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS check_ins (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  went_well INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, date)
);
CREATE TABLE IF NOT EXISTS food_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  calories INTEGER NOT NULL,
  kind TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS food_log_user_ts ON food_log(user_id, ts);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,          -- 'user' | 'coach'
  text TEXT NOT NULL,
  channel TEXT NOT NULL,       -- 'chat' | 'call' | 'brief'
  ts INTEGER NOT NULL,
  memorised INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS messages_user_ts ON messages(user_id, ts);
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,          -- fact | preference | pattern | event | win | struggle
  text TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 2,
  source TEXT NOT NULL DEFAULT 'chat',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS memories_user ON memories(user_id, archived);
CREATE TABLE IF NOT EXISTS intake (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  answer TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, field)
);
CREATE TABLE IF NOT EXISTS day_summaries (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  summary TEXT NOT NULL,
  mood TEXT NOT NULL DEFAULT '',
  wins TEXT NOT NULL DEFAULT '',
  struggles TEXT NOT NULL DEFAULT '',
  tomorrow_focus TEXT NOT NULL DEFAULT '',
  calories_in INTEGER,
  calories_target INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, date)
);
CREATE TABLE IF NOT EXISTS weigh_ins (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  kg REAL NOT NULL,
  PRIMARY KEY (user_id, date)
);
CREATE TABLE IF NOT EXISTS action_log (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  action_id TEXT NOT NULL,
  done INTEGER NOT NULL,
  PRIMARY KEY (user_id, date, action_id)
);
CREATE TABLE IF NOT EXISTS warmaps (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',   -- building | ready | failed
  progress TEXT NOT NULL DEFAULT '',      -- what the builder is doing right now
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phase_id TEXT,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  due TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  effort TEXT NOT NULL DEFAULT 'M',
  source TEXT NOT NULL DEFAULT 'plan',
  created_at INTEGER NOT NULL,
  done_at INTEGER
);
CREATE INDEX IF NOT EXISTS tasks_user ON tasks(user_id, status);
CREATE TABLE IF NOT EXISTS plan_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,            -- user's local date the review ran
  trigger TEXT NOT NULL,         -- weekly | behind | manual
  decision TEXT NOT NULL,        -- keep | adjust
  reason TEXT NOT NULL,
  coach_note TEXT NOT NULL,      -- what the coach says about it on the next call
  changes_json TEXT NOT NULL,    -- list of human-readable changes
  explained INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, date)
);
CREATE TABLE IF NOT EXISTS schedules (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  times_json TEXT NOT NULL DEFAULT '["09:00","19:00"]',
  channels_json TEXT NOT NULL DEFAULT '["push","call"]',
  enabled INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  keys_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,          -- user's local date
  slot TEXT NOT NULL,          -- HH:MM local, or 'manual'
  kind TEXT NOT NULL,          -- morning | evening | manual
  brief TEXT NOT NULL,
  channels_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | sent | answered | missed | failed
  call_sid TEXT,
  created_at INTEGER NOT NULL,
  answered_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS deliveries_slot ON deliveries(user_id, date, slot) WHERE slot != 'manual';
`
