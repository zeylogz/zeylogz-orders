import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb } from '../helpers/db.helper.js';
import {
  findOrCreateCustomer,
  createOrder,
  getOrderById,
  getOrderByNumber,
  updateOrderStatus,
  getRecentOrders,
} from '../../src/services/order.service.js';

let db;
const RESTAURANT_ID = 1;

beforeAll(() => {
  db = createTestDb();
});

afterAll(() => {
  db.close();
});

// ---------------------------------------------------------------------------
// findOrCreateCustomer
// ---------------------------------------------------------------------------
describe('findOrCreateCustomer', () => {
  it('creates a new customer', () => {
    const customer = findOrCreateCustomer(RESTAURANT_ID, '94771111111', 'Alice', db);
    expect(customer.id).toBeDefined();
    expect(customer.whatsapp_number).toBe('94771111111');
    expect(customer.name).toBe('Alice');
  });

  it('finds existing customer on second call', () => {
    const c1 = findOrCreateCustomer(RESTAURANT_ID, '94772222222', 'Bob', db);
    const c2 = findOrCreateCustomer(RESTAURANT_ID, '94772222222', 'Bob', db);
    expect(c2.id).toBe(c1.id);
  });

  it('updates name if different', () => {
    findOrCreateCustomer(RESTAURANT_ID, '94773333333', 'Charlie', db);
    const updated = findOrCreateCustomer(RESTAURANT_ID, '94773333333', 'Charles', db);
    expect(updated.name).toBe('Charles');
  });

  it('creates separate customers per restaurant', () => {
    // Insert second restaurant for isolation test
    db.prepare(`
      INSERT OR IGNORE INTO restaurants (id, name, whatsapp_phone_number_id, owner_phone_number)
      VALUES (2, 'Test Restaurant 2', 'PHONE_2', '+94770000001')
    `).run();

    const c1 = findOrCreateCustomer(1, '94774444444', 'Same Phone', db);
    const c2 = findOrCreateCustomer(2, '94774444444', 'Same Phone', db);
    expect(c1.id).not.toBe(c2.id);
  });
});

// ---------------------------------------------------------------------------
// createOrder
// ---------------------------------------------------------------------------
describe('createOrder', () => {
  let customerId;

  beforeAll(() => {
    const customer = findOrCreateCustomer(RESTAURANT_ID, '94775555555', 'OrderTest', db);
    customerId = customer.id;
  });

  it('creates a pickup order', () => {
    const result = createOrder({
      restaurantId: RESTAURANT_ID,
      customerId,
      customerName: 'OrderTest',
      cart: [
        { itemId: 1, name: 'Classic Beef Burger', price: 850, quantity: 2 },
        { itemId: 4, name: 'French Fries', price: 450, quantity: 1 },
      ],
      orderType: 'pickup',
    }, db);

    expect(result.orderNumber).toBe('UB-1001');
    expect(result.subtotal).toBe(2150);
    expect(result.deliveryFee).toBe(0);
    expect(result.total).toBe(2150);
    expect(result.items).toHaveLength(2);
    expect(result.paymentMethod).toBe('cod');
    expect(result.paymentStatus).toBe('unpaid');
    expect(result.status).toBe('pending');
  });

  it('creates a delivery order with delivery fee', () => {
    const result = createOrder({
      restaurantId: RESTAURANT_ID,
      customerId,
      customerName: 'OrderTest',
      cart: [
        { itemId: 6, name: 'Coca-Cola', price: 250, quantity: 2 },
      ],
      orderType: 'delivery',
      deliveryAddress: '42 Galle Road, Colombo',
    }, db);

    expect(result.orderNumber).toBe('UB-1002');
    expect(result.subtotal).toBe(500);
    expect(result.deliveryFee).toBe(300);
    expect(result.total).toBe(800);
    expect(result.deliveryAddress).toBe('42 Galle Road, Colombo');
  });

  it('increments order numbers sequentially', () => {
    const r1 = createOrder({
      restaurantId: RESTAURANT_ID,
      customerId,
      customerName: 'Test',
      cart: [{ itemId: 1, name: 'Burger', price: 850, quantity: 1 }],
      orderType: 'pickup',
    }, db);

    expect(r1.orderNumber).toBe('UB-1003');
  });

  it('creates an order with LankaQR payment method', () => {
    const result = createOrder({
      restaurantId: RESTAURANT_ID,
      customerId,
      customerName: 'OrderTest',
      cart: [
        { itemId: 1, name: 'Classic Beef Burger', price: 850, quantity: 1 },
      ],
      orderType: 'pickup',
      paymentMethod: 'lankaqr',
    }, db);

    expect(result.paymentMethod).toBe('lankaqr');
    expect(result.paymentStatus).toBe('unpaid');

    const saved = getOrderById(result.orderId, RESTAURANT_ID, db);
    expect(saved.payment_method).toBe('lankaqr');
    expect(saved.payment_status).toBe('unpaid');
  });


  it('preserves historical prices in order_items', () => {
    const result = createOrder({
      restaurantId: RESTAURANT_ID,
      customerId,
      customerName: 'Test',
      cart: [{ itemId: 1, name: 'Classic Beef Burger', price: 850, quantity: 1 }],
      orderType: 'pickup',
    }, db);

    // Change the menu price
    db.prepare('UPDATE menu_items SET price = 999 WHERE id = 1').run();

    // Order item should still have the original price
    const order = getOrderById(result.orderId, RESTAURANT_ID, db);
    expect(order.items[0].unit_price).toBe(850);

    // Restore price
    db.prepare('UPDATE menu_items SET price = 850 WHERE id = 1').run();
  });

  it('corrects tampered prices using DB values', () => {
    const result = createOrder({
      restaurantId: RESTAURANT_ID,
      customerId,
      customerName: 'Test',
      cart: [{ itemId: 1, name: 'Classic Beef Burger', price: 1, quantity: 1 }], // Tampered!
      orderType: 'pickup',
    }, db);

    expect(result.subtotal).toBe(850); // Should use DB price, not 1
  });

  it('throws if cart is empty', () => {
    expect(() => {
      createOrder({
        restaurantId: RESTAURANT_ID,
        customerId,
        customerName: 'Test',
        cart: [],
        orderType: 'pickup',
      }, db);
    }).toThrow('Cart is empty');
  });

  it('throws if all items are unavailable', () => {
    db.prepare('UPDATE menu_items SET is_available = 0 WHERE id = 8').run();

    expect(() => {
      createOrder({
        restaurantId: RESTAURANT_ID,
        customerId,
        customerName: 'Test',
        cart: [{ itemId: 8, name: 'Chocolate Milkshake', price: 550, quantity: 1 }],
        orderType: 'pickup',
      }, db);
    }).toThrow('empty or all items are unavailable');

    db.prepare('UPDATE menu_items SET is_available = 1 WHERE id = 8').run();
  });

  it('includes notes', () => {
    const result = createOrder({
      restaurantId: RESTAURANT_ID,
      customerId,
      customerName: 'Test',
      cart: [{ itemId: 1, name: 'Burger', price: 850, quantity: 1 }],
      orderType: 'pickup',
      notes: 'No onions please',
    }, db);

    expect(result.notes).toBe('No onions please');

    const order = getOrderById(result.orderId, RESTAURANT_ID, db);
    expect(order.notes).toBe('No onions please');
  });
});

