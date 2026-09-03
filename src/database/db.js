import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, 'schema.sql');

let _db = null;

/**
 * Get or create the singleton database connection.
 * Uses WAL mode for better concurrent read performance.
 */
export function getDb(dbPath) {
  if (_db) return _db;

  const resolvedPath = resolve(dbPath || env.DB_PATH);

  // Ensure the directory exists
  const dbDir = dirname(resolvedPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    logger.info(`Created database directory: ${dbDir}`);
  }

  logger.info(`Opening database: ${resolvedPath}`);
  _db = new Database(resolvedPath);

  // Performance & safety pragmas
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('busy_timeout = 5000');

  return _db;
}

/**
 * Initialize the database schema from schema.sql.
 * Safe to call multiple times (uses IF NOT EXISTS).
 */
export function initializeSchema(db) {
  const schema = readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  logger.info('Database schema initialized');
}

/**
 * Initialize database: open connection + apply schema.
 * Call this at application startup.
 */
export function initializeDatabase(dbPath) {
  const db = getDb(dbPath);
  initializeSchema(db);
  return db;
}

/**
 * Close the database connection gracefully.
 * Call this on application shutdown.
 */
export function closeDatabase() {
  if (_db) {
    _db.close();
    _db = null;
    logger.info('Database connection closed');
  }
}

/**
 * Reset the singleton (for testing only).
 * Closes any existing connection and clears the reference.
 */
export function _resetDbSingleton() {
  closeDatabase();
}
