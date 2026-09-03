import { describe, it, expect, beforeEach } from 'vitest';
import {
  sendTextMessage,
  sendInteractiveButtons,
  sendInteractiveList,
  sendFormattedMessage,
  parseIncomingWebhook,
  getMockSentMessages,
  clearMockSentMessages,
} from '../../src/services/whatsapp.service.js';

describe('WhatsApp Service Abstraction', () => {
  beforeEach(() => {
    clearMockSentMessages();
  });

  it('sendTextMessage queues message in mock mode', async () => {
    const res = await sendTextMessage('94771234567', 'Hello from test');
    expect(res.mock).toBe(true);
    expect(res.success).toBe(true);

    const queued = getMockSentMessages();
    expect(queued).toHaveLength(1);
    expect(queued[0].to).toBe('94771234567');
    expect(queued[0].type).toBe('text');
    expect(queued[0].text.body).toBe('Hello from test');
  });

  it('sendInteractiveButtons validates and truncates button titles to 20 chars', async () => {
    const buttons = [
      { id: 'btn_1', title: 'A very long button title that exceeds limits' },
      { id: 'btn_2', title: 'Short' },
    ];

    await sendInteractiveButtons('94771234567', 'Choose one:', buttons, 'Footer note');

    const queued = getMockSentMessages();
    expect(queued).toHaveLength(1);
    expect(queued[0].type).toBe('interactive');
    expect(queued[0].interactive.type).toBe('button');
    expect(queued[0].interactive.action.buttons[0].reply.title.length).toBeLessThanOrEqual(20);
    expect(queued[0].interactive.action.buttons[1].reply.title).toBe('Short');
    expect(queued[0].interactive.footer.text).toBe('Footer note');
  });

  it('sendInteractiveList formats list message', async () => {
    const sections = [
      {
        title: 'Burgers',
        rows: [
          { id: 'item_1', title: 'Classic Beef Burger', description: 'Rs. 850' },
        ],
      },
    ];

    await sendInteractiveList('94771234567', 'Select an item', 'View Items', sections);

    const queued = getMockSentMessages();
    expect(queued).toHaveLength(1);
    expect(queued[0].type).toBe('interactive');
    expect(queued[0].interactive.type).toBe('list');
    expect(queued[0].interactive.action.button).toBe('View Items');
    expect(queued[0].interactive.action.sections[0].title).toBe('Burgers');
  });

  it('sendFormattedMessage dispatches based on message type', async () => {
    await sendFormattedMessage('94771234567', {
      type: 'text',
      body: 'Testing format dispatch',
    });

    const queued = getMockSentMessages();
    expect(queued).toHaveLength(1);
    expect(queued[0].type).toBe('text');
  });

  it('parseIncomingWebhook extracts text message correctly', () => {
    const webhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '123456',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '15550234567',
                  phone_number_id: 'DEMO_PHONE_NUMBER_ID',
                },
                contacts: [{ profile: { name: 'Alice' }, wa_id: '94771234567' }],
                messages: [
                  {
                    from: '94771234567',
                    id: 'wamid.HBgLMTIzNDU2',
                    timestamp: '1725370000',
                    text: { body: 'Hi' },
                    type: 'text',
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const parsed = parseIncomingWebhook(webhookPayload);
    expect(parsed).not.toBeNull();
    expect(parsed.phoneNumberId).toBe('DEMO_PHONE_NUMBER_ID');
    expect(parsed.messageId).toBe('wamid.HBgLMTIzNDU2');
    expect(parsed.from).toBe('94771234567');
    expect(parsed.type).toBe('text');
    expect(parsed.text).toBe('Hi');
  });

  it('parseIncomingWebhook extracts button_reply interactive message', () => {
    const webhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { phone_number_id: 'DEMO_PHONE_NUMBER_ID' },
                messages: [
                  {
                    from: '94771234567',
                    id: 'wamid.HBgLMTIzNDU3',
                    timestamp: '1725370010',
                    type: 'interactive',
                    interactive: {
                      type: 'button_reply',
                      button_reply: {
                        id: 'action_menu',
                        title: '🍔 View Menu',
                      },
                    },
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const parsed = parseIncomingWebhook(webhookPayload);
    expect(parsed).not.toBeNull();
    expect(parsed.buttonId).toBe('action_menu');
    expect(parsed.text).toBe('🍔 View Menu');
  });

  it('parseIncomingWebhook extracts list_reply interactive message', () => {
    const webhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { phone_number_id: 'DEMO_PHONE_NUMBER_ID' },
                messages: [
                  {
                    from: '94771234567',
                    id: 'wamid.HBgLMTIzNDU4',
                    timestamp: '1725370020',
                    type: 'interactive',
                    interactive: {
                      type: 'list_reply',
                      list_reply: {
                        id: 'category_1',
                        title: '🍔 Burgers',
                        description: 'Delicious burgers',
                      },
                    },
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const parsed = parseIncomingWebhook(webhookPayload);
    expect(parsed).not.toBeNull();
    expect(parsed.listRowId).toBe('category_1');
    expect(parsed.text).toBe('🍔 Burgers');
  });

  it('parseIncomingWebhook returns null for status updates (sent, delivered, read)', () => {
    const statusPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { phone_number_id: 'DEMO_PHONE_NUMBER_ID' },
                statuses: [
                  {
                    id: 'wamid.HBgLMTIzNDU2',
                    status: 'delivered',
                    timestamp: '1725370005',
                    recipient_id: '94771234567',
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const parsed = parseIncomingWebhook(statusPayload);
    expect(parsed).toBeNull();
  });

  it('parseIncomingWebhook returns null for malformed or empty payloads', () => {
    expect(parseIncomingWebhook(null)).toBeNull();
    expect(parseIncomingWebhook({})).toBeNull();
    expect(parseIncomingWebhook({ object: 'user' })).toBeNull();
  });
});
