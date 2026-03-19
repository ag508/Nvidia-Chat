import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

const DB_PATH = path.join(process.cwd(), "data", "chat.db");

let db: Database.Database | null = null;

function ensureDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getDb(): Database.Database {
  if (db) return db;

  ensureDir();
  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent performance
  db.pragma("journal_mode = WAL");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      base_url TEXT NOT NULL,
      model_id TEXT NOT NULL,
      api_key TEXT NOT NULL DEFAULT '',
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New Chat',
      model_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      reasoning TEXT,
      attachments TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);

  // Migration: add attachments column if it doesn't exist (for existing DBs)
  try {
    db.exec(`ALTER TABLE messages ADD COLUMN attachments TEXT`);
  } catch {
    // column already exists — ignore
  }

  // Seed default NVIDIA model if none exist
  const countResult = db.prepare("SELECT COUNT(*) as c FROM models").get() as {
    c: number;
  };
  if (countResult.c === 0) {
    db.prepare(
      `INSERT INTO models (id, name, provider, base_url, model_id, api_key, is_default) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "nvidia-glm5",
      "GLM-5 (NVIDIA)",
      "NVIDIA",
      "https://integrate.api.nvidia.com/v1",
      "z-ai/glm5",
      "",
      1
    );
  }

  return db;
}

// persistDb is no longer needed since better-sqlite3 writes to disk automatically,
// but we keep the export for backward compatibility
export function persistDb() {
  // no-op — better-sqlite3 auto-persists
}
