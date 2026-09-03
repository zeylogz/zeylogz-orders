import { getDb } from '../database/db.js';
import { getRestaurantById } from './restaurant.service.js';
import { getCategories, getCategoryById, getItemsByCategory, getAvailableItem } from './menu.service.js';
import {
  addToCart,
  clearCart,
  calculateSubtotal,
  validateCart,
  isCartEmpty,
} from './cart.service.js';
import { findOrCreateCustomer, createOrder } from './order.service.js';
import { getOrCreateSession, updateSession, resetSession } from './session.service.js';
import * as formatters from './message.formatter.js';
import { generateLankaQrPayload } from './lankaqr.service.js';
import { logger } from '../utils/logger.js';


/**
 * Handle an incoming message from a customer.
 * Dispatches to the appropriate state handler based on session.state.
 *
 * @param {object} params
 * @param {number} params.restaurantId
 * @param {string} params.fromPhone
 * @param {string} [params.text]
 * @param {string} [params.buttonId]
 * @param {string} [params.listRowId]
 * @param {object} [db]
 * @returns {object} { replies: Array, ownerNotification: object|null, session: object, order: object|null }
 */
export function handleIncomingMessage(params, db = getDb()) {
  const { restaurantId, fromPhone } = params;
  const rawText = (params.text || '').trim();
  const actionId = params.buttonId || params.listRowId || '';

  const restaurant = getRestaurantById(restaurantId, db);
  if (!restaurant) {
    logger.error('Incoming message for unknown or inactive restaurant', { restaurantId });
    return {
      replies: [formatters.invalidInputMessage('Restaurant not found or currently unavailable.')],
      ownerNotification: null,
      session: null,
      order: null,
    };
  }

  const session = getOrCreateSession(restaurantId, fromPhone, db);
  logger.info('Handling conversation step', {
    restaurantId,
    fromPhone,
    currentState: session.state,
    actionId,
    rawText,
  });

  // Global commands (restart / reset)
  const lowerText = rawText.toLowerCase();
  if (actionId === 'action_reset' || lowerText === 'reset' || lowerText === 'restart' || lowerText === 'start over') {
    const reset = resetSession(session.id, db);
    const welcome = formatters.welcomeMessage(restaurant.name);
    return {
      replies: [welcome],
      ownerNotification: null,
      session: reset,
      order: null,
    };
  }

  // Global "menu" or "cart" shortcuts (only when not in middle of text input states)
  const textInputStates = ['CUSTOMER_NAME', 'DELIVERY_ADDRESS', 'TABLE_NUMBER', 'NOTES'];
  if (!textInputStates.includes(session.state)) {
    if (actionId === 'action_menu' || lowerText === 'menu') {
      const categories = getCategories(restaurantId, db);
      updateSession(session.id, { state: 'CATEGORY_SELECTION' }, db);
      session.state = 'CATEGORY_SELECTION';
      return {
        replies: [formatters.categoryListMessage(categories)],
        ownerNotification: null,
        session,
        order: null,
      };
    }

    if (actionId === 'action_cart' || lowerText === 'cart' || lowerText === 'view cart') {
      const subtotal = calculateSubtotal(session.cart);
      updateSession(session.id, { state: 'CART' }, db);
      session.state = 'CART';
      return {
        replies: [formatters.cartMessage(session.cart, subtotal)],
        ownerNotification: null,
        session,
        order: null,
      };
    }
  }

  // Dispatch to state handlers
  switch (session.state) {
    case 'WELCOME':
      return handleWelcomeState(restaurant, session, actionId, rawText, db);

    case 'CATEGORY_SELECTION':
      return handleCategorySelectionState(restaurant, session, actionId, rawText, db);

    case 'ITEM_SELECTION':
      return handleItemSelectionState(restaurant, session, actionId, rawText, db);

    case 'ITEM_QUANTITY':
      return handleItemQuantityState(restaurant, session, actionId, rawText, db);

    case 'CART':
      return handleCartState(restaurant, session, actionId, rawText, db);

    case 'CUSTOMER_NAME':
      return handleCustomerNameState(restaurant, session, actionId, rawText, db);

    case 'ORDER_TYPE':
      return handleOrderTypeState(restaurant, session, actionId, rawText, db);

    case 'DELIVERY_ADDRESS':
      return handleDeliveryAddressState(restaurant, session, actionId, rawText, db);

    case 'TABLE_NUMBER':
      return handleTableNumberState(restaurant, session, actionId, rawText, db);

    case 'NOTES':
      return handleNotesState(restaurant, session, actionId, rawText, db);

    case 'PAYMENT_METHOD':
      return handlePaymentMethodState(restaurant, session, actionId, rawText, db);

    case 'ORDER_CONFIRMATION':
      return handleOrderConfirmationState(restaurant, session, actionId, rawText, db);


    default: {
      // Fallback: reset to welcome
      updateSession(session.id, { state: 'WELCOME' }, db);
      session.state = 'WELCOME';
      return {
        replies: [formatters.welcomeMessage(restaurant.name)],
        ownerNotification: null,
        session,
        order: null,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// State Handlers
// ---------------------------------------------------------------------------

function handleWelcomeState(restaurant, session, actionId, rawText, db) {
  const lower = rawText.toLowerCase();

  if (actionId === 'action_menu' || lower === 'menu' || lower === '1' || lower === 'view menu' || lower === 'order') {
    const categories = getCategories(restaurant.id, db);
    updateSession(session.id, { state: 'CATEGORY_SELECTION' }, db);
    session.state = 'CATEGORY_SELECTION';
    return {
      replies: [formatters.categoryListMessage(categories)],
      ownerNotification: null,
      session,
      order: null,
    };
  }

  if (actionId === 'action_cart' || lower === 'cart' || lower === '2' || lower === 'view cart') {
    const subtotal = calculateSubtotal(session.cart);
    updateSession(session.id, { state: 'CART' }, db);
    session.state = 'CART';
    return {
      replies: [formatters.cartMessage(session.cart, subtotal)],
      ownerNotification: null,
      session,
      order: null,
    };
  }

  // Any greeting or first message ("hi", "hello", etc.)
  return {
    replies: [formatters.welcomeMessage(restaurant.name)],
    ownerNotification: null,
    session,
    order: null,
  };
}

function handleCategorySelectionState(restaurant, session, actionId, rawText, db) {
  const categories = getCategories(restaurant.id, db);

  let categoryId = null;
  if (actionId.startsWith('category_')) {
    categoryId = parseInt(actionId.replace('category_', ''), 10);
  } else {
    // Try matching typed text to category name or 1-based index
    const index = parseInt(rawText, 10);
    if (!isNaN(index) && index >= 1 && index <= categories.length) {
      categoryId = categories[index - 1].id;
    } else {
      const match = categories.find((c) => c.name.toLowerCase() === rawText.toLowerCase());
      if (match) categoryId = match.id;
    }
  }

  const category = categoryId ? getCategoryById(restaurant.id, categoryId, db) : null;
  if (!category) {
    return {
      replies: [
        formatters.invalidInputMessage('Please select one of the categories below:'),
        formatters.categoryListMessage(categories),
      ],
      ownerNotification: null,
      session,
      order: null,
    };
  }

  const items = getItemsByCategory(restaurant.id, category.id, db);
  if (items.length === 0) {
    return {
      replies: [
        formatters.invalidInputMessage(`No items currently available in ${category.name}.`),
        formatters.categoryListMessage(categories),
      ],
      ownerNotification: null,
      session,
      order: null,
    };
  }

  const context = { ...session.context, selectedCategoryId: category.id };
  updateSession(session.id, { state: 'ITEM_SELECTION', context }, db);
  session.state = 'ITEM_SELECTION';
  session.context = context;

  return {
    replies: [formatters.itemListMessage(category.name, category.emoji || '🍽', items)],
    ownerNotification: null,
    session,
    order: null,
  };
}

function handleItemSelectionState(restaurant, session, actionId, rawText, db) {
  const categoryId = session.context.selectedCategoryId;
  const items = categoryId ? getItemsByCategory(restaurant.id, categoryId, db) : [];

  let itemId = null;
  if (actionId.startsWith('item_')) {
    itemId = parseInt(actionId.replace('item_', ''), 10);
  } else {
    const index = parseInt(rawText, 10);
    if (!isNaN(index) && index >= 1 && index <= items.length) {
      itemId = items[index - 1].id;
    } else {
      const match = items.find((i) => i.name.toLowerCase() === rawText.toLowerCase());
      if (match) itemId = match.id;
    }
  }

  const item = itemId ? getAvailableItem(restaurant.id, itemId, db) : null;
  if (!item) {
    const category = categoryId ? getCategoryById(restaurant.id, categoryId, db) : null;
    return {
      replies: [
        formatters.invalidInputMessage('Please select an item from the list:'),
        formatters.itemListMessage(category?.name || 'Menu', category?.emoji || '🍽', items),
      ],
      ownerNotification: null,
      session,
      order: null,
    };
  }

  const context = { ...session.context, selectedItemId: item.id };
  updateSession(session.id, { state: 'ITEM_QUANTITY', context }, db);
  session.state = 'ITEM_QUANTITY';
  session.context = context;

  return {
    replies: [formatters.quantityMessage(item.name, item.price)],
    ownerNotification: null,
    session,
    order: null,
  };
}

function handleItemQuantityState(restaurant, session, actionId, rawText, db) {
  const itemId = session.context.selectedItemId;
  const item = itemId ? getAvailableItem(restaurant.id, itemId, db) : null;

  if (!item) {
    const categories = getCategories(restaurant.id, db);
    updateSession(session.id, { state: 'CATEGORY_SELECTION' }, db);
    session.state = 'CATEGORY_SELECTION';
    return {
      replies: [
        formatters.itemUnavailableMessage(),
        formatters.categoryListMessage(categories),
      ],
      ownerNotification: null,
      session,
      order: null,
    };
  }

  let quantity = null;
  if (actionId.startsWith('qty_')) {
    quantity = parseInt(actionId.replace('qty_', ''), 10);
  } else {
    const parsed = parseInt(rawText, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 99) {
      quantity = parsed;
    }
  }

  if (!quantity) {
    return {
      replies: [
        formatters.invalidInputMessage('Please select or type a quantity between 1 and 99:'),
        formatters.quantityMessage(item.name, item.price),
      ],
      ownerNotification: null,
      session,
      order: null,
    };
  }

  // Add to cart
  const updatedCart = addToCart(session.cart, item, quantity);
  const subtotal = calculateSubtotal(updatedCart);

  // Clear selectedItemId from context
  const context = { ...session.context };
  delete context.selectedItemId;

  updateSession(session.id, { state: 'CART', cart: updatedCart, context }, db);
  session.state = 'CART';
  session.cart = updatedCart;
  session.context = context;

  return {
    replies: [formatters.itemAddedMessage(item.name, quantity, updatedCart, subtotal)],
    ownerNotification: null,
    session,
    order: null,
  };
}

function handleCartState(restaurant, session, actionId, rawText, db) {
  const lower = rawText.toLowerCase();

  if (actionId === 'action_add_more' || lower === 'add more' || lower === 'more' || lower === '1') {
    const categories = getCategories(restaurant.id, db);
    updateSession(session.id, { state: 'CATEGORY_SELECTION' }, db);
    session.state = 'CATEGORY_SELECTION';
    return {
      replies: [formatters.categoryListMessage(categories)],
      ownerNotification: null,
      session,
      order: null,
    };
  }

  if (actionId === 'action_clear_cart' || lower === 'clear' || lower === 'clear cart' || lower === '2') {
    const emptyCart = clearCart();
    updateSession(session.id, { state: 'WELCOME', cart: emptyCart }, db);
    session.state = 'WELCOME';
    session.cart = emptyCart;
    return {
      replies: [formatters.cartClearedMessage()],
      ownerNotification: null,
      session,
      order: null,
    };
  }

  if (actionId === 'action_checkout' || lower === 'checkout' || lower === 'check out' || lower === '3' || lower === 'buy') {
    if (isCartEmpty(session.cart)) {
      const categories = getCategories(restaurant.id, db);
      return {
        replies: [
          formatters.invalidInputMessage('Your cart is empty! Browse the menu first:'),
          formatters.categoryListMessage(categories),
        ],
        ownerNotification: null,
        session,
        order: null,
      };
    }

    // Validate cart against database
    const validation = validateCart(session.cart, restaurant.id, db);
    if (validation.validCart.length === 0) {
      updateSession(session.id, { cart: [] }, db);
      session.cart = [];
      const categories = getCategories(restaurant.id, db);
      return {
        replies: [
          formatters.invalidInputMessage('Sorry, items in your cart are no longer available.'),
          formatters.categoryListMessage(categories),
        ],
        ownerNotification: null,
        session,
        order: null,
      };
    }

    if (validation.removedItems.length > 0) {
      updateSession(session.id, { cart: validation.validCart }, db);
      session.cart = validation.validCart;
    }

    // Proceed to ask customer name
    updateSession(session.id, { state: 'CUSTOMER_NAME' }, db);
    session.state = 'CUSTOMER_NAME';
    return {
      replies: [formatters.askCustomerNameMessage()],
      ownerNotification: null,
      session,
      order: null,
    };
  }

  // Default in cart state: re-render cart
  const subtotal = calculateSubtotal(session.cart);
  return {
    replies: [
      formatters.invalidInputMessage('Please choose an action:'),
      formatters.cartMessage(session.cart, subtotal),
    ],
    ownerNotification: null,
    session,
    order: null,
  };
}

function handleCustomerNameState(restaurant, session, actionId, rawText, db) {
  const name = rawText.trim();
  if (!name || name.length < 2) {
    return {
      replies: [
        formatters.invalidInputMessage('Please enter a valid name (at least 2 characters):'),
      ],
      ownerNotification: null,
      session,
      order: null,
    };
  }

  // Save customer and context
  const customer = findOrCreateCustomer(restaurant.id, session.whatsapp_number, name, db);
  const context = { ...session.context, customerName: name, customerId: customer.id };

  updateSession(session.id, { state: 'ORDER_TYPE', context, customerId: customer.id }, db);
  session.state = 'ORDER_TYPE';
  session.context = context;
  session.customer_id = customer.id;

  return {
    replies: [formatters.askOrderTypeMessage()],
    ownerNotification: null,
    session,
    order: null,
  };
}

function handleOrderTypeState(restaurant, session, actionId, rawText, db) {
  const lower = rawText.toLowerCase();

  let orderType = null;
  if (actionId === 'type_delivery' || lower === 'delivery' || lower === '1') {
    orderType = 'delivery';
  } else if (actionId === 'type_pickup' || lower === 'pickup' || lower === '2') {
    orderType = 'pickup';
  } else if (actionId === 'type_dine_in' || lower === 'dine in' || lower === 'dine-in' || lower === 'dine_in' || lower === '3') {
    orderType = 'dine_in';
  }

  if (!orderType) {
    return {
      replies: [
        formatters.invalidInputMessage('Please choose how you would like to receive your order:'),
        formatters.askOrderTypeMessage(),
      ],
      ownerNotification: null,
      session,
      order: null,
    };
  }

  const context = { ...session.context, orderType };

  if (orderType === 'delivery') {
    updateSession(session.id, { state: 'DELIVERY_ADDRESS', context }, db);
    session.state = 'DELIVERY_ADDRESS';
    session.context = context;
    return {
      replies: [formatters.askDeliveryAddressMessage()],
      ownerNotification: null,
      session,
      order: null,
    };
  }

  if (orderType === 'dine_in') {
    updateSession(session.id, { state: 'TABLE_NUMBER', context }, db);
    session.state = 'TABLE_NUMBER';
    session.context = context;
    return {
      replies: [formatters.askTableNumberMessage()],
      ownerNotification: null,
      session,
      order: null,
    };
  }

  // Pickup -> skip straight to notes
  updateSession(session.id, { state: 'NOTES', context }, db);
  session.state = 'NOTES';
  session.context = context;
  return {
    replies: [formatters.askNotesMessage()],
    ownerNotification: null,
    session,
    order: null,
  };
}

function handleDeliveryAddressState(restaurant, session, actionId, rawText, db) {
  const address = rawText.trim();
  if (!address || address.length < 3) {
    return {
      replies: [
        formatters.invalidInputMessage('Please enter your full delivery address:'),
      ],
      ownerNotification: null,
      session,
      order: null,
    };
  }

  const context = { ...session.context, deliveryAddress: address };
  updateSession(session.id, { state: 'NOTES', context }, db);
  session.state = 'NOTES';
  session.context = context;

  return {
    replies: [formatters.askNotesMessage()],
    ownerNotification: null,
    session,
    order: null,
  };
}

function handleTableNumberState(restaurant, session, actionId, rawText, db) {
  const table = rawText.trim();
  if (!table) {
    return {
      replies: [
        formatters.invalidInputMessage('Please enter your table number:'),
      ],
      ownerNotification: null,
      session,
      order: null,
    };
  }

  const context = { ...session.context, tableNumber: table };
  updateSession(session.id, { state: 'NOTES', context }, db);
  session.state = 'NOTES';
  session.context = context;

  return {
    replies: [formatters.askNotesMessage()],
    ownerNotification: null,
    session,
    order: null,
  };
}

function handleNotesState(restaurant, session, actionId, rawText, db) {
  const lower = rawText.toLowerCase();
  let notes = '';

  if (actionId === 'notes_skip' || lower === 'no' || lower === 'skip' || lower === 'none' || lower === 'no, thanks' || lower === 'no thanks') {
    notes = '';
  } else {
    notes = rawText.trim();
  }

  const context = { ...session.context, notes };

  updateSession(session.id, { state: 'PAYMENT_METHOD', context }, db);
  session.state = 'PAYMENT_METHOD';
  session.context = context;

  return {
    replies: [formatters.askPaymentMethodMessage(Boolean(restaurant.lankaqr_enabled))],
    ownerNotification: null,
    session,
    order: null,
  };
}

function handlePaymentMethodState(restaurant, session, actionId, rawText, db) {
  const lower = rawText.toLowerCase();

  let paymentMethod = null;
  if (actionId === 'pay_cod' || lower === 'cash' || lower === 'cod' || lower === '1') {
    paymentMethod = 'cod';
  } else if (actionId === 'pay_lankaqr' || lower === 'lankaqr' || lower === 'qr' || lower === '2') {
    if (restaurant.lankaqr_enabled) {
      paymentMethod = 'lankaqr';
    }
  }

  if (!paymentMethod) {
    return {
      replies: [
        formatters.invalidInputMessage('Please choose a payment method:'),
        formatters.askPaymentMethodMessage(Boolean(restaurant.lankaqr_enabled)),
      ],
      ownerNotification: null,
      session,
      order: null,
    };
  }

  const context = { ...session.context, paymentMethod };

  // Calculate order totals
  const subtotal = calculateSubtotal(session.cart);
  const deliveryFee = context.orderType === 'delivery' ? restaurant.delivery_fee : 0;
  const total = subtotal + deliveryFee;

  const orderDetails = {
    items: session.cart,
    customerName: context.customerName,
    orderType: context.orderType,
    deliveryAddress: context.deliveryAddress || '',
    tableNumber: context.tableNumber || '',
    notes: context.notes || '',
    paymentMethod,
    subtotal,
    deliveryFee,
    total,
  };

  updateSession(session.id, { state: 'ORDER_CONFIRMATION', context }, db);
  session.state = 'ORDER_CONFIRMATION';
  session.context = context;

  return {
    replies: [formatters.orderConfirmationMessage(orderDetails)],
    ownerNotification: null,
    session,
    order: null,
  };
}


function handleOrderConfirmationState(restaurant, session, actionId, rawText, db) {
  const lower = rawText.toLowerCase();

  if (actionId === 'confirm_yes' || lower === 'yes' || lower === 'confirm' || lower === 'ok' || lower === '1') {
    const { context } = session;
    const customer = findOrCreateCustomer(
      restaurant.id,
      session.whatsapp_number,
      context.customerName,
      db
    );

    const paymentMethod = context.paymentMethod || 'cod';

    // Create the order
    const orderResult = createOrder({
      restaurantId: restaurant.id,
      customerId: customer.id,
      customerName: context.customerName,
      cart: session.cart,
      orderType: context.orderType,
      deliveryAddress: context.deliveryAddress || '',
      tableNumber: context.tableNumber || '',
      notes: context.notes || '',
      paymentMethod,
    }, db);

    // Reset session after successful order
    resetSession(session.id, db);

    // Format customer completion message
    const customerReply = formatters.orderCompletedMessage(
      orderResult.orderNumber,
      orderResult.total,
      restaurant.name,
      paymentMethod
    );

    const customerReplies = [customerReply];

    // If customer selected LankaQR, generate instructions & QR code
    if (paymentMethod === 'lankaqr') {
      const qrPayload = generateLankaQrPayload({
        merchantName: restaurant.lankaqr_merchant_name || restaurant.name,
        merchantId: restaurant.lankaqr_merchant_id || 'LANKAQR01',
        amount: orderResult.total,
        orderNumber: orderResult.orderNumber,
        city: 'Colombo',
      });

      customerReplies.push(
        formatters.lankaqrPaymentInstructionsMessage({
          orderNumber: orderResult.orderNumber,
          total: orderResult.total,
          restaurant,
          qrPayload,
        })
      );
    }

    // Format owner notification
    const ownerNotification = {
      to: restaurant.owner_phone_number,
      message: formatters.ownerNotificationMessage({
        orderNumber: orderResult.orderNumber,
        customerName: orderResult.customerName,
        customerPhone: session.whatsapp_number,
        orderType: orderResult.orderType,
        paymentMethod: orderResult.paymentMethod,
        paymentStatus: orderResult.paymentStatus,
        items: orderResult.items,
        subtotal: orderResult.subtotal,
        deliveryFee: orderResult.deliveryFee,
        total: orderResult.total,
        deliveryAddress: orderResult.deliveryAddress,
        tableNumber: orderResult.tableNumber,
        notes: orderResult.notes,
        createdAt: new Date().toISOString(),
      }),
    };

    return {
      replies: customerReplies,
      ownerNotification,
      session,
      order: orderResult,
    };
  }

  if (actionId === 'confirm_cancel' || lower === 'no' || lower === 'cancel' || lower === '2') {
    // Keep cart, set back to CART state
    updateSession(session.id, { state: 'CART' }, db);
    session.state = 'CART';
    return {
      replies: [formatters.orderCancelledMessage()],
      ownerNotification: null,
      session,
      order: null,
    };
  }

  // Ambiguous confirmation input
  const subtotal = calculateSubtotal(session.cart);
  const deliveryFee = session.context.orderType === 'delivery' ? restaurant.delivery_fee : 0;
  const total = subtotal + deliveryFee;

  const orderDetails = {
    items: session.cart,
    customerName: session.context.customerName,
    orderType: session.context.orderType,
    deliveryAddress: session.context.deliveryAddress || '',
    tableNumber: session.context.tableNumber || '',
    notes: session.context.notes || '',
    paymentMethod: session.context.paymentMethod || 'cod',
    subtotal,
    deliveryFee,
    total,
  };


  return {
    replies: [
      formatters.invalidInputMessage('Please confirm or cancel using the buttons below:'),
      formatters.orderConfirmationMessage(orderDetails),
    ],
    ownerNotification: null,
    session,
    order: null,
  };
}
