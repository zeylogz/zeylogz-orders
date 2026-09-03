# WhatsApp Ordering SaaS

A WhatsApp-based ordering system for Sri Lankan small businesses. Customers place orders through WhatsApp conversations — no app downloads, no marketplace fees.

## Features (MVP Roadmap)

- [x] **Phase A** — Project setup, Express server, health check
- [ ] **Phase B** — SQLite database & seed data
- [ ] **Phase C** — Menu service
- [ ] **Phase D** — Cart service
- [ ] **Phase E** — Order service
- [ ] **Phase F** — Conversation state machine
- [ ] **Phase G** — Local dev messaging endpoint
- [ ] **Phase H** — WhatsApp service abstraction
- [ ] **Phase I** — Meta webhook integration
- [ ] **Phase J** — End-to-end testing
- [ ] **Phase K** — Deployment preparation

## Architecture

```
Customer WhatsApp
  → Meta WhatsApp Cloud API
    → Webhook (POST /webhook)
      → Node.js/Express backend
        → Conversation state machine
          → SQLite database
            → Restaurant owner notification
              → Customer confirmation
```

## Tech Stack

| Layer       | Technology            |
|-------------|----------------------|
| Runtime     | Node.js              |
| Framework   | Express.js           |
| Language    | JavaScript (ES modules) |
| Database    | SQLite (better-sqlite3) |
| Validation  | Zod                  |
| Testing     | Vitest               |
| WhatsApp    | Meta Cloud API       |

## Project Structure

```
├── src/
│   ├── server.js              # Entry point — starts HTTP server
│   ├── app.js                 # Express app factory
│   ├── config/
│   │   └── env.js             # Environment validation (Zod)
│   ├── routes/
│   │   ├── health.routes.js   # GET /health
│   │   └── webhook.routes.js  # GET & POST /webhook (stubs)
│   ├── middleware/
│   │   └── error.middleware.js
│   └── utils/
│       ├── logger.js          # Structured logging
│       └── formatting.js      # LKR formatting, order numbers
├── tests/
│   ├── app.test.js            # Integration tests
│   └── utils/
│       └── formatting.test.js # Unit tests
├── data/                      # SQLite database (gitignored)
├── .env.example               # Environment template
├── .gitignore
├── vitest.config.js
└── package.json
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server (with hot reload)
npm run dev

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Health Check

```bash
curl http://localhost:3000/health
```

Returns:

```json
{
  "status": "ok",
  "timestamp": "2026-09-03T13:00:00.000Z",
  "uptime": 42.5
}
```

## Environment Variables

| Variable                | Description                          | Default         |
|-------------------------|--------------------------------------|-----------------|
| `PORT`                  | Server port                          | `3000`          |
| `NODE_ENV`              | Environment (development/production) | `development`   |
| `META_VERIFY_TOKEN`     | Webhook verification token           | —               |
| `META_ACCESS_TOKEN`     | Meta Graph API access token          | —               |
| `META_PHONE_NUMBER_ID`  | WhatsApp phone number ID             | —               |
| `META_WABA_ID`          | WhatsApp Business Account ID         | —               |
| `META_GRAPH_API_VERSION`| Graph API version                    | `v21.0`         |
| `META_APP_SECRET`       | App secret for webhook verification  | —               |
| `DB_PATH`               | SQLite database file path            | `./data/ordering.db` |
| `LOG_LEVEL`             | Logging level                        | `info`          |

## Meta WhatsApp Setup

> **Not yet implemented.** Webhook routes are stubbed. Full integration comes in Phase I.

1. Create a Meta Developer account at [developers.facebook.com](https://developers.facebook.com)
2. Create a WhatsApp Business App
3. Get your access token, phone number ID, and business account ID
4. Set your webhook URL to `https://your-domain.com/webhook`
5. Set the verify token to match `META_VERIFY_TOKEN` in your `.env`

## Deployment Notes

- The app binds to `0.0.0.0` for container compatibility
- Handles `SIGTERM`/`SIGINT` for graceful shutdown
- Uses `PORT` env var (works with Render, Railway, Fly.io, etc.)
- **SQLite caveat:** Requires persistent disk. If your host doesn't support persistent storage, migrate to PostgreSQL.

## Future Roadmap

| Version | Feature                    |
|---------|----------------------------|
| v1      | WhatsApp ordering          |
| v2      | Restaurant dashboard       |
| v3      | LankaQR / payment gateway  |
| v4      | Order analytics            |
| v5      | Automated marketing        |
| v6      | Salon/clinic booking       |

## License

ISC
