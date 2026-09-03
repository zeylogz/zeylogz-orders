import { getDb } from '../database/db.js';
import { getRestaurantById, getNextOrderNumber } from './restaurant.service.js';
import { validateCart, calculateSubtotal } from './cart.service.js';
import { logger } from '../utils/logger.js';

/**
 * Find or create a customer record for a restaurant + WhatsApp number.
 */
export function findOrCreateCustomer(restaurantId, whatsappNumber, name = '', db = getDb()) {
  let customer = db.prepare(`
    SELECT * FROM customers
    WHERE restaurant_id = ? AND whatsapp_number = ?
  `).get(restaurantId, whatsappNumber);

  if (customer) {
    // Update name if provided and different
    if (name && name !== customer.name) {
      db.prepare(`
        UPDATE customers SET name = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(name, customer.id);
      customer.name = name;
    }
    return customer;
  }

  const result = db.prepare(`
    INSERT INTO customers (restaurant_id, whatsapp_number, name)
    VALUES (?, ?, ?)
  `).run(restaurantId, whatsappNumber, name);

  return {
    id: result.lastInsertRowid,
    restaurant_id: restaurantId,
    whatsapp_number: whatsappNumber,
    name,
  };
}

/**
 * Create a complete order from a validated cart.
 *
 * @param {object} params
 * @param {number} params.restaurantId
 * @param {number} params.customerId
 * @param {string} params.customerName
 * @param {Array}  params.cart - Validated cart array
 * @param {string} params.orderType - 'delivery' | 'pickup' | 'dine_in'
 * @param {string} [params.deliveryAddress]
 * @param {string} [params.tableNumber]
 * @param {string} [params.notes]
 * @param {object} [db] - Database instance (for testing)
 */
export function createOrder(params, db = getDb()) {
  const {
    restaurantId,
    customerId,
    customerName,
    cart,
    orderType,
    deliveryAddress = '',
    tableNumber = '',
    notes = '',
    paymentMethod = 'cod',
  } = params;

  // Validate cart against database
  const { validCart, removedItems, subtotal } = validateCart(cart, restaurantId, db);

  if (validCart.length === 0) {
    throw new Error('Cart is empty or all items are unavailable');
  }

  // Get restaurant for delivery fee
  const restaurant = getRestaurantById(restaurantId, db);
  if (!restaurant) {
    throw new Error('Restaurant not found');
  }

  const deliveryFee = orderType === 'delivery' ? restaurant.delivery_fee : 0;
  const total = subtotal + deliveryFee;

  // Generate order number
  const orderNumber = getNextOrderNumber(restaurantId, db);

  // Default payment status
  const paymentStatus = 'unpaid';

  // Create order + order items in a single transaction
  const createOrderTx = db.transaction(() => {
    const orderResult = db.prepare(`
      INSERT INTO orders
        (restaurant_id, customer_id, order_number, status, order_type,
         customer_name, delivery_address, table_number, notes,
         payment_method, payment_status,
         subtotal, delivery_fee, total)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      restaurantId, customerId, orderNumber, orderType,
      customerName, deliveryAddress, tableNumber, notes,
      paymentMethod, paymentStatus,
      subtotal, deliveryFee, total
    );

    const orderId = orderResult.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO order_items
        (order_id, menu_item_id, item_name, unit_price, quantity, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const item of validCart) {
      insertItem.run(
        orderId,
        item.itemId,
        item.name,
        item.price,
        item.quantity,
        item.price * item.quantity
      );
    }

    return orderId;
  });

  const orderId = createOrderTx();

  logger.info('Order created', {
    orderId,
    orderNumber,
    restaurantId,
    customerId,
    paymentMethod,
    total,
  });

  return {
    orderId,
    orderNumber,
    subtotal,
    deliveryFee,
    total,
    items: validCart,
    removedItems,
    orderType,
    customerName,
    deliveryAddress,
    tableNumber,
    notes,
    paymentMethod,
    paymentStatus,
    status: 'pending',
  };

}

/**
 * Get a complete order with its items.
 */
export function getOrderById(orderId, restaurantId, db = getDb()) {
  const order = db.prepare(`
    SELECT * FROM orders
    WHERE id = ? AND restaurant_id = ?
  `).get(orderId, restaurantId);

  if (!order) return null;

  const items = db.prepare(`
    SELECT * FROM order_items WHERE order_id = ?
  `).all(orderId);

  return { ...order, items };
}

/**
 * Get an order by its human-friendly order number.
 */
export function getOrderByNumber(orderNumber, restaurantId, db = getDb()) {
  const order = db.prepare(`
    SELECT * FROM orders
    WHERE order_number = ? AND restaurant_id = ?
  `).get(orderNumber, restaurantId);

  if (!order) return null;

  const items = db.prepare(`
    SELECT * FROM order_items WHERE order_id = ?
  `).all(order.id);

  return { ...order, items };
}

/**
 * Update order status.
 */
export function updateOrderStatus(orderId, restaurantId, status, db = getDb()) {
  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const result = db.prepare(`
    UPDATE orders
    SET status = ?, updated_at = datetime('now')
    WHERE id = ? AND restaurant_id = ?
  `).run(status, orderId, restaurantId);

  return result.changes > 0;
}

/**
 * Get recent orders for a restaurant.
 */
export function getRecentOrders(restaurantId, limit = 20, db = getDb()) {
  return db.prepare(`
    SELECT o.*, c.whatsapp_number AS customer_phone
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE o.restaurant_id = ?
    ORDER BY o.created_at DESC
    LIMIT ?
  `).all(restaurantId, limit);
}
