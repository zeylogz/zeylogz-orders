import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import app from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { initializeDatabase, closeDatabase } from '../../src/database/db.js';
import { seedDatabase } from '../../src/database/seed.js';
import { getMockSentMessages, clearMockSentMessages } from '../../src/services/whatsapp.service.js';

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

describe('Meta Webhook Integration (/webhook)', () => {
  describe('GET /webhook (Verification Challenge)', () => {
    it('returns challenge with 200 when verify token matches', async () => {
      const challenge = 'test_challenge_12345';
      const url = `${baseUrl}/webhook?hub.mode=subscribe&hub.verify_token=${env.META_VERIFY_TOKEN}&hub.challenge=${challenge}`;
      const res = await fetch(url);

      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe(challenge);
    });

    it('returns 403 when verify token does not match', async () => {
      const url = `${baseUrl}/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test`;
      const res = await fetch(url);

      expect(res.status).toBe(403);
    });

    it('returns 403 when mode is not subscribe', async () => {
      const url = `${baseUrl}/webhook?hub.mode=publish&hub.verify_token=${env.META_VERIFY_TOKEN}&hub.challenge=test`;
      const res = await fetch(url);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /webhook (Incoming Events & Idempotency)', () => {
    const testMessageId = `wamid.msg_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    it('processes incoming WhatsApp text message and sends reply', async () => {
      const payload = {
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
                      from: '94770005555',
                      id: testMessageId,
                      timestamp: '1725370000',
                      type: 'text',
                      text: { body: 'Hi' },
                    },
                  ],
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

      // Poll briefly for async webhook processing to complete
      let sent = [];
      for (let i = 0; i < 20; i++) {
        sent = getMockSentMessages();
        if (sent.length > 0) break;
        await new Promise((r) => setTimeout(r, 25));
      }

      expect(sent.length).toBeGreaterThanOrEqual(1);
      expect(sent[0].to).toBe('94770005555');
      expect(sent[0].type).toBe('interactive');
      expect(sent[0].interactive.body.text).toContain('Welcome to *Urban Bites*');
    });

    it('IDEMPOTENCY: duplicate webhook message ID is NOT re-processed', async () => {
      const payload = {
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
                      from: '94770005555',
                      id: testMessageId, // Same ID as previous test
                      timestamp: '1725370000',
                      type: 'text',
                      text: { body: 'Hi' },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };


      clearMockSentMessages();

      const res = await fetch(`${baseUrl}/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(200);
      await new Promise((r) => setTimeout(r, 50));

      // Should be 0 since message ID wamid.msg_test_001 was already marked as processed
      const sent = getMockSentMessages();
      expect(sent).toHaveLength(0);
    });

    it('ignores status notifications safely without errors', async () => {
      const statusPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { phone_number_id: 'DEMO_PHONE_NUMBER_ID' },
                  statuses: [{ id: 'wamid.123', status: 'delivered' }],
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
        body: JSON.stringify(statusPayload),
      });

      expect(res.status).toBe(200);
    });
  });
});
