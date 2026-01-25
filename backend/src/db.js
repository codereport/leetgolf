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
  
  // Submissions table - stores successful solutions
  // Check if table exists and has correct schema
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        problem_slug TEXT NOT NULL,
        language TEXT NOT NULL,
        solution TEXT NOT NULL,
        char_count INTEGER NOT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, problem_slug, language, solution)
      )
    `);
  } catch (e) {
    // If table exists with wrong schema, drop and recreate
    console.log('Recreating submissions table with correct schema...');
    db.run('DROP TABLE IF EXISTS submissions');
    db.run(`
      CREATE TABLE submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        problem_slug TEXT NOT NULL,
        language TEXT NOT NULL,
        solution TEXT NOT NULL,
        char_count INTEGER NOT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, problem_slug, language, solution)
      )
    `);
  }
  
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

// ============================================================================
// Submissions
// ============================================================================

/**
 * Save a successful submission
 * If same solution already exists for this user/problem/language, ignore
 * @returns {object|null} The submission if new, null if duplicate
 */
export function saveSubmission(userId, problemSlug, language, solution, charCount) {
  // Check if this exact solution already exists
  const checkStmt = db.prepare(
    'SELECT id FROM submissions WHERE user_id = ? AND problem_slug = ? AND language = ? AND solution = ?'
  );
  checkStmt.bind([userId, problemSlug, language, solution]);
  
  if (checkStmt.step()) {
    // Duplicate solution - ignore
    checkStmt.free();
    return null;
  }
  checkStmt.free();
  
  // Insert new submission
  db.run(
    'INSERT INTO submissions (user_id, problem_slug, language, solution, char_count) VALUES (?, ?, ?, ?, ?)',
    [userId, problemSlug, language, solution, charCount]
  );
  saveDatabase();
  
  // Return the new submission
  const stmt = db.prepare('SELECT * FROM submissions WHERE id = last_insert_rowid()');
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

/**
 * Check if user has solved a problem (any language)
 */
export function hasUserSolvedProblem(userId, problemSlug) {
  const stmt = db.prepare(
    'SELECT COUNT(*) as count FROM submissions WHERE user_id = ? AND problem_slug = ?'
  );
  stmt.bind([userId, problemSlug]);
  
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row.count > 0;
  }
  stmt.free();
  return false;
}

/**
 * Get user's best submission for a problem/language
 */
export function getUserBestSubmission(userId, problemSlug, language) {
  const stmt = db.prepare(
    `SELECT * FROM submissions 
     WHERE user_id = ? AND problem_slug = ? AND language = ?
     ORDER BY char_count ASC, submitted_at ASC
     LIMIT 1`
  );
  stmt.bind([userId, problemSlug, language]);
  
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

/**
 * Get leaderboard for a problem - all solutions from all users
 * Ranked by char_count ascending
 */
export function getLeaderboard(problemSlug) {
  // Get all solutions, ordered by char count
  const stmt = db.prepare(`
    SELECT 
      s.id,
      s.user_id,
      s.language,
      s.solution,
      s.char_count,
      s.submitted_at,
      u.username,
      u.avatar_url
    FROM submissions s
    JOIN users u ON s.user_id = u.id
    WHERE s.problem_slug = ?
    ORDER BY s.char_count ASC, s.submitted_at ASC
  `);
  stmt.bind([problemSlug]);
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Get all of a user's submissions for a problem
 */
export function getUserSubmissions(userId, problemSlug) {
  const stmt = db.prepare(
    `SELECT * FROM submissions 
     WHERE user_id = ? AND problem_slug = ?
     ORDER BY language, char_count ASC`
  );
  stmt.bind([userId, problemSlug]);
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Get user stats: problems solved count and total submissions count
 */
export function getUserStats(userId) {
  // Count distinct problems solved
  const problemsStmt = db.prepare(
    'SELECT COUNT(DISTINCT problem_slug) as problems_solved FROM submissions WHERE user_id = ?'
  );
  problemsStmt.bind([userId]);
  let problemsSolved = 0;
  if (problemsStmt.step()) {
    problemsSolved = problemsStmt.getAsObject().problems_solved;
  }
  problemsStmt.free();
  
  // Count total submissions
  const submissionsStmt = db.prepare(
    'SELECT COUNT(*) as total_submissions FROM submissions WHERE user_id = ?'
  );
  submissionsStmt.bind([userId]);
  let totalSubmissions = 0;
  if (submissionsStmt.step()) {
    totalSubmissions = submissionsStmt.getAsObject().total_submissions;
  }
  submissionsStmt.free();
  
  return {
    problemsSolved,
    totalSubmissions
  };
}

export { db };
