import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { seedDatabase } from '../../src/database/seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, '../../src/database/schema.sql');

/**
 * Create a fresh in-memory database with schema and seed data.
 * Returns the database instance.
 *
 * Services accept a `db` parameter, so just pass this directly — no mocking needed.
 */
export function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  const schema = readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);

  seedDatabase(db);
  return db;
}
