import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../../src/app.js';
import { initializeDatabase, closeDatabase } from '../../src/database/db.js';
import { seedDatabase } from '../../src/database/seed.js';

let server;
let baseUrl;

beforeAll(async () => {
  // Ensure DB is initialized for app
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

describe('Dev Messaging API (/api/dev)', () => {
  const testPhone = '94770009999';

  it('POST /api/dev/reset resets the session', async () => {
    const res = await fetch(`${baseUrl}/api/dev/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: 1,
        phoneNumber: testPhone,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.session.state).toBe('WELCOME');
  });

  it('POST /api/dev/message simulates incoming customer text "Hi"', async () => {
    const res = await fetch(`${baseUrl}/api/dev/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: 1,
        phoneNumber: testPhone,
        message: 'Hi',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.currentState).toBe('WELCOME');
    expect(data.replies).toHaveLength(1);
    expect(data.replies[0].body).toContain('Urban Bites');
  });

  it('POST /api/dev/message simulates button click for View Menu', async () => {
    const res = await fetch(`${baseUrl}/api/dev/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: 1,
        phoneNumber: testPhone,
        buttonId: 'action_menu',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.currentState).toBe('CATEGORY_SELECTION');
    expect(data.replies[0].type).toBe('list');
  });

  it('GET /api/dev/session returns current session status', async () => {
    const res = await fetch(`${baseUrl}/api/dev/session?restaurantId=1&phoneNumber=${testPhone}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.session.state).toBe('CATEGORY_SELECTION');
  });
});
