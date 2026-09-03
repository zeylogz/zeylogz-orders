import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb } from '../helpers/db.helper.js';
import {
  getRestaurantById,
  getRestaurantByPhoneNumberId,
  getAllActiveRestaurants,
  getNextOrderNumber,
} from '../../src/services/restaurant.service.js';

let db;

beforeAll(() => {
  db = createTestDb();
});

afterAll(() => {
  db.close();
});

describe('getRestaurantById', () => {
  it('returns the restaurant for a valid ID', () => {
    const restaurant = getRestaurantById(1, db);
    expect(restaurant).not.toBeNull();
    expect(restaurant.name).toBe('Urban Bites');
    expect(restaurant.currency).toBe('LKR');
    expect(restaurant.delivery_fee).toBe(300);
    expect(restaurant.order_prefix).toBe('UB');
  });

  it('returns null for a non-existent ID', () => {
    expect(getRestaurantById(999, db)).toBeNull();
  });

  it('returns null for an inactive restaurant', () => {
    db.prepare('UPDATE restaurants SET is_active = 0 WHERE id = 1').run();
    expect(getRestaurantById(1, db)).toBeNull();
    db.prepare('UPDATE restaurants SET is_active = 1 WHERE id = 1').run();
  });
});

describe('getRestaurantByPhoneNumberId', () => {
  it('returns the restaurant matching the WhatsApp phone number ID', () => {
    const restaurant = getRestaurantByPhoneNumberId('DEMO_PHONE_NUMBER_ID', db);
    expect(restaurant).not.toBeNull();
    expect(restaurant.name).toBe('Urban Bites');
  });

  it('returns null for unknown phone number ID', () => {
    expect(getRestaurantByPhoneNumberId('UNKNOWN', db)).toBeNull();
  });
});

describe('getAllActiveRestaurants', () => {
  it('returns all active restaurants', () => {
    const restaurants = getAllActiveRestaurants(db);
    expect(restaurants.length).toBeGreaterThanOrEqual(1);
    expect(restaurants[0].name).toBe('Urban Bites');
  });
});

describe('getNextOrderNumber', () => {
  it('returns first order number starting at 1001', () => {
    const orderNum = getNextOrderNumber(1, db);
    expect(orderNum).toBe('UB-1001');
  });

  it('increments after an order exists', () => {
    db.prepare(
      `INSERT OR IGNORE INTO customers (id, restaurant_id, whatsapp_number, name)
       VALUES (1, 1, '94771234567', 'Test')`
    ).run();
    db.prepare(
      `INSERT INTO orders (restaurant_id, customer_id, order_number, status, subtotal, total)
       VALUES (1, 1, 'UB-1001', 'pending', 850, 850)`
    ).run();

    expect(getNextOrderNumber(1, db)).toBe('UB-1002');
  });

  it('returns null for non-existent restaurant', () => {
    expect(getNextOrderNumber(999, db)).toBeNull();
  });
});
