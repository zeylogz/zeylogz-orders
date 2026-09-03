import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import app from '../../src/app.js';
import { initializeDatabase, closeDatabase } from '../../src/database/db.js';
import { seedDatabase } from '../../src/database/seed.js';
import { getMockSentMessages, clearMockSentMessages } from '../../src/services/whatsapp.service.js';
import { getOrderByNumber } from '../../src/services/order.service.js';

let server;
let baseUrl;

beforeAll(async () => {
  const db = initializeDatabase();
  seedDatabase(db);

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  closeDatabase();
});

beforeEach(() => {
  clearMockSentMessages();
});

// Helper to simulate incoming WhatsApp webhook call
async function postWebhookMessage({ from, text, buttonId, listRowId, messageId = `msg_${Date.now()}_${Math.random()}` }) {
  let messageObj = {
    from,
    id: messageId,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };

  if (buttonId) {
    messageObj.type = 'interactive';
    messageObj.interactive = {
      type: 'button_reply',
      button_reply: { id: buttonId, title: text || buttonId },
    };
  } else if (listRowId) {
    messageObj.type = 'interactive';
    messageObj.interactive = {
      type: 'list_reply',
      list_reply: { id: listRowId, title: text || listRowId },
    };
  } else {
    messageObj.type = 'text';
    messageObj.text = { body: text };
  }

  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: 'DEMO_PHONE_NUMBER_ID' },
              messages: [messageObj],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  const res = await fetch(`${baseUrl}/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  expect(res.status).toBe(200);
  // Allow async webhook message processing to complete
  await new Promise((r) => setTimeout(r, 60));
  return getMockSentMessages();
}

describe('End-to-End WhatsApp Customer Journey', () => {
  const customerPhone = '94773334455';

  it('completes the entire customer order journey via POST /webhook', async () => {
    // 1. Customer sends "Hi"
    let sent = await postWebhookMessage({ from: customerPhone, text: 'Hi' });
    expect(sent.length).toBeGreaterThanOrEqual(1);
    expect(sent[sent.length - 1].interactive.body.text).toContain('Welcome to *Urban Bites*');

    // 2. Customer clicks "View Menu"
    clearMockSentMessages();
    sent = await postWebhookMessage({ from: customerPhone, buttonId: 'action_menu', text: '🍔 View Menu' });
    expect(sent[sent.length - 1].interactive.type).toBe('list');
    expect(sent[sent.length - 1].interactive.body.text).toContain('Our Menu');

    // 3. Customer selects category "Burgers"
    clearMockSentMessages();
    sent = await postWebhookMessage({ from: customerPhone, listRowId: 'category_1', text: 'Burgers' });
    expect(sent[sent.length - 1].interactive.type).toBe('list');
    expect(sent[sent.length - 1].interactive.body.text).toContain('Burgers');

    // 4. Customer selects "Cheese Burger" (item 3, Rs. 950)
    clearMockSentMessages();
    sent = await postWebhookMessage({ from: customerPhone, listRowId: 'item_3', text: 'Cheese Burger' });
    expect(sent[sent.length - 1].interactive.type).toBe('button');
    expect(sent[sent.length - 1].interactive.body.text).toContain('Cheese Burger');
    expect(sent[sent.length - 1].interactive.body.text).toContain('Rs. 950');

    // 5. Customer selects quantity 2
    clearMockSentMessages();
    sent = await postWebhookMessage({ from: customerPhone, buttonId: 'qty_2', text: '2' });
    expect(sent[sent.length - 1].interactive.body.text).toContain('Added 2 × *Cheese Burger*');
    expect(sent[sent.length - 1].interactive.body.text).toContain('Subtotal: Rs. 1,900');

    // 6. Customer clicks "Checkout"
    clearMockSentMessages();
    sent = await postWebhookMessage({ from: customerPhone, buttonId: 'action_checkout', text: '✅ Checkout' });
    expect(sent[sent.length - 1].text.body).toContain('Please type your name');

    // 7. Customer enters name: "Anura Silva"
    clearMockSentMessages();
    sent = await postWebhookMessage({ from: customerPhone, text: 'Anura Silva' });
    expect(sent[sent.length - 1].interactive.body.text).toContain('How would you like to receive your order');

    // 8. Customer chooses "Delivery"
    clearMockSentMessages();
    sent = await postWebhookMessage({ from: customerPhone, buttonId: 'type_delivery', text: '🚚 Delivery' });
    expect(sent[sent.length - 1].text.body).toContain('Please type your delivery address');

    // 9. Customer types delivery address
    clearMockSentMessages();
    sent = await postWebhookMessage({ from: customerPhone, text: '88 Galle Road, Mount Lavinia' });
    expect(sent[sent.length - 1].interactive.body.text).toContain('special instructions or notes');

    // 10. Customer types note
    clearMockSentMessages();
    sent = await postWebhookMessage({ from: customerPhone, text: 'Call when arriving at the gate' });
    expect(sent[sent.length - 1].interactive.body.text).toContain('Order Summary');
    expect(sent[sent.length - 1].interactive.body.text).toContain('Cheese Burger');
    expect(sent[sent.length - 1].interactive.body.text).toContain('Subtotal: Rs. 1,900');
    expect(sent[sent.length - 1].interactive.body.text).toContain('Delivery: Rs. 300');
    expect(sent[sent.length - 1].interactive.body.text).toContain('Total: Rs. 2,200');
    expect(sent[sent.length - 1].interactive.body.text).toContain('Call when arriving at the gate');

    // 11. Customer confirms order
    clearMockSentMessages();
    sent = await postWebhookMessage({ from: customerPhone, buttonId: 'confirm_yes', text: '✅ Confirm' });

    // Should send 2 messages:
    // 1. Customer order confirmation
    // 2. Restaurant owner notification
    expect(sent.length).toBe(2);

    const customerConfirmation = sent.find((m) => m.to === customerPhone);
    expect(customerConfirmation).toBeDefined();
    expect(customerConfirmation.text.body).toContain('Order received');
    expect(customerConfirmation.text.body).toContain('Rs. 2,200');

    const ownerNotification = sent.find((m) => m.to === '94770000000');
    expect(ownerNotification).toBeDefined();
    expect(ownerNotification.text.body).toContain('NEW ORDER');
    expect(ownerNotification.text.body).toContain('Anura Silva');
    expect(ownerNotification.text.body).toContain('TOTAL: Rs. 2,200');
    expect(ownerNotification.text.body).toContain('88 Galle Road, Mount Lavinia');
  });
});
