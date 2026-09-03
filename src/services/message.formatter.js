import { formatPrice } from '../utils/formatting.js';
import { t, formatPriceLocalized } from '../utils/i18n.js';

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
export function welcomeMessage(restaurantName, lang = 'en') {
  const switchBtn = lang === 'si'
    ? { id: 'action_lang_en', title: '🇬🇧 English' }
    : { id: 'action_lang_si', title: '🇱🇰 සිංහල' };

  return {
    type: 'buttons',
    body: t('welcome_title', lang, { restaurantName }),
    buttons: [
      { id: 'action_menu', title: t('btn_menu', lang) },
      { id: 'action_cart', title: t('btn_cart', lang) },
      switchBtn,
    ],
  };
}

// ---------------------------------------------------------------------------
// Menu — category list
// ---------------------------------------------------------------------------
export function categoryListMessage(categories, lang = 'en') {
  return {
    type: 'list',
    body: t('menu_title', lang),
    buttonText: t('btn_view_categories', lang),
    sections: [
      {
        title: lang === 'si' ? 'වර්ග' : 'Menu Categories',
        rows: categories.map((cat) => {
          const catName = (lang === 'si' && cat.name_si) ? cat.name_si : cat.name;
          return {
            id: `category_${cat.id}`,
            title: `${cat.emoji} ${catName}`.slice(0, 24),
          };
        }),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Items in a category
// ---------------------------------------------------------------------------
export function itemListMessage(categoryName, categoryEmoji, items, lang = 'en') {
  return {
    type: 'list',
    body: t('category_header', lang, { emoji: categoryEmoji, categoryName }),
    buttonText: t('btn_view_items', lang),
    sections: [
      {
        title: categoryName.slice(0, 24),
        rows: items.map((item) => {
          const itemName = (lang === 'si' && item.name_si) ? item.name_si : item.name;
          const itemDesc = (lang === 'si' && item.description_si) ? item.description_si : item.description;
          const priceStr = formatPriceLocalized(item.price, lang);
          return {
            id: `item_${item.id}`,
            title: itemName.slice(0, 24),
            description: `${priceStr}${itemDesc ? ' — ' + itemDesc : ''}`.slice(0, 72),
          };
        }),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Quantity prompt
// ---------------------------------------------------------------------------
export function quantityMessage(itemName, price, lang = 'en') {
  const priceStr = formatPriceLocalized(price, lang);
  return {
    type: 'buttons',
    body: t('qty_prompt', lang, { itemName, price: priceStr }),
    buttons: [
      { id: 'qty_1', title: '1' },
      { id: 'qty_2', title: '2' },
      { id: 'qty_3', title: '3' },
    ],
    footer: t('qty_footer', lang),
  };
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------
export function cartMessage(cart, subtotal, lang = 'en') {
  if (cart.length === 0) {
    return {
      type: 'buttons',
      body: t('cart_empty', lang),
      buttons: [
        { id: 'action_menu', title: t('btn_menu', lang) },
      ],
    };
  }

  const lines = cart.map(
    (item) => `${item.quantity} × ${item.name} — ${formatPriceLocalized(item.price * item.quantity, lang)}`
  );

  const body = t('cart_title', lang, {
    items: lines.join('\n'),
    subtotal: formatPriceLocalized(subtotal, lang),
  });

  return {
    type: 'buttons',
    body,
    buttons: [
      { id: 'action_add_more', title: t('btn_add_more', lang) },
      { id: 'action_clear_cart', title: t('btn_clear_cart', lang) },
      { id: 'action_checkout', title: t('btn_checkout', lang) },
    ],
  };
}

// ---------------------------------------------------------------------------
// Item added confirmation
// ---------------------------------------------------------------------------
export function itemAddedMessage(itemName, quantity, cart, subtotal, lang = 'en') {
  const lines = cart.map(
    (item) => `${item.quantity} × ${item.name} — ${formatPriceLocalized(item.price * item.quantity, lang)}`
  );

  const body = t('cart_added', lang, {
    quantity,
    itemName,
    items: lines.join('\n'),
    subtotal: formatPriceLocalized(subtotal, lang),
  });

  return {
    type: 'buttons',
    body,
    buttons: [
      { id: 'action_add_more', title: t('btn_add_more', lang) },
      { id: 'action_clear_cart', title: t('btn_clear_cart', lang) },
      { id: 'action_checkout', title: t('btn_checkout', lang) },
    ],
  };
}

// ---------------------------------------------------------------------------
// Checkout prompts
// ---------------------------------------------------------------------------
export function askCustomerNameMessage(lang = 'en') {
  return {
    type: 'text',
    body: t('ask_name', lang),
  };
}

export function askOrderTypeMessage(lang = 'en') {
  return {
    type: 'buttons',
    body: t('ask_order_type', lang),
    buttons: [
      { id: 'type_delivery', title: t('btn_delivery', lang) },
      { id: 'type_pickup', title: t('btn_pickup', lang) },
      { id: 'type_dine_in', title: t('btn_dine_in', lang) },
    ],
  };
}

export function askDeliveryAddressMessage(lang = 'en') {
  return {
    type: 'text',
    body: t('ask_delivery_address', lang),
  };
}

export function askTableNumberMessage(lang = 'en') {
  return {
    type: 'text',
    body: t('ask_table_number', lang),
  };
}

export function askNotesMessage(lang = 'en') {
  return {
    type: 'buttons',
    body: t('ask_notes', lang),
    buttons: [
      { id: 'notes_skip', title: t('btn_skip_notes', lang) },
    ],
    footer: t('notes_footer', lang),
  };
}

// ---------------------------------------------------------------------------
// Payment Method Selection
// ---------------------------------------------------------------------------
export function askPaymentMethodMessage(lankaqrEnabled = true, lang = 'en') {
  const buttons = [
    { id: 'pay_cod', title: t('btn_cod', lang) },
  ];

  if (lankaqrEnabled) {
    buttons.push({ id: 'pay_lankaqr', title: t('btn_lankaqr', lang) });
  }

  return {
    type: 'buttons',
    body: t('ask_payment', lang),
    buttons,
  };
}

// ---------------------------------------------------------------------------
// Order confirmation
// ---------------------------------------------------------------------------
export function orderConfirmationMessage(orderDetails, lang = 'en') {
  const {
    items,
    customerName,
    orderType,
    deliveryAddress,
    tableNumber,
    notes,
    paymentMethod = 'cod',
    subtotal,
    deliveryFee,
    total,
  } = orderDetails;

  const itemLines = items.map(
    (item) => `${item.quantity} × ${item.name}`
  );

  const typeLabels = {
    delivery: t('btn_delivery', lang),
    pickup: t('btn_pickup', lang),
    dine_in: t('btn_dine_in', lang),
  };

  const paymentLabels = {
    cod: orderType === 'delivery' ? t('pay_cod_label', lang) : t('pay_counter_label', lang),
    lankaqr: t('pay_lankaqr_label', lang),
  };

  let body = `${t('order_summary_title', lang, { items: itemLines.join('\n') })}`;
  body += `\n${t('summary_subtotal', lang, { subtotal: formatPriceLocalized(subtotal, lang) })}`;

  if (deliveryFee > 0) {
    body += `\n${t('summary_delivery', lang, { deliveryFee: formatPriceLocalized(deliveryFee, lang) })}`;
  }

  body += `\n${t('summary_total', lang, { total: formatPriceLocalized(total, lang) })}`;
  body += `\n\n👤 ${customerName}`;
  body += `\n📦 ${typeLabels[orderType] || orderType}`;
  body += `\n💳 ${paymentLabels[paymentMethod] || paymentMethod}`;

  if (deliveryAddress) body += `\n📍 ${deliveryAddress}`;
  if (tableNumber) body += `\n🍽 Table ${tableNumber}`;
  if (notes) body += `\n📝 ${notes}`;

  body += `\n\n${t('confirm_question', lang)}`;

  return {
    type: 'buttons',
    body,
    buttons: [
      { id: 'confirm_yes', title: t('btn_confirm', lang) },
      { id: 'confirm_cancel', title: t('btn_cancel', lang) },
    ],
  };
}

// ---------------------------------------------------------------------------
// Order completed
// ---------------------------------------------------------------------------
export function orderCompletedMessage(orderNumber, total, restaurantName, paymentMethod = 'cod', lang = 'en') {
  let payNote = '';
  if (paymentMethod === 'cod') {
    payNote = t('cod_pay_note', lang, { total: formatPriceLocalized(total, lang) });
  }

  return {
    type: 'text',
    body: t('order_completed', lang, {
      orderNumber,
      total: formatPriceLocalized(total, lang),
      payNote,
      restaurantName,
    }),
  };
}

// ---------------------------------------------------------------------------
// LankaQR Payment Instructions
// ---------------------------------------------------------------------------
export function lankaqrPaymentInstructionsMessage(params, lang = 'en') {
  const {
    orderNumber,
    total,
    restaurant,
    qrPayload,
  } = params;

  const totalStr = formatPriceLocalized(total, lang);

  let body = t('lankaqr_title', lang);
  body += t('lankaqr_prompt', lang, { total: totalStr });
  body += t('lankaqr_bank_details', lang);

  if (restaurant.lankaqr_bank_name) {
    body += t('lankaqr_bank', lang, { bankName: restaurant.lankaqr_bank_name });
  }
  if (restaurant.lankaqr_merchant_name) {
    body += t('lankaqr_account_name', lang, { accountName: restaurant.lankaqr_merchant_name });
  }
  if (restaurant.lankaqr_account_number) {
    body += t('lankaqr_account_number', lang, { accountNumber: restaurant.lankaqr_account_number });
  }

  body += t('lankaqr_amount', lang, { total: totalStr });
  body += t('lankaqr_reference', lang, { orderNumber });
  body += t('lankaqr_raw_code', lang, { qrPayload });
  body += t('lankaqr_slip_note', lang);

  return {
    type: 'text',
    body,
  };
}

// ---------------------------------------------------------------------------
// Owner notification (always standard formatted with clear details)
// ---------------------------------------------------------------------------
export function ownerNotificationMessage(orderDetails) {
  const {
    orderNumber,
    customerName,
    customerPhone,
    orderType,
    paymentMethod = 'cod',
    paymentStatus = 'unpaid',
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
  const paymentLabels = {
    cod: '💵 Cash on Delivery',
    lankaqr: '📱 LankaQR (Transfer)',
  };

  const statusLabels = {
    unpaid: paymentMethod === 'lankaqr' ? '⏳ Pending Verification' : 'To Collect',
    paid_pending_verification: '⏳ Verification Needed',
    paid: '✅ Paid',
    refunded: '↩ Refunded',
  };

  const itemLines = items.map(
    (item) => `${item.quantity} × ${item.name} — ${formatPrice(item.price * item.quantity)}`
  );

  let body = `🔔 *NEW ORDER*\n\nOrder: *${orderNumber}*`;
  body += `\n\n👤 ${customerName}`;
  body += `\n📱 ${customerPhone}`;
  body += `\n📦 ${typeLabels[orderType] || orderType}`;
  body += `\n💳 ${paymentLabels[paymentMethod] || paymentMethod} (${statusLabels[paymentStatus] || paymentStatus})`;
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
export function invalidInputMessage(hint, lang = 'en') {
  return {
    type: 'text',
    body: t('invalid_input', lang, { hint: hint || t('choose_item', lang) }),
  };
}

export function cartClearedMessage(lang = 'en') {
  return {
    type: 'buttons',
    body: t('cart_cleared', lang),
    buttons: [
      { id: 'action_menu', title: t('btn_menu', lang) },
    ],
  };
}

export function orderCancelledMessage(lang = 'en') {
  return {
    type: 'buttons',
    body: t('order_cancelled', lang),
    buttons: [
      { id: 'action_menu', title: t('btn_menu', lang) },
      { id: 'action_cart', title: t('btn_cart', lang) },
    ],
  };
}

export function itemUnavailableMessage(lang = 'en') {
  return {
    type: 'buttons',
    body: t('item_unavailable', lang),
    buttons: [
      { id: 'action_menu', title: t('btn_menu', lang) },
      { id: 'action_cart', title: t('btn_cart', lang) },
    ],
  };
}
