import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb } from '../helpers/db.helper.js';
import {
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  calculateSubtotal,
  calculateTotal,
  validateCart,
  getCartSummary,
  isCartEmpty,
} from '../../src/services/cart.service.js';

let db;
const RESTAURANT_ID = 1;

beforeAll(() => {
  db = createTestDb();
});

afterAll(() => {
  db.close();
});

// Helper: create a mock item matching the DB seed
const burger = { id: 1, name: 'Classic Beef Burger', price: 850 };
const fries  = { id: 4, name: 'French Fries', price: 450 };
const coke   = { id: 6, name: 'Coca-Cola', price: 250 };

// ---------------------------------------------------------------------------
// addToCart
// ---------------------------------------------------------------------------
describe('addToCart', () => {
  it('adds a new item to an empty cart', () => {
    const cart = addToCart([], burger, 2);
    expect(cart).toHaveLength(1);
    expect(cart[0]).toEqual({ itemId: 1, name: 'Classic Beef Burger', price: 850, quantity: 2 });
  });

  it('increases quantity if item already in cart', () => {
    let cart = addToCart([], burger, 1);
    cart = addToCart(cart, burger, 2);
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(3);
  });

  it('adds different items separately', () => {
    let cart = addToCart([], burger, 1);
    cart = addToCart(cart, fries, 1);
    expect(cart).toHaveLength(2);
  });

  it('defaults quantity to 1', () => {
    const cart = addToCart([], coke);
    expect(cart[0].quantity).toBe(1);
  });

  it('rejects zero quantity', () => {
    expect(() => addToCart([], burger, 0)).toThrow('positive integer');
  });

  it('rejects negative quantity', () => {
    expect(() => addToCart([], burger, -1)).toThrow('positive integer');
  });

  it('rejects non-integer quantity', () => {
    expect(() => addToCart([], burger, 1.5)).toThrow('positive integer');
  });

  it('rejects quantity over 99', () => {
    expect(() => addToCart([], burger, 100)).toThrow('Maximum quantity');
  });

  it('rejects cumulative quantity over 99', () => {
    const cart = addToCart([], burger, 50);
    expect(() => addToCart(cart, burger, 50)).toThrow('Maximum quantity');
  });
});

// ---------------------------------------------------------------------------
// updateQuantity
// ---------------------------------------------------------------------------
describe('updateQuantity', () => {
  it('updates quantity of an existing item', () => {
    let cart = addToCart([], burger, 1);
    cart = updateQuantity(cart, 1, 5);
    expect(cart[0].quantity).toBe(5);
  });

  it('removes item when quantity set to 0', () => {
    let cart = addToCart([], burger, 2);
    cart = updateQuantity(cart, 1, 0);
    expect(cart).toHaveLength(0);
  });

  it('throws for item not in cart', () => {
    expect(() => updateQuantity([], 999, 1)).toThrow('not found in cart');
  });

  it('rejects negative quantity', () => {
    const cart = addToCart([], burger, 1);
    expect(() => updateQuantity(cart, 1, -1)).toThrow('non-negative integer');
  });

  it('rejects quantity over 99', () => {
    const cart = addToCart([], burger, 1);
    expect(() => updateQuantity(cart, 1, 100)).toThrow('Maximum quantity');
  });
});

