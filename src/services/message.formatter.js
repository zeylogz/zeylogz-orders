import { formatPrice } from '../utils/formatting.js';

/**
 * Message types that the conversation engine produces.
 * These are later translated to WhatsApp API payloads or dev-mode text.
 *
 * Types:
 *   text       — plain text message
 *   buttons    — text with up to 3 reply buttons
 *   list       — text with a list picker (up to 10 sections × 10 rows)
 */

// ---------------------------------------------------------------------------
// Welcome
// ---------------------------------------------------------------------------
export function welcomeMessage(restaurantName) {
  return {
    type: 'buttons',
    body: `👋 Welcome to *${restaurantName}*!\n\nHow can we help you today?`,
    buttons: [
      { id: 'action_menu', title: '🍔 View Menu' },
      { id: 'action_cart', title: '🛒 View Cart' },
    ],
  };
}

// ---------------------------------------------------------------------------
// Menu — category list
// ---------------------------------------------------------------------------
export function categoryListMessage(categories) {
  return {
    type: 'list',
    body: '📋 *Our Menu*\n\nSelect a category to browse:',
    buttonText: 'View Categories',
    sections: [
      {
        title: 'Menu Categories',
        rows: categories.map((cat) => ({
          id: `category_${cat.id}`,
          title: `${cat.emoji} ${cat.name}`,
        })),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Items in a category
// ---------------------------------------------------------------------------
export function itemListMessage(categoryName, categoryEmoji, items) {
  return {
    type: 'list',
    body: `${categoryEmoji} *${categoryName}*\n\nSelect an item to add to your cart:`,
    buttonText: 'View Items',
    sections: [
      {
        title: categoryName,
        rows: items.map((item) => ({
          id: `item_${item.id}`,
          title: item.name,
          description: `${formatPrice(item.price)}${item.description ? ' — ' + item.description : ''}`,
        })),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Quantity prompt
// ---------------------------------------------------------------------------
export function quantityMessage(itemName, price) {
  return {
    type: 'buttons',
    body: `🛒 *${itemName}*\n💰 ${formatPrice(price)}\n\nHow many would you like?`,
    buttons: [
      { id: 'qty_1', title: '1' },
      { id: 'qty_2', title: '2' },
      { id: 'qty_3', title: '3' },
    ],
    footer: 'Or type a number (1-99)',
  };
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------
export function cartMessage(cart, subtotal) {
  if (cart.length === 0) {
    return {
      type: 'buttons',
      body: '🛒 Your cart is empty.\n\nWould you like to browse our menu?',
      buttons: [
        { id: 'action_menu', title: '🍔 View Menu' },
      ],
    };
  }

  const lines = cart.map(
    (item) => `${item.quantity} × ${item.name} — ${formatPrice(item.price * item.quantity)}`
  );

  const body = `🛒 *Your Cart*\n\n${lines.join('\n')}\n\n*Subtotal: ${formatPrice(subtotal)}*`;

  return {
    type: 'buttons',
    body,
    buttons: [
      { id: 'action_add_more', title: '➕ Add More' },
      { id: 'action_clear_cart', title: '🗑 Clear Cart' },
      { id: 'action_checkout', title: '✅ Checkout' },
    ],
  };
}

// ---------------------------------------------------------------------------
// Item added confirmation
// ---------------------------------------------------------------------------
export function itemAddedMessage(itemName, quantity, cart, subtotal) {
  const lines = cart.map(
    (item) => `${item.quantity} × ${item.name} — ${formatPrice(item.price * item.quantity)}`
  );

  const body = `✅ Added ${quantity} × *${itemName}* to your cart!\n\n🛒 *Your Cart*\n${lines.join('\n')}\n\n*Subtotal: ${formatPrice(subtotal)}*`;

  return {
    type: 'buttons',
    body,
    buttons: [
      { id: 'action_add_more', title: '➕ Add More' },
      { id: 'action_clear_cart', title: '🗑 Clear Cart' },
      { id: 'action_checkout', title: '✅ Checkout' },
    ],
  };
}

// ---------------------------------------------------------------------------
// Checkout prompts
// ---------------------------------------------------------------------------
export function askCustomerNameMessage() {
  return {
    type: 'text',
    body: '📝 *Checkout*\n\nPlease type your name:',
  };
}

export function askOrderTypeMessage() {
  return {
    type: 'buttons',
    body: '🚗 How would you like to receive your order?',
    buttons: [
      { id: 'type_delivery', title: '🚚 Delivery' },
      { id: 'type_pickup', title: '🏪 Pickup' },
      { id: 'type_dine_in', title: '🍽 Dine-in' },
    ],
  };
}

export function askDeliveryAddressMessage() {
  return {
    type: 'text',
    body: '📍 Please type your delivery address:',
  };
}

export function askTableNumberMessage() {
  return {
    type: 'text',
    body: '🍽 Please type your table number:',
  };
}

export function askNotesMessage() {
  return {
    type: 'buttons',
    body: '📝 Any special instructions or notes?\n\n(e.g., "No onions", "Extra spicy")',
    buttons: [
      { id: 'notes_skip', title: 'No, thanks' },
    ],
    footer: 'Or type your notes',
  };
}

// ---------------------------------------------------------------------------
// Order confirmation
// ---------------------------------------------------------------------------
export function orderConfirmationMessage(orderDetails) {
  const {
    items,
    customerName,
    orderType,
    deliveryAddress,
    tableNumber,
    notes,
    subtotal,
    deliveryFee,
    total,
  } = orderDetails;

  const itemLines = items.map(
    (item) => `${item.quantity} × ${item.name}`
  );

  const typeLabels = { delivery: 'Delivery', pickup: 'Pickup', dine_in: 'Dine-in' };

  let body = `🧾 *Order Summary*\n\n${itemLines.join('\n')}\n`;
  body += `\nSubtotal: ${formatPrice(subtotal)}`;

  if (deliveryFee > 0) {
    body += `\nDelivery: ${formatPrice(deliveryFee)}`;
  }

  body += `\n*Total: ${formatPrice(total)}*`;
  body += `\n\n👤 ${customerName}`;
  body += `\n📦 ${typeLabels[orderType] || orderType}`;

  if (deliveryAddress) body += `\n📍 ${deliveryAddress}`;
  if (tableNumber) body += `\n🍽 Table ${tableNumber}`;
  if (notes) body += `\n📝 ${notes}`;

  body += '\n\nConfirm this order?';

  return {
    type: 'buttons',
    body,
    buttons: [
      { id: 'confirm_yes', title: '✅ Confirm' },
      { id: 'confirm_cancel', title: '❌ Cancel' },
    ],
  };
}

// ---------------------------------------------------------------------------
// Order completed
// ---------------------------------------------------------------------------
export function orderCompletedMessage(orderNumber, total, restaurantName) {
  return {
    type: 'text',
    body: `✅ *Order received!*\n\nYour order number is *${orderNumber}*\nTotal: *${formatPrice(total)}*\n\n${restaurantName} will contact you if anything needs clarification.\n\nThank you! 🙏`,
  };
}

// ---------------------------------------------------------------------------
// Owner notification
// ---------------------------------------------------------------------------
export function ownerNotificationMessage(orderDetails) {
  const {
    orderNumber,
    customerName,
    customerPhone,
    orderType,
    items,
    subtotal,
    deliveryFee,
    total,
    deliveryAddress,
    tableNumber,
    notes,
    createdAt,
  } = orderDetails;

  const typeLabels = { delivery: 'Delivery', pickup: 'Pickup', dine_in: 'Dine-in' };

  const itemLines = items.map(
    (item) => `${item.quantity} × ${item.name} — ${formatPrice(item.price * item.quantity)}`
  );

  let body = `🔔 *NEW ORDER*\n\nOrder: *${orderNumber}*`;
  body += `\n\n👤 ${customerName}`;
  body += `\n📱 ${customerPhone}`;
  body += `\n📦 ${typeLabels[orderType] || orderType}`;
  body += `\n\n*Items:*\n${itemLines.join('\n')}`;
  body += `\n\nSubtotal: ${formatPrice(subtotal)}`;

  if (deliveryFee > 0) {
    body += `\nDelivery: ${formatPrice(deliveryFee)}`;
  }

  body += `\n*TOTAL: ${formatPrice(total)}*`;

  if (deliveryAddress) body += `\n\n📍 ${deliveryAddress}`;
  if (tableNumber) body += `\n🍽 Table ${tableNumber}`;
  if (notes) body += `\n📝 ${notes}`;
  if (createdAt) body += `\n\n🕐 ${new Date(createdAt).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}`;

  return {
    type: 'text',
    body,
  };
}

// ---------------------------------------------------------------------------
// Error / fallback messages
// ---------------------------------------------------------------------------
export function invalidInputMessage(hint) {
  return {
    type: 'text',
    body: `❌ Sorry, I didn't understand that.\n\n${hint || 'Please try again or type "menu" to start over.'}`,
  };
}

export function cartClearedMessage() {
  return {
    type: 'buttons',
    body: '🗑 Your cart has been cleared.',
    buttons: [
      { id: 'action_menu', title: '🍔 View Menu' },
    ],
  };
}

export function orderCancelledMessage() {
  return {
    type: 'buttons',
    body: '❌ Your order has been cancelled.\n\nYour cart has been preserved. You can continue shopping or start fresh.',
    buttons: [
      { id: 'action_menu', title: '🍔 View Menu' },
      { id: 'action_cart', title: '🛒 View Cart' },
    ],
  };
}

export function itemUnavailableMessage() {
  return {
    type: 'buttons',
    body: '😔 Sorry, that item is currently unavailable.',
    buttons: [
      { id: 'action_menu', title: '🍔 View Menu' },
      { id: 'action_cart', title: '🛒 View Cart' },
    ],
  };
}