// ---------------------------------------------------------------------------
// getOrderByNumber
// ---------------------------------------------------------------------------
describe('getOrderByNumber', () => {
  it('retrieves order by human-friendly number', () => {
    const order = getOrderByNumber('UB-1001', RESTAURANT_ID, db);
    expect(order).not.toBeNull();
    expect(order.order_number).toBe('UB-1001');
    expect(order.items.length).toBeGreaterThan(0);
  });

  it('returns null for wrong restaurant', () => {
    expect(getOrderByNumber('UB-1001', 999, db)).toBeNull();
  });

  it('returns null for non-existent order', () => {
    expect(getOrderByNumber('UB-9999', RESTAURANT_ID, db)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateOrderStatus
// ---------------------------------------------------------------------------
describe('updateOrderStatus', () => {
  it('updates order status', () => {
    const order = getOrderByNumber('UB-1001', RESTAURANT_ID, db);
    const updated = updateOrderStatus(order.id, RESTAURANT_ID, 'confirmed', db);
    expect(updated).toBe(true);

    const refreshed = getOrderById(order.id, RESTAURANT_ID, db);
    expect(refreshed.status).toBe('confirmed');
  });

  it('rejects invalid status', () => {
    expect(() => {
      updateOrderStatus(1, RESTAURANT_ID, 'invalid', db);
    }).toThrow('Invalid status');
  });

  it('returns false for wrong restaurant', () => {
    expect(updateOrderStatus(1, 999, 'confirmed', db)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getRecentOrders
// ---------------------------------------------------------------------------
describe('getRecentOrders', () => {
  it('returns recent orders with customer phone', () => {
    const orders = getRecentOrders(RESTAURANT_ID, 10, db);
    expect(orders.length).toBeGreaterThan(0);
    expect(orders[0].customer_phone).toBeDefined();
  });

  it('returns in descending chronological order', () => {
    const orders = getRecentOrders(RESTAURANT_ID, 10, db);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i - 1].created_at >= orders[i].created_at).toBe(true);
    }
  });

  it('respects limit', () => {
    const orders = getRecentOrders(RESTAURANT_ID, 2, db);
    expect(orders.length).toBeLessThanOrEqual(2);
  });
});
