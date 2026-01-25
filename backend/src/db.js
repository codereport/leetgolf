import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'leetgolf.db');

let db;

export async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      github_id INTEGER UNIQUE NOT NULL,
      username TEXT NOT NULL,
      name TEXT,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Add name column if it doesn't exist (migration for existing DBs)
  try {
    db.run('ALTER TABLE users ADD COLUMN name TEXT');
  } catch (e) {
    // Column already exists, ignore
  }
  
  saveDatabase();
  console.log('Database initialized');
  return db;
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
}

export function findUserByGithubId(githubId) {
  const stmt = db.prepare('SELECT * FROM users WHERE github_id = ?');
  stmt.bind([githubId]);
  
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export function createUser(githubId, username, name, avatarUrl) {
  // Check if user exists
  const existing = findUserByGithubId(githubId);
  
  if (existing) {
    // Update existing user
    db.run('UPDATE users SET username = ?, name = ?, avatar_url = ? WHERE github_id = ?', 
      [username, name, avatarUrl, githubId]);
    saveDatabase();
    return findUserByGithubId(githubId);
  }
  
  // Insert new user
  db.run('INSERT INTO users (github_id, username, name, avatar_url) VALUES (?, ?, ?, ?)',
    [githubId, username, name, avatarUrl]);
  saveDatabase();
  
  return findUserByGithubId(githubId);
}

export function findUserById(id) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  stmt.bind([id]);
  
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export { db };
