import { getDb } from '../database/db.js';

/**
 * Find a restaurant by its primary key.
 */
export function getRestaurantById(restaurantId, db = getDb()) {
  return db.prepare(`
    SELECT * FROM restaurants
    WHERE id = ? AND is_active = 1
  `).get(restaurantId) || null;
}

/**
 * Find a restaurant by its WhatsApp Phone Number ID.
 * This is how we identify which restaurant an incoming message belongs to.
 */
export function getRestaurantByPhoneNumberId(phoneNumberId, db = getDb()) {
  return db.prepare(`
    SELECT * FROM restaurants
    WHERE whatsapp_phone_number_id = ? AND is_active = 1
  `).get(phoneNumberId) || null;
}

/**
 * List all active restaurants.
 */
export function getAllActiveRestaurants(db = getDb()) {
  return db.prepare(`
    SELECT * FROM restaurants
    WHERE is_active = 1
    ORDER BY name
  `).all();
}

/**
 * Get the next sequential order number for a restaurant.
 * Returns something like "UB-1042".
 */
export function getNextOrderNumber(restaurantId, db = getDb()) {
  const restaurant = db.prepare(`
    SELECT order_prefix FROM restaurants WHERE id = ?
  `).get(restaurantId);

  if (!restaurant) return null;

  const lastOrder = db.prepare(`
    SELECT order_number FROM orders
    WHERE restaurant_id = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(restaurantId);

  let nextSeq = 1001; // Start from 1001

  if (lastOrder) {
    const parts = lastOrder.order_number.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${restaurant.order_prefix}-${nextSeq}`;
}
