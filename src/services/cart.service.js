import { getAvailableItem } from './menu.service.js';
import { getDb } from '../database/db.js';

/**
 * Cart is stored as a JSON array in the conversation session's cart_data column.
 * Each cart item: { itemId, name, price, quantity }
 *
 * We ALWAYS re-validate prices from the database when calculating totals.
 * Cart items store name/price for display convenience, but the source of truth
 * is the menu_items table.
 */

// ---------------------------------------------------------------------------
// Cart manipulation (pure functions on the cart array)
// ---------------------------------------------------------------------------

/**
 * Add an item to the cart or increase its quantity.
 * Returns the updated cart array.
 */
export function addToCart(cart, item, quantity = 1) {
  if (quantity < 1 || !Number.isInteger(quantity)) {
    throw new Error('Quantity must be a positive integer');
  }
  if (quantity > 99) {
    throw new Error('Maximum quantity per item is 99');
  }

  const existing = cart.find((ci) => ci.itemId === item.id);

  if (existing) {
    const newQty = existing.quantity + quantity;
    if (newQty > 99) {
      throw new Error('Maximum quantity per item is 99');
    }
    existing.quantity = newQty;
  } else {
    cart.push({
      itemId: item.id,
      name: item.name,
      price: item.price,
      quantity,
    });
  }

  return cart;
}

/**
 * Update the quantity of a specific item in the cart.
 * If quantity becomes 0, the item is removed.
 * Returns the updated cart array.
 */
export function updateQuantity(cart, itemId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error('Quantity must be a non-negative integer');
  }
  if (quantity > 99) {
    throw new Error('Maximum quantity per item is 99');
  }

  if (quantity === 0) {
    return removeFromCart(cart, itemId);
  }

  const existing = cart.find((ci) => ci.itemId === itemId);
  if (!existing) {
    throw new Error('Item not found in cart');
  }

  existing.quantity = quantity;
  return cart;
}

/**
 * Remove an item from the cart entirely.
 */
export function removeFromCart(cart, itemId) {
  return cart.filter((ci) => ci.itemId !== itemId);
}

/**
 * Clear all items from the cart.
 */
export function clearCart() {
  return [];
}

/**
 * Calculate the subtotal of the cart.
 * Uses the prices stored in the cart (display/snapshot prices).
 */
export function calculateSubtotal(cart) {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Calculate the full order total including delivery fee.
 */
export function calculateTotal(cart, deliveryFee = 0) {
  return calculateSubtotal(cart) + deliveryFee;
}

/**
 * Validate the cart against the current database state.
 * - Re-fetches prices from the database (never trust client prices)
 * - Removes items that are no longer available
 * - Returns { validCart, removedItems, subtotal }
 */
export function validateCart(cart, restaurantId, db = getDb()) {
  const validCart = [];
  const removedItems = [];

  for (const cartItem of cart) {
    const menuItem = getAvailableItem(restaurantId, cartItem.itemId, db);

    if (!menuItem) {
      removedItems.push(cartItem);
      continue;
    }

    validCart.push({
      itemId: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,      // Always use DB price
      quantity: cartItem.quantity,
    });
  }

  return {
    validCart,
    removedItems,
    subtotal: calculateSubtotal(validCart),
  };
}

/**
 * Get a display-friendly summary of the cart.
 */
export function getCartSummary(cart) {
  return {
    items: cart.map((ci) => ({
      name: ci.name,
      quantity: ci.quantity,
      unitPrice: ci.price,
      lineTotal: ci.price * ci.quantity,
    })),
    itemCount: cart.reduce((sum, ci) => sum + ci.quantity, 0),
    subtotal: calculateSubtotal(cart),
  };
}

/**
 * Check if the cart is empty.
 */
export function isCartEmpty(cart) {
  return !cart || cart.length === 0;
}