// ---------------------------------------------------------------------------
// removeFromCart
// ---------------------------------------------------------------------------
describe('removeFromCart', () => {
  it('removes a specific item', () => {
    let cart = addToCart([], burger, 1);
    cart = addToCart(cart, fries, 1);
    cart = removeFromCart(cart, 1);
    expect(cart).toHaveLength(1);
    expect(cart[0].itemId).toBe(4);
  });

  it('returns same cart if item not found', () => {
    const cart = addToCart([], burger, 1);
    const result = removeFromCart(cart, 999);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// clearCart
// ---------------------------------------------------------------------------
describe('clearCart', () => {
  it('returns empty array', () => {
    expect(clearCart()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Calculations
// ---------------------------------------------------------------------------
describe('calculateSubtotal', () => {
  it('calculates subtotal correctly', () => {
    let cart = addToCart([], burger, 2);  // 850 × 2 = 1700
    cart = addToCart(cart, fries, 1);     // 450 × 1 = 450
    expect(calculateSubtotal(cart)).toBe(2150);
  });

  it('returns 0 for empty cart', () => {
    expect(calculateSubtotal([])).toBe(0);
  });
});

describe('calculateTotal', () => {
  it('adds delivery fee to subtotal', () => {
    let cart = addToCart([], burger, 2);  // 1700
    cart = addToCart(cart, fries, 1);     // 450
    // Subtotal: 2150 + delivery: 300 = 2450
    expect(calculateTotal(cart, 300)).toBe(2450);
  });

  it('works without delivery fee', () => {
    const cart = addToCart([], burger, 1);
    expect(calculateTotal(cart)).toBe(850);
  });
});

// ---------------------------------------------------------------------------
// validateCart (uses database)
// ---------------------------------------------------------------------------
describe('validateCart', () => {
  it('validates cart against database prices', () => {
    const cart = [
      { itemId: 1, name: 'Classic Beef Burger', price: 999, quantity: 2 },  // wrong price
      { itemId: 4, name: 'French Fries', price: 450, quantity: 1 },
    ];

    const result = validateCart(cart, RESTAURANT_ID, db);

    expect(result.validCart).toHaveLength(2);
    // Price should be corrected to DB value
    expect(result.validCart[0].price).toBe(850);
    expect(result.removedItems).toHaveLength(0);
    expect(result.subtotal).toBe(850 * 2 + 450); // 2150
  });

  it('removes unavailable items', () => {
    db.prepare('UPDATE menu_items SET is_available = 0 WHERE id = 1').run();

    const cart = [
      { itemId: 1, name: 'Classic Beef Burger', price: 850, quantity: 1 },
      { itemId: 4, name: 'French Fries', price: 450, quantity: 1 },
    ];

    const result = validateCart(cart, RESTAURANT_ID, db);

    expect(result.validCart).toHaveLength(1);
    expect(result.removedItems).toHaveLength(1);
    expect(result.removedItems[0].name).toBe('Classic Beef Burger');
    expect(result.subtotal).toBe(450);

    db.prepare('UPDATE menu_items SET is_available = 1 WHERE id = 1').run();
  });

  it('removes items from wrong restaurant', () => {
    const cart = [
      { itemId: 1, name: 'Classic Beef Burger', price: 850, quantity: 1 },
    ];

    const result = validateCart(cart, 999, db);

    expect(result.validCart).toHaveLength(0);
    expect(result.removedItems).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getCartSummary
// ---------------------------------------------------------------------------
describe('getCartSummary', () => {
  it('returns a display-friendly summary', () => {
    let cart = addToCart([], burger, 2);
    cart = addToCart(cart, fries, 1);

    const summary = getCartSummary(cart);

    expect(summary.items).toHaveLength(2);
    expect(summary.items[0].lineTotal).toBe(1700);
    expect(summary.items[1].lineTotal).toBe(450);
    expect(summary.itemCount).toBe(3);
    expect(summary.subtotal).toBe(2150);
  });
});

// ---------------------------------------------------------------------------
// isCartEmpty
// ---------------------------------------------------------------------------
describe('isCartEmpty', () => {
  it('returns true for empty array', () => {
    expect(isCartEmpty([])).toBe(true);
  });

  it('returns true for null/undefined', () => {
    expect(isCartEmpty(null)).toBe(true);
    expect(isCartEmpty(undefined)).toBe(true);
  });

  it('returns false for non-empty cart', () => {
    expect(isCartEmpty(addToCart([], burger))).toBe(false);
  });
});
