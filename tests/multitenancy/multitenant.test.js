import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { seedDatabase } from '../../src/database/seed.js';
import { handleIncomingMessage } from '../../src/services/conversation.service.js';
import { getRestaurantByPhoneNumberId, getNextOrderNumber } from '../../src/services/restaurant.service.js';
import { getCategories, getItemsByCategory } from '../../src/services/menu.service.js';
import { getOrderById, getOrderByNumber } from '../../src/services/order.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, '../../src/database/schema.sql');

describe('Multi-Tenant Architecture & Data Isolation', () => {
  let db;

  beforeAll(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    const schema = readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);

    // Seed Restaurant 1 (Urban Bites)
    seedDatabase(db);

    // Onboard Restaurant 2 (Spicy Wok, Kandy) via SQL/configuration
    db.prepare(`
      INSERT INTO restaurants
        (id, name, phone_number, whatsapp_phone_number_id, owner_phone_number,
         address, city, currency, delivery_fee, order_prefix, lankaqr_enabled,
         lankaqr_merchant_name, lankaqr_merchant_id, lankaqr_bank_name,
         lankaqr_account_number, is_active)
      VALUES
        (2, 'Spicy Wok', '+94812345678', 'PHONE_ID_SPICY_WOK', '+94719998888',
         '15 Dalada Veediya, Kandy', 'Kandy', 'LKR', 450, 'SW', 1,
         'Spicy Wok Kandy', 'SWKANDY01', 'Hatton National Bank', '2000554433', 1)
    `).run();

    // Categories for Restaurant 2
    db.prepare(`
      INSERT INTO menu_categories (id, restaurant_id, name, name_si, emoji, display_order)
      VALUES
        (10, 2, 'Rice & Noodles', 'බත් සහ නූඩ්ල්ස්', '🍚', 1),
        (11, 2, 'Beverages', 'පාන වර්ග', '🧃', 2)
    `).run();

    // Menu items for Restaurant 2
    db.prepare(`
      INSERT INTO menu_items
        (id, restaurant_id, category_id, name, name_si, price, is_available, display_order)
      VALUES
        (100, 2, 10, 'Nasi Goreng', 'නාසි ගොරෙන්', 1400, 1, 1),
        (101, 2, 10, 'Chicken Kottu', 'චිකන් කොත්තු', 1100, 1, 2),
        (102, 2, 11, 'Lime Juice', 'දෙහි යුෂ', 350, 1, 1)
    `).run();
  });

  afterAll(() => {
    db.close();
  });

  it('correctly resolves each tenant by its unique WhatsApp Phone Number ID', () => {
    const r1 = getRestaurantByPhoneNumberId('DEMO_PHONE_NUMBER_ID', db);
    expect(r1).not.toBeNull();
    expect(r1.id).toBe(1);
    expect(r1.name).toBe('Urban Bites');
    expect(r1.city).toBe('Colombo');
    expect(r1.order_prefix).toBe('UB');

    const r2 = getRestaurantByPhoneNumberId('PHONE_ID_SPICY_WOK', db);
    expect(r2).not.toBeNull();
    expect(r2.id).toBe(2);
    expect(r2.name).toBe('Spicy Wok');
    expect(r2.city).toBe('Kandy');
    expect(r2.order_prefix).toBe('SW');
    expect(r2.delivery_fee).toBe(450);
  });

  it('menu categories and items are strictly isolated by restaurant_id', () => {
    const r1Cats = getCategories(1, db);
    const r2Cats = getCategories(2, db);

    expect(r1Cats.map(c => c.name)).toEqual(['Burgers', 'Sides', 'Drinks']);
    expect(r2Cats.map(c => c.name)).toEqual(['Rice & Noodles', 'Beverages']);

    const r1Items = getItemsByCategory(1, r1Cats[0].id, db);
    const r2Items = getItemsByCategory(2, r2Cats[0].id, db);

    expect(r1Items.map(i => i.name)).toContain('Classic Beef Burger');
    expect(r1Items.map(i => i.name)).not.toContain('Nasi Goreng');

    expect(r2Items.map(i => i.name)).toContain('Nasi Goreng');
    expect(r2Items.map(i => i.name)).not.toContain('Classic Beef Burger');
  });

  it('completes an order on Restaurant 2 without touching Restaurant 1 data', () => {
    const r2CustomerPhone = '94715554444';

    // 1. Greet Restaurant 2
    const welcome = handleIncomingMessage({
      restaurantId: 2,
      fromPhone: r2CustomerPhone,
      text: 'Hi',
    }, db);
    expect(welcome.replies[0].body).toContain('Welcome to *Spicy Wok*');

    // 2. View Menu
    const menu = handleIncomingMessage({
      restaurantId: 2,
      fromPhone: r2CustomerPhone,
      buttonId: 'action_menu',
    }, db);
    expect(menu.session.state).toBe('CATEGORY_SELECTION');

    // 3. Select Category 10 (Rice & Noodles)
    const catItems = handleIncomingMessage({
      restaurantId: 2,
      fromPhone: r2CustomerPhone,
      listRowId: 'category_10',
    }, db);
    expect(catItems.session.state).toBe('ITEM_SELECTION');
    expect(catItems.replies[0].body).toContain('Rice & Noodles');

    // 4. Select Item 100 (Nasi Goreng - Rs. 1400)
    const qtyPrompt = handleIncomingMessage({
      restaurantId: 2,
      fromPhone: r2CustomerPhone,
      listRowId: 'item_100',
    }, db);
    expect(qtyPrompt.session.state).toBe('ITEM_QUANTITY');
    expect(qtyPrompt.replies[0].body).toContain('Nasi Goreng');

    // 5. Choose Quantity 2
    const cart = handleIncomingMessage({
      restaurantId: 2,
      fromPhone: r2CustomerPhone,
      buttonId: 'qty_2',
    }, db);
    expect(cart.session.state).toBe('CART');
    expect(cart.session.cart).toHaveLength(1);
    expect(cart.session.cart[0].price).toBe(1400);

    // 6. Checkout
    const namePrompt = handleIncomingMessage({
      restaurantId: 2,
      fromPhone: r2CustomerPhone,
      buttonId: 'action_checkout',
    }, db);
    expect(namePrompt.session.state).toBe('CUSTOMER_NAME');

    // 7. Enter Name
    const typePrompt = handleIncomingMessage({
      restaurantId: 2,
      fromPhone: r2CustomerPhone,
      text: 'Kasun Perera',
    }, db);
    expect(typePrompt.session.state).toBe('ORDER_TYPE');

    // 8. Select Delivery
    const addrPrompt = handleIncomingMessage({
      restaurantId: 2,
      fromPhone: r2CustomerPhone,
      buttonId: 'type_delivery',
    }, db);
    expect(addrPrompt.session.state).toBe('DELIVERY_ADDRESS');

    // 9. Enter Delivery Address in Kandy
    const notesPrompt = handleIncomingMessage({
      restaurantId: 2,
      fromPhone: r2CustomerPhone,
      text: '24 Peradeniya Road, Kandy',
    }, db);
    expect(notesPrompt.session.state).toBe('NOTES');

    // 10. Skip Notes
    const payPrompt = handleIncomingMessage({
      restaurantId: 2,
      fromPhone: r2CustomerPhone,
      buttonId: 'notes_skip',
    }, db);
    expect(payPrompt.session.state).toBe('PAYMENT_METHOD');

    // 11. Select LankaQR
    const confirmPrompt = handleIncomingMessage({
      restaurantId: 2,
      fromPhone: r2CustomerPhone,
      buttonId: 'pay_lankaqr',
    }, db);
    expect(confirmPrompt.session.state).toBe('ORDER_CONFIRMATION');

    // Subtotal: 2 * 1400 = 2800. Delivery Fee for R2: 450. Total: 3250
    expect(confirmPrompt.replies[0].body).toContain('Rs. 2,800');
    expect(confirmPrompt.replies[0].body).toContain('Rs. 450');
    expect(confirmPrompt.replies[0].body).toContain('Rs. 3,250');

    // 12. Confirm Order
    const confirmed = handleIncomingMessage({
      restaurantId: 2,
      fromPhone: r2CustomerPhone,
      buttonId: 'confirm_yes',
    }, db);

    expect(confirmed.order).not.toBeNull();
    expect(confirmed.order.orderNumber).toBe('SW-1001');
    expect(confirmed.order.subtotal).toBe(2800);
    expect(confirmed.order.deliveryFee).toBe(450);
    expect(confirmed.order.total).toBe(3250);

    // Verify owner notification recipient is Restaurant 2's owner
    expect(confirmed.ownerNotification).not.toBeNull();
    expect(confirmed.ownerNotification.to).toBe('+94719998888');
    expect(confirmed.ownerNotification.message.body).toContain('SW-1001');
    expect(confirmed.ownerNotification.message.body).toContain('Kasun Perera');
    expect(confirmed.ownerNotification.message.body).toContain('24 Peradeniya Road, Kandy');

    // Verify LankaQR instructions contain Restaurant 2's bank & city
    const lankaQrReply = confirmed.replies[1];
    expect(lankaQrReply.body).toContain('Hatton National Bank');
    expect(lankaQrReply.body).toContain('SWKANDY01');
    expect(lankaQrReply.body).toContain('SW-1001');

    // Verify Restaurant 1 orders are untouched
    const r1Orders = db.prepare('SELECT * FROM orders WHERE restaurant_id = 1').all();
    expect(r1Orders).toHaveLength(0);

    const r2Orders = db.prepare('SELECT * FROM orders WHERE restaurant_id = 2').all();
    expect(r2Orders).toHaveLength(1);
    expect(r2Orders[0].order_number).toBe('SW-1001');
  });
});
