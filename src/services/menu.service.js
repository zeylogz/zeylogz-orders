import { getDb } from '../database/db.js';

/**
 * Get all active menu categories for a restaurant, ordered by display_order.
 */
export function getCategories(restaurantId, db = getDb()) {
  return db.prepare(`
    SELECT id, name, emoji, display_order
    FROM menu_categories
    WHERE restaurant_id = ? AND is_active = 1
    ORDER BY display_order ASC
  `).all(restaurantId);
}

/**
 * Get a single category by ID, scoped to a restaurant.
 */
export function getCategoryById(restaurantId, categoryId, db = getDb()) {
  return db.prepare(`
    SELECT id, name, emoji, display_order
    FROM menu_categories
    WHERE id = ? AND restaurant_id = ? AND is_active = 1
  `).get(categoryId, restaurantId) || null;
}

/**
 * Get all available menu items in a category, scoped to a restaurant.
 */
export function getItemsByCategory(restaurantId, categoryId, db = getDb()) {
  return db.prepare(`
    SELECT id, name, description, price, image_url, display_order
    FROM menu_items
    WHERE restaurant_id = ? AND category_id = ? AND is_available = 1
    ORDER BY display_order ASC
  `).all(restaurantId, categoryId);
}

/**
 * Get a single menu item by ID, scoped to a restaurant.
 * Returns null if wrong restaurant. Includes unavailable items (for admin views).
 */
export function getItemById(restaurantId, itemId, db = getDb()) {
  return db.prepare(`
    SELECT mi.id, mi.name, mi.description, mi.price, mi.image_url,
           mi.category_id, mi.is_available,
           mc.name AS category_name
    FROM menu_items mi
    JOIN menu_categories mc ON mc.id = mi.category_id
    WHERE mi.id = ? AND mi.restaurant_id = ?
  `).get(itemId, restaurantId) || null;
}

/**
 * Get a single available menu item (for adding to cart).
 * Returns null if the item is unavailable.
 */
export function getAvailableItem(restaurantId, itemId, db = getDb()) {
  return db.prepare(`
    SELECT id, name, description, price, category_id
    FROM menu_items
    WHERE id = ? AND restaurant_id = ? AND is_available = 1
  `).get(itemId, restaurantId) || null;
}

/**
 * Get the full menu for a restaurant: categories with nested items.
 */
export function getFullMenu(restaurantId, db = getDb()) {
  const categories = getCategories(restaurantId, db);

  return categories.map((category) => ({
    ...category,
    items: getItemsByCategory(restaurantId, category.id, db),
  }));
}
