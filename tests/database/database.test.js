import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { seedDatabase } from '../../src/database/seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, '../../src/database/schema.sql');

let db;

beforeAll(() => {
  // In-memory database for fast, isolated tests
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  const schema = readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
});

afterAll(() => {
  db.close();
});

describe('Schema', () => {
  it('creates all expected tables', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r) => r.name);

    expect(tables).toContain('restaurants');
    expect(tables).toContain('menu_categories');
    expect(tables).toContain('menu_items');
    expect(tables).toContain('customers');
    expect(tables).toContain('orders');
    expect(tables).toContain('order_items');
    expect(tables).toContain('conversation_sessions');
    expect(tables).toContain('processed_messages');
  });

  it('enforces foreign key constraints', () => {
    // Inserting a menu_category without a valid restaurant_id should fail
    expect(() => {
      db.prepare(
        'INSERT INTO menu_categories (restaurant_id, name) VALUES (999, "Ghost")'
      ).run();
    }).toThrow();
  });

  it('enforces order status CHECK constraint', () => {
    // Need a restaurant + customer first
    db.prepare(
      `INSERT OR IGNORE INTO restaurants (id, name, whatsapp_phone_number_id, owner_phone_number)
       VALUES (99, 'Test', 'TEST_PHONE', '+99000')`
    ).run();
    db.prepare(
      `INSERT OR IGNORE INTO customers (id, restaurant_id, whatsapp_number)
       VALUES (99, 99, '99000')`
    ).run();

    expect(() => {
      db.prepare(
        `INSERT INTO orders (restaurant_id, customer_id, order_number, status)
         VALUES (99, 99, 'T-001', 'invalid_status')`
      ).run();
    }).toThrow();
  });

  it('enforces order type CHECK constraint', () => {
    expect(() => {
      db.prepare(
        `INSERT INTO orders (restaurant_id, customer_id, order_number, order_type)
         VALUES (99, 99, 'T-002', 'teleport')`
      ).run();
    }).toThrow();
  });

  it('enforces unique customer per restaurant+phone', () => {
    db.prepare(
      `INSERT OR IGNORE INTO restaurants (id, name, whatsapp_phone_number_id, owner_phone_number)
       VALUES (98, 'UniqueTest', 'UNIQUE_TEST', '+98000')`
    ).run();
    db.prepare(
      `INSERT INTO customers (restaurant_id, whatsapp_number, name)
       VALUES (98, '94771111111', 'Alice')`
    ).run();

    expect(() => {
      db.prepare(
        `INSERT INTO customers (restaurant_id, whatsapp_number, name)
         VALUES (98, '94771111111', 'Duplicate Alice')`
      ).run();
    }).toThrow();
  });
});

describe('Seed data', () => {
  it('seeds Urban Bites restaurant', () => {
    const result = seedDatabase(db);

    expect(result.restaurant.name).toBe('Urban Bites');
    expect(result.categories).toBe(3);
    expect(result.items).toBe(8);
  });

  it('restaurant data is correct', () => {
    const restaurant = db
      .prepare('SELECT * FROM restaurants WHERE id = 1')
      .get();

    expect(restaurant.name).toBe('Urban Bites');
    expect(restaurant.currency).toBe('LKR');
    expect(restaurant.delivery_fee).toBe(300);
    expect(restaurant.order_prefix).toBe('UB');
    expect(restaurant.is_active).toBe(1);
  });

  it('has 3 active categories', () => {
    const categories = db
      .prepare('SELECT * FROM menu_categories WHERE restaurant_id = 1 AND is_active = 1 ORDER BY display_order')
      .all();

    expect(categories).toHaveLength(3);
    expect(categories[0].name).toBe('Burgers');
    expect(categories[1].name).toBe('Sides');
    expect(categories[2].name).toBe('Drinks');
  });

  it('has correct menu items with prices', () => {
    const items = db
      .prepare('SELECT * FROM menu_items WHERE restaurant_id = 1 ORDER BY id')
      .all();

    expect(items).toHaveLength(8);

    // Spot-check prices (stored as integers)
    const burger = items.find((i) => i.name === 'Classic Beef Burger');
    expect(burger.price).toBe(850);
    expect(burger.category_id).toBe(1);

    const fries = items.find((i) => i.name === 'French Fries');
    expect(fries.price).toBe(450);
    expect(fries.category_id).toBe(2);

    const milkshake = items.find((i) => i.name === 'Chocolate Milkshake');
    expect(milkshake.price).toBe(550);
    expect(milkshake.category_id).toBe(3);
  });

  it('categories have emojis', () => {
    const categories = db
      .prepare('SELECT * FROM menu_categories WHERE restaurant_id = 1 ORDER BY display_order')
      .all();

    expect(categories[0].emoji).toBe('🍔');
    expect(categories[1].emoji).toBe('🍟');
    expect(categories[2].emoji).toBe('🥤');
  });

  it('seed is idempotent (can run twice)', () => {
    // Running seed again should not throw or duplicate data
    expect(() => seedDatabase(db)).not.toThrow();

    const items = db
      .prepare('SELECT * FROM menu_items WHERE restaurant_id = 1')
      .all();
    expect(items).toHaveLength(8); // Not 16
  });
});
