import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb } from '../helpers/db.helper.js';
import { handleIncomingMessage } from '../../src/services/conversation.service.js';
import { getOrderByNumber } from '../../src/services/order.service.js';

let db;
const RESTAURANT_ID = 1;
const CUSTOMER_PHONE = '94771234567';

beforeAll(() => {
  db = createTestDb();
});

afterAll(() => {
  db.close();
});

describe('Conversation State Machine', () => {
  it('Step 1-2: "Hi" sends welcome message in WELCOME state', () => {
    const res = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: CUSTOMER_PHONE,
      text: 'Hi',
    }, db);

    expect(res.replies).toHaveLength(1);
    expect(res.replies[0].type).toBe('buttons');
    expect(res.replies[0].body).toContain('Welcome to *Urban Bites*');
    expect(res.session.state).toBe('WELCOME');
  });

  it('Step 3-4: Customer clicks View Menu -> CATEGORY_SELECTION', () => {
    const res = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: CUSTOMER_PHONE,
      buttonId: 'action_menu',
    }, db);

    expect(res.replies).toHaveLength(1);
    expect(res.replies[0].type).toBe('list');
    expect(res.replies[0].body).toContain('Our Menu');
    expect(res.session.state).toBe('CATEGORY_SELECTION');
  });

  it('Step 5-6: Customer selects category (Burgers) -> ITEM_SELECTION', () => {
    const res = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: CUSTOMER_PHONE,
      listRowId: 'category_1', // Burgers
    }, db);

    expect(res.replies).toHaveLength(1);
    expect(res.replies[0].type).toBe('list');
    expect(res.replies[0].body).toContain('Burgers');
    expect(res.session.state).toBe('ITEM_SELECTION');
    expect(res.session.context.selectedCategoryId).toBe(1);
  });

  it('Step 7-8: Customer selects item (Classic Beef Burger) -> ITEM_QUANTITY', () => {
    const res = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: CUSTOMER_PHONE,
      listRowId: 'item_1', // Classic Beef Burger (850 LKR)
    }, db);

    expect(res.replies).toHaveLength(1);
    expect(res.replies[0].type).toBe('buttons');
    expect(res.replies[0].body).toContain('Classic Beef Burger');
    expect(res.replies[0].body).toContain('Rs. 850');
    expect(res.session.state).toBe('ITEM_QUANTITY');
    expect(res.session.context.selectedItemId).toBe(1);
  });

  it('Step 9-10: Customer selects quantity 2 -> adds to cart, state is CART', () => {
    const res = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: CUSTOMER_PHONE,
      buttonId: 'qty_2',
    }, db);

    expect(res.replies).toHaveLength(1);
    expect(res.replies[0].body).toContain('Added 2 × *Classic Beef Burger*');
    expect(res.replies[0].body).toContain('Subtotal: Rs. 1,700');
    expect(res.session.state).toBe('CART');
    expect(res.session.cart).toHaveLength(1);
    expect(res.session.cart[0].quantity).toBe(2);
  });

  it('Step 11: Customer clicks Add More -> goes back to CATEGORY_SELECTION', () => {
    const res = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: CUSTOMER_PHONE,
      buttonId: 'action_add_more',
    }, db);

    expect(res.replies[0].type).toBe('list');
    expect(res.session.state).toBe('CATEGORY_SELECTION');
  });

  it('Customer adds French Fries (Sides -> Fries -> Qty 1)', () => {
    // Select Sides (category 2)
    handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: CUSTOMER_PHONE,
      listRowId: 'category_2',
    }, db);

    // Select French Fries (item 4)
    handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: CUSTOMER_PHONE,
      listRowId: 'item_4',
    }, db);

    // Enter quantity 1 by typing "1"
    const res = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: CUSTOMER_PHONE,
      text: '1',
    }, db);

    expect(res.session.cart).toHaveLength(2);
    // Subtotal: 1700 + 450 = 2150
    expect(res.replies[0].body).toContain('Subtotal: Rs. 2,150');
    expect(res.session.state).toBe('CART');
  });

  it('Step 12: Customer clicks Checkout -> prompts for CUSTOMER_NAME', () => {
    const res = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: CUSTOMER_PHONE,
      buttonId: 'action_checkout',
    }, db);

    expect(res.replies[0].body).toContain('Please type your name');
    expect(res.session.state).toBe('CUSTOMER_NAME');
  });

  it('Customer enters name -> prompts for ORDER_TYPE', () => {
    const res = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: CUSTOMER_PHONE,
      text: 'John Doe',
    }, db);

    expect(res.replies[0].type).toBe('buttons');
    expect(res.replies[0].body).toContain('How would you like to receive your order');
    expect(res.session.state).toBe('ORDER_TYPE');
    expect(res.session.context.customerName).toBe('John Doe');
  });

  it('Step 13-14: Customer selects Delivery -> prompts for DELIVERY_ADDRESS', () => {
    const res = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: CUSTOMER_PHONE,
      buttonId: 'type_delivery',
    }, db);

    expect(res.replies[0].body).toContain('Please type your delivery address');
    expect(res.session.state).toBe('DELIVERY_ADDRESS');
    expect(res.session.context.orderType).toBe('delivery');
  });

  it('Customer enters address -> prompts for NOTES', () => {
    const res = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: CUSTOMER_PHONE,
      text: '123 Havelock Road, Colombo 05',
    }, db);

    expect(res.replies[0].body).toContain('special instructions or notes');
    expect(res.session.state).toBe('NOTES');
    expect(res.session.context.deliveryAddress).toBe('123 Havelock Road, Colombo 05');
  });

  it('Step 16: Customer skips notes -> prompts for PAYMENT_METHOD', () => {
    const res = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: CUSTOMER_PHONE,
      buttonId: 'notes_skip',
    }, db);

    expect(res.replies[0].type).toBe('buttons');
    expect(res.replies[0].body).toContain('Payment Method');
    expect(res.session.state).toBe('PAYMENT_METHOD');
  });

  it('Step 17: Customer selects Cash -> displays final order summary with confirm buttons', () => {
    const res = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: CUSTOMER_PHONE,
      buttonId: 'pay_cod',
    }, db);

    expect(res.replies[0].type).toBe('buttons');
    expect(res.replies[0].body).toContain('Order Summary');
    expect(res.replies[0].body).toContain('2 × Classic Beef Burger');
    expect(res.replies[0].body).toContain('1 × French Fries');
    expect(res.replies[0].body).toContain('Subtotal: Rs. 2,150');
    expect(res.replies[0].body).toContain('Delivery: Rs. 300');
    expect(res.replies[0].body).toContain('Total: Rs. 2,450');
    expect(res.replies[0].body).toContain('Cash on Delivery');
    expect(res.replies[0].body).toContain('123 Havelock Road, Colombo 05');
    expect(res.session.state).toBe('ORDER_CONFIRMATION');
    expect(res.session.context.paymentMethod).toBe('cod');
  });

  it('Step 18-20: Customer confirms order -> creates order and notifies restaurant owner', () => {
    const res = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: CUSTOMER_PHONE,
      buttonId: 'confirm_yes',
    }, db);

    // Customer receives order confirmation
    expect(res.replies).toHaveLength(1);
    expect(res.replies[0].body).toContain('Order received');
    expect(res.replies[0].body).toContain('UB-');
    expect(res.replies[0].body).toContain('Rs. 2,450');

    // Restaurant owner notification generated
    expect(res.ownerNotification).not.toBeNull();
    expect(res.ownerNotification.to).toBe('+94770000000');
    expect(res.ownerNotification.message.body).toContain('NEW ORDER');
    expect(res.ownerNotification.message.body).toContain('John Doe');
    expect(res.ownerNotification.message.body).toContain('TOTAL: Rs. 2,450');
    expect(res.ownerNotification.message.body).toContain('Cash on Delivery');

    // Order exists in database
    expect(res.order).not.toBeNull();
    const dbOrder = getOrderByNumber(res.order.orderNumber, RESTAURANT_ID, db);
    expect(dbOrder).not.toBeNull();
    expect(dbOrder.total).toBe(2450);
    expect(dbOrder.payment_method).toBe('cod');
    expect(dbOrder.status).toBe('pending');
  });

  it('LankaQR flow generates payment instructions and notifies owner with pending verification', () => {
    const phone = '94771112233';

    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, text: 'Hi' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, buttonId: 'action_menu' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, listRowId: 'category_1' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, listRowId: 'item_1' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, buttonId: 'qty_1' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, buttonId: 'action_checkout' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, text: 'Nimal' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, buttonId: 'type_pickup' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, buttonId: 'notes_skip' }, db);

    // Choose LankaQR
    const payRes = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: phone,
      buttonId: 'pay_lankaqr',
    }, db);

    expect(payRes.session.state).toBe('ORDER_CONFIRMATION');
    expect(payRes.session.context.paymentMethod).toBe('lankaqr');
    expect(payRes.replies[0].body).toContain('LankaQR');

    // Confirm order
    const confirmRes = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: phone,
      buttonId: 'confirm_yes',
    }, db);

    // Customer should receive 2 messages:
    // 1. Order confirmation
    // 2. LankaQR payment instructions with bank details & raw QR code
    expect(confirmRes.replies).toHaveLength(2);
    expect(confirmRes.replies[0].body).toContain('Order received');
    expect(confirmRes.replies[1].body).toContain('LANKAQR PAYMENT');
    expect(confirmRes.replies[1].body).toContain('Commercial Bank of Ceylon');
    expect(confirmRes.replies[1].body).toContain('1000456789');
    expect(confirmRes.replies[1].body).toContain('Rs. 850');

    // Owner notification
    expect(confirmRes.ownerNotification.message.body).toContain('LankaQR');
    expect(confirmRes.ownerNotification.message.body).toContain('Pending Verification');

    // Order in DB
    expect(confirmRes.order.paymentMethod).toBe('lankaqr');
    expect(confirmRes.order.paymentStatus).toBe('unpaid');
  });

  it('Pickup flow skips delivery address and sets delivery fee to 0', () => {
    const phone = '94779998877';

    // Start with welcome -> view menu
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, text: 'Hi' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, buttonId: 'action_menu' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, listRowId: 'category_1' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, listRowId: 'item_1' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, buttonId: 'qty_1' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, buttonId: 'action_checkout' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, text: 'Sarah' }, db);

    // Choose Pickup
    const pickupRes = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: phone,
      buttonId: 'type_pickup',
    }, db);

    // Should skip address and go directly to NOTES
    expect(pickupRes.session.state).toBe('NOTES');

    // Add a note -> goes to PAYMENT_METHOD
    const notesRes = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: phone,
      text: 'Pack extra ketchup please',
    }, db);

    expect(notesRes.session.state).toBe('PAYMENT_METHOD');

    // Select Cash
    const payRes = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: phone,
      buttonId: 'pay_cod',
    }, db);

    expect(payRes.session.state).toBe('ORDER_CONFIRMATION');
    expect(payRes.replies[0].body).toContain('Pack extra ketchup please');
    expect(payRes.replies[0].body).not.toContain('Delivery:'); // Delivery fee should be 0

    // Confirm
    const confirmRes = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: phone,
      buttonId: 'confirm_yes',
    }, db);

    expect(confirmRes.order.total).toBe(850);
    expect(confirmRes.order.orderType).toBe('pickup');
    expect(confirmRes.order.notes).toBe('Pack extra ketchup please');
  });


  it('Cancellation preserves cart and returns to CART state', () => {
    const phone = '94770001122';

    // Setup order up to confirmation
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, text: 'Hi' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, buttonId: 'action_menu' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, listRowId: 'category_1' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, listRowId: 'item_1' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, buttonId: 'qty_1' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, buttonId: 'action_checkout' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, text: 'Bob' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, buttonId: 'type_pickup' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, buttonId: 'notes_skip' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, buttonId: 'pay_cod' }, db);

    // Cancel order
    const cancelRes = handleIncomingMessage({

      restaurantId: RESTAURANT_ID,
      fromPhone: phone,
      buttonId: 'confirm_cancel',
    }, db);

    expect(cancelRes.session.state).toBe('CART');
    expect(cancelRes.session.cart).toHaveLength(1);
    expect(cancelRes.replies[0].body).toContain('cancelled');
    expect(cancelRes.order).toBeNull();
  });

  it('Global "reset" resets session to WELCOME and clears cart', () => {
    const phone = '94770001122';

    const res = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: phone,
      text: 'reset',
    }, db);

    expect(res.session.state).toBe('WELCOME');
    expect(res.session.cart).toHaveLength(0);
    expect(res.replies[0].body).toContain('Welcome to *Urban Bites*');
  });

  it('Invalid input in CATEGORY_SELECTION keeps user in CATEGORY_SELECTION', () => {
    const phone = '94778887766';

    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, text: 'Hi' }, db);
    handleIncomingMessage({ restaurantId: RESTAURANT_ID, fromPhone: phone, buttonId: 'action_menu' }, db);

    const invalidRes = handleIncomingMessage({
      restaurantId: RESTAURANT_ID,
      fromPhone: phone,
      text: 'gibberish xyz',
    }, db);

    expect(invalidRes.session.state).toBe('CATEGORY_SELECTION');
    expect(invalidRes.replies[0].body).toContain("didn't understand");
    expect(invalidRes.replies[1].type).toBe('list');
  });
});
