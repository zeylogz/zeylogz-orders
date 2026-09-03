import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/app.js';

let server;
let baseUrl;

beforeAll(async () => {
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
});

describe('Health endpoint', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    expect(body.uptime).toBeTypeOf('number');
  });
});

describe('Webhook verification & handling', () => {
  it('GET /webhook returns 403 without verify token', async () => {
    const res = await fetch(`${baseUrl}/webhook`);
    expect(res.status).toBe(403);
  });

  it('POST /webhook returns 200', async () => {
    const res = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
  });
});


describe('Error handling', () => {
  it('unknown route returns 404', async () => {
    const res = await fetch(`${baseUrl}/nonexistent`);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error.message).toBe('Not found');
  });
});
