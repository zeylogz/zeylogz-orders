import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb } from '../helpers/db.helper.js';
import {
  getCategories,
  getCategoryById,
  getItemsByCategory,
  getItemById,
  getAvailableItem,
  getFullMenu,
} from '../../src/services/menu.service.js';

let db;
const RESTAURANT_ID = 1;

beforeAll(() => {
  db = createTestDb();
});

afterAll(() => {
  db.close();
});

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
describe('getCategories', () => {
  it('returns all active categories for the restaurant', () => {
    const categories = getCategories(RESTAURANT_ID, db);
    expect(categories).toHaveLength(3);
    expect(categories[0].name).toBe('Burgers');
    expect(categories[1].name).toBe('Sides');
    expect(categories[2].name).toBe('Drinks');
  });

  it('returns categories in display_order', () => {
    const categories = getCategories(RESTAURANT_ID, db);
    for (let i = 1; i < categories.length; i++) {
      expect(categories[i].display_order).toBeGreaterThanOrEqual(
        categories[i - 1].display_order
      );
    }
  });

  it('excludes inactive categories', () => {
    db.prepare('UPDATE menu_categories SET is_active = 0 WHERE id = 3').run();
    const categories = getCategories(RESTAURANT_ID, db);
    expect(categories).toHaveLength(2);
    expect(categories.find((c) => c.name === 'Drinks')).toBeUndefined();
    db.prepare('UPDATE menu_categories SET is_active = 1 WHERE id = 3').run();
  });

  it('returns empty array for non-existent restaurant', () => {
    expect(getCategories(999, db)).toEqual([]);
  });
});

describe('getCategoryById', () => {
  it('returns category when valid', () => {
    const cat = getCategoryById(RESTAURANT_ID, 1, db);
    expect(cat).not.toBeNull();
    expect(cat.name).toBe('Burgers');
    expect(cat.emoji).toBe('🍔');
  });

  it('returns null for wrong restaurant', () => {
    expect(getCategoryById(999, 1, db)).toBeNull();
  });

  it('returns null for non-existent category', () => {
    expect(getCategoryById(RESTAURANT_ID, 999, db)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------
describe('getItemsByCategory', () => {
  it('returns all available items in a category', () => {
    const items = getItemsByCategory(RESTAURANT_ID, 1, db); // Burgers
    expect(items).toHaveLength(3);
    expect(items[0].name).toBe('Classic Beef Burger');
    expect(items[0].price).toBe(850);
  });

  it('excludes unavailable items', () => {
    db.prepare('UPDATE menu_items SET is_available = 0 WHERE id = 1').run();
    const items = getItemsByCategory(RESTAURANT_ID, 1, db);
    expect(items).toHaveLength(2);
    expect(items.find((i) => i.name === 'Classic Beef Burger')).toBeUndefined();
    db.prepare('UPDATE menu_items SET is_available = 1 WHERE id = 1').run();
  });

  it('returns items in display_order', () => {
    const items = getItemsByCategory(RESTAURANT_ID, 1, db);
    for (let i = 1; i < items.length; i++) {
      expect(items[i].display_order).toBeGreaterThanOrEqual(
        items[i - 1].display_order
      );
    }
  });

  it('returns empty for non-existent category', () => {
    expect(getItemsByCategory(RESTAURANT_ID, 999, db)).toEqual([]);
  });
});

describe('getItemById', () => {
  it('returns item with category name', () => {
    const item = getItemById(RESTAURANT_ID, 1, db);
    expect(item).not.toBeNull();
    expect(item.name).toBe('Classic Beef Burger');
    expect(item.price).toBe(850);
    expect(item.category_name).toBe('Burgers');
  });

  it('returns null for wrong restaurant', () => {
    expect(getItemById(999, 1, db)).toBeNull();
  });

  it('returns item even if unavailable (for admin views)', () => {
    db.prepare('UPDATE menu_items SET is_available = 0 WHERE id = 1').run();
    const item = getItemById(RESTAURANT_ID, 1, db);
    expect(item).not.toBeNull();
    expect(item.is_available).toBe(0);
    db.prepare('UPDATE menu_items SET is_available = 1 WHERE id = 1').run();
  });
});

describe('getAvailableItem', () => {
  it('returns available item', () => {
    const item = getAvailableItem(RESTAURANT_ID, 4, db); // French Fries
    expect(item).not.toBeNull();
    expect(item.name).toBe('French Fries');
    expect(item.price).toBe(450);
  });

  it('returns null for unavailable item', () => {
    db.prepare('UPDATE menu_items SET is_available = 0 WHERE id = 4').run();
    expect(getAvailableItem(RESTAURANT_ID, 4, db)).toBeNull();
    db.prepare('UPDATE menu_items SET is_available = 1 WHERE id = 4').run();
  });

  it('returns null for wrong restaurant', () => {
    expect(getAvailableItem(999, 4, db)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Full menu
// ---------------------------------------------------------------------------
describe('getFullMenu', () => {
  it('returns categories with nested items', () => {
    const menu = getFullMenu(RESTAURANT_ID, db);
    expect(menu).toHaveLength(3);

    expect(menu[0].name).toBe('Burgers');
    expect(menu[0].items).toHaveLength(3);
    expect(menu[0].items[0].name).toBe('Classic Beef Burger');

    expect(menu[1].name).toBe('Sides');
    expect(menu[1].items).toHaveLength(2);

    expect(menu[2].name).toBe('Drinks');
    expect(menu[2].items).toHaveLength(3);
  });

  it('returns empty array for non-existent restaurant', () => {
    expect(getFullMenu(999, db)).toEqual([]);
  });
});
