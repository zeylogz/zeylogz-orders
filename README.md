# Zeylogz Orders — WhatsApp Ordering SaaS for Sri Lanka

A lightweight, multi-tenant WhatsApp ordering SaaS platform built by **Zeylogz** for independent restaurants, cafes, bakeries, and cloud kitchens in Sri Lanka. Customers browse interactive menus, build carts, choose delivery or pickup, and place orders directly inside WhatsApp without downloading mobile apps or paying 20%–30% food aggregator commissions.

---

## 1. Product Overview

**Zeylogz Orders** enables Sri Lankan food businesses to receive direct customer orders via WhatsApp with full automation:
- **Bilingual (English & Sinhala / සිංහල)**: One-tap language toggle (`[🇱🇰 සිංහල]`), complete localized catalogs, prompts, and Sinhala rupee formatting (`රු.`).
- **Zero App Download**: Customers order directly inside WhatsApp using modern interactive buttons and list menus.
- **LankaQR Payments (CBSL Standard)**: Dynamic EMVCo QR code generation, instant CBSL-compliant transfer instructions, and owner payment verification.
- **Multi-Tenant Ready**: Designed from day one to support multiple restaurants with database-level isolation (`restaurant_id` on all tables).
- **Automated Operations**: Automatic cart calculation in LKR, delivery fee handling, sequential order numbering (e.g. `UB-1001`), and instant notifications sent to the restaurant owner's WhatsApp.
- **Idempotent & Secure**: Atomic deduplication prevents duplicate orders on retried Meta webhooks; SHA-256 signature verification protects incoming requests.

---

## 2. Example WhatsApp Conversation

### Customer Ordering Experience (English / Default)

```
Customer: Hi
Bot:       👋 Welcome to Urban Bites!
           How can we help you today?
           [🍔 View Menu]  [🛒 View Cart]  [🇱🇰 සිංහල]

Customer: [🍔 View Menu]
Bot:       📋 Our Menu
           Select a category to browse:
           - 🍔 Burgers
           - 🍟 Sides
           - 🥤 Drinks

Customer: [🍔 Burgers]
Bot:       🍔 Burgers
           Select an item to add to your cart:
           - Classic Beef Burger (Rs. 850)
           - Crispy Chicken Burger (Rs. 900)
           - Cheese Burger (Rs. 950)

Customer: [Classic Beef Burger]
Bot:       🛒 Classic Beef Burger
           💰 Rs. 850
           How many would you like?
           [1]  [2]  [3] (or type 1-99)

Customer: [2]
Bot:       ✅ Added 2 × Classic Beef Burger to your cart!
           🛒 Your Cart:
           2 × Classic Beef Burger — Rs. 1,700
           Subtotal: Rs. 1,700
           [➕ Add More]  [🗑 Clear Cart]  [✅ Checkout]

Customer: [✅ Checkout]
Bot:       📝 Checkout
           Please type your name:

Customer: Anura Silva
Bot:       🚗 How would you like to receive your order?
           [🚚 Delivery]  [🏪 Pickup]  [🍽 Dine-in]

Customer: [🚚 Delivery]
Bot:       📍 Please type your delivery address:

Customer: 42 Marine Drive, Colombo 03
Bot:       📝 Any special instructions or notes?
           (e.g., "No onions", "Extra spicy")
           [No, thanks]

Customer: [No, thanks]
Bot:       💳 Payment Method
           How would you like to pay for your order?
           [💵 Cash]  [📱 LankaQR]

Customer: [📱 LankaQR]
Bot:       🧾 Order Summary
           2 × Classic Beef Burger
           Subtotal: Rs. 1,700
           Delivery: Rs. 300
           Total: Rs. 2,000

           👤 Anura Silva
           📦 Delivery
           💳 LankaQR
           📍 42 Marine Drive, Colombo 03

           Would you like to confirm this order?
           [✅ Confirm]  [❌ Cancel]

Customer: [✅ Confirm]
Bot:       🎉 Thank you! Your order has been placed successfully.
           Order Number: UB-1001
           Total: Rs. 2,000
           Urban Bites will prepare your order shortly!

           📱 LankaQR Payment Details
           Amount: Rs. 2,000.00
           Reference: UB-1001
           Bank: Commercial Bank of Ceylon
           Account Name: Urban Bites
           Account Number: 1000456789
           (Scan with any Sri Lankan bank app)
```

---

## 3. Architecture & Data Flow

```
+----------------------------------------------------------------+
|                        Customer WhatsApp                       |
+-------------------------------+--------------------------------+
                                |
                                v
+----------------------------------------------------------------+
|                   Meta WhatsApp Cloud API                      |
+-------------------------------+--------------------------------+
                                |  POST /webhook (events)
                                v
+----------------------------------------------------------------+
|                     Zeylogz Orders API                         |
|                                                                |
|  1. Webhook Signature Check (X-Hub-Signature-256)              |
|  2. Atomic Idempotency Check (processed_messages)              |
|  3. Multi-Tenant Lookup (restaurants by phone_number_id)       |
|  4. Conversation State Machine (conversation.service.js)       |
|  5. DB Price Re-validation (cart.service.js)                   |
|  6. Atomic Order Creation (order.service.js)                   |
+-------------------------------+--------------------------------+
                                |
                                v
+----------------------------------------------------------------+
|             SQLite WAL Database (ordering.db)                  |
|  - restaurants             - customers                         |
|  - menu_categories         - orders & order_items              |
|  - menu_items              - conversation_sessions             |
+-------------------------------+--------------------------------+
                                |
                                v
+----------------------------------------------------------------+
|                    Outgoing WhatsApp Dispatch                  |
|  - Customer Order Confirmation & LankaQR Instructions          |
|  - Restaurant Owner / Kitchen WhatsApp Alert                   |
+----------------------------------------------------------------+
```

---

## 4. Tech Stack

- **Runtime**: Node.js (v20+) with modern ES modules (`type: "module"`)
- **Web Framework**: Express.js with custom security headers and raw-body verification
- **Database**: SQLite with `better-sqlite3` (WAL mode enabled, foreign keys enforced)
- **Validation**: Zod schema validation for environment configuration
- **QR Engine**: CBSL-compliant EMVCo dynamic LankaQR generator with CRC-16/CCITT-FALSE
- **Testing**: Vitest (159 automated unit, integration, and e2e tests)
- **Messaging**: Meta WhatsApp Cloud API (Graph API v21.0) with offline simulator mode
- **Containerization**: Docker multi-stage build

---

## 5. Project Structure

```
zeylogz-orders/
├── src/
│   ├── server.js                      # HTTP server listener & graceful shutdown (SIGTERM/SIGINT)
│   ├── app.js                         # Express app setup, security headers, raw-body middleware
│   ├── config/
│   │   └── env.js                     # Zod-validated environment configuration
│   ├── routes/
│   │   ├── health.routes.js           # GET /health
│   │   ├── webhook.routes.js          # GET /webhook (verify), POST /webhook (events)
│   │   └── dev.routes.js              # POST /api/dev/message (local test endpoint)
│   ├── controllers/
│   │   └── webhook.controller.js      # Signature validation, atomic idempotency, tenant routing
│   ├── services/
│   │   ├── restaurant.service.js      # Multi-tenant resolution & sequential order numbering
│   │   ├── menu.service.js            # Menu categories & item retrieval (tenant-scoped)
│   │   ├── cart.service.js            # Pure cart logic & database price re-validation
│   │   ├── order.service.js           # Atomic order creation & historical snapshots
│   │   ├── session.service.js         # Conversation session state & JSON storage
│   │   ├── conversation.service.js    # Core ordering state machine (bilingual)
│   │   ├── message.formatter.js       # WhatsApp interactive buttons & list formatters
│   │   ├── lankaqr.service.js         # Central Bank LankaQR EMVCo generator & CRC16
│   │   └── whatsapp.service.js        # WhatsApp Cloud API client & mock layer
│   ├── database/
│   │   ├── db.js                      # SQLite singleton connection, WAL setup, auto-migration
│   │   ├── schema.sql                 # 8 tables, indexes, CHECK constraints
│   │   └── seed.js                    # Urban Bites demo data seeder
│   ├── middleware/
│   │   └── error.middleware.js        # 404 handler and safe error responses
│   └── utils/
│       ├── logger.js                  # Structured logging with level filtering
│       ├── formatting.js              # LKR currency and order number formatting
│       └── i18n.js                    # English & Sinhala dictionary with <=20 char button checks
├── tests/
│   ├── app.test.js                    # Express app & health checks
│   ├── helpers/
│   │   └── db.helper.js               # In-memory database test helper
│   ├── database/
│   │   └── database.test.js           # Schema, FK constraints, seed data tests
│   ├── multitenancy/
│   │   └── multitenant.test.js        # Strict data isolation & multi-restaurant test
│   ├── services/
│   │   ├── restaurant.service.test.js # Tenant service & order sequence tests
│   │   ├── menu.service.test.js       # Menu service tests
│   │   ├── cart.service.test.js       # Cart calculation & anti-tampering tests
│   │   ├── order.service.test.js      # Order processing & transaction tests
│   │   ├── conversation.service.test.js # State machine transitions tests
│   │   ├── lankaqr.service.test.js    # EMVCo tags & CRC-16 checksum tests
│   │   └── whatsapp.service.test.js   # WhatsApp service & webhook parsing tests
│   ├── routes/
│   │   ├── dev.routes.test.js         # Local dev API tests
│   │   └── webhook.routes.test.js     # Meta webhook, security & idempotency tests
│   ├── utils/
│   │   ├── formatting.test.js         # Currency and string formatting tests
│   │   └── i18n.test.js               # Localization & WhatsApp button limit tests
│   └── e2e/
│       └── ordering.e2e.test.js       # Complete end-to-end customer order journey
├── data/                              # SQLite database storage (gitignored)
├── Dockerfile                         # Production container image
├── .dockerignore
├── .env.example
├── package.json
└── README.md
```

---

## 6. Database Schema & Multi-Tenancy

Every tenant-owned table is strictly isolated by `restaurant_id`:

| Table | Description |
|---|---|
| `restaurants` | Tenant profile, WhatsApp phone number ID, owner number, currency (`LKR`), delivery fee, order prefix (`UB`, `SW`), LankaQR merchant details, city. |
| `menu_categories` | Menu sections with English/Sinhala names, emoji, display order, and active status. |
| `menu_items` | Dishes with bilingual names/descriptions, price (integer LKR), and availability. |
| `customers` | Customers identified by WhatsApp number per restaurant. |
| `orders` | Placed orders with status (`pending`, `confirmed`, etc.), type (`delivery`, `pickup`, `dine_in`), and totals. |
| `order_items` | Snapshot of item name and unit price at time of order creation. |
| `conversation_sessions` | 24-hour session tracking state machine, cart, and context JSON. |
| `processed_messages` | Webhook message IDs tracked for atomic idempotency to prevent duplicate orders. |

---

## 7. Local Setup

### Prerequisites
- Node.js 20+
- npm 10+

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/zeylogz/zeylogz-orders.git
cd zeylogz-orders

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Seed database with demo restaurant
npm run seed

# 5. Start the development server
npm run dev
```

The server starts at `http://localhost:3000`.

---

## 8. Environment Variables

| Variable | Required | Description | Default |
|---|---|---|---|
| `PORT` | Optional | HTTP port | `3000` |
| `NODE_ENV` | Optional | `development`, `test`, or `production` | `development` |
| `DB_PATH` | Optional | Path to SQLite database file | `./data/ordering.db` |
| `META_VERIFY_TOKEN` | Production | Verification token configured in Meta App dashboard | `""` |
| `META_ACCESS_TOKEN` | Production | System User Access Token from Meta Business Manager | `""` |
| `META_PHONE_NUMBER_ID`| Production | Default Phone Number ID from Meta WhatsApp Business settings | `""` |
| `META_WABA_ID` | Production | WhatsApp Business Account ID | `""` |
| `META_GRAPH_API_VERSION`| Optional | Meta Graph API version | `v21.0` |
| `META_APP_SECRET` | Optional | App secret for SHA256 webhook payload signature verification | `""` |
| `LOG_LEVEL` | Optional | `debug`, `info`, `warn`, or `error` | `info` |

---

## 9. Running Tests

The test suite uses Vitest with in-memory SQLite instances and mock WhatsApp dispatchers:

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

**Test Coverage**: 159 automated tests across 15 test suites validating every service, route, calculation, and multi-tenant boundary.

---

## 10. Development Simulator (Offline Testing)

Test the complete ordering flow locally without sending real WhatsApp messages or consuming API quota:

```bash
# Greet
curl -X POST http://localhost:3000/api/dev/message \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": 1, "phoneNumber": "94771234567", "message": "Hi"}'

# Click "View Menu"
curl -X POST http://localhost:3000/api/dev/message \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": 1, "phoneNumber": "94771234567", "buttonId": "action_menu"}'

# Select Category (category_1)
curl -X POST http://localhost:3000/api/dev/message \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": 1, "phoneNumber": "94771234567", "listRowId": "category_1"}'

# Select Item (item_1)
curl -X POST http://localhost:3000/api/dev/message \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": 1, "phoneNumber": "94771234567", "listRowId": "item_1"}'

# Choose Quantity (qty_2)
curl -X POST http://localhost:3000/api/dev/message \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": 1, "phoneNumber": "94771234567", "buttonId": "qty_2"}'

# Checkout
curl -X POST http://localhost:3000/api/dev/message \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": 1, "phoneNumber": "94771234567", "buttonId": "action_checkout"}'
```

---

## 11. Onboarding a Second Restaurant (Multi-Tenant)

No code changes are required to onboard new restaurants. Simply insert the restaurant and its menu into the database:

```sql
-- 1. Insert Restaurant
INSERT INTO restaurants (
  id, name, phone_number, whatsapp_phone_number_id, owner_phone_number,
  address, city, currency, delivery_fee, order_prefix, lankaqr_enabled,
  lankaqr_merchant_name, lankaqr_merchant_id, lankaqr_bank_name,
  lankaqr_account_number, is_active
) VALUES (
  2, 'Spicy Wok', '+94812345678', 'REAL_WHATSAPP_PHONE_ID_HERE', '+94719998888',
  '15 Dalada Veediya, Kandy', 'Kandy', 'LKR', 450, 'SW', 1,
  'Spicy Wok Kandy', 'SWKANDY01', 'Hatton National Bank', '2000554433', 1
);

-- 2. Insert Categories
INSERT INTO menu_categories (restaurant_id, name, name_si, emoji, display_order)
VALUES
  (2, 'Rice & Noodles', 'බත් සහ නූඩ්ල්ස්', '🍚', 1),
  (2, 'Beverages', 'පාන වර්ග', '🧃', 2);

-- 3. Insert Menu Items
INSERT INTO menu_items (restaurant_id, category_id, name, name_si, price, is_available, display_order)
VALUES
  (2, 1, 'Nasi Goreng', 'නාසි ගොරෙන්', 1400, 1, 1),
  (2, 1, 'Chicken Kottu', 'චිකන් කොත්තු', 1100, 1, 2);
```

When WhatsApp sends an incoming message for `REAL_WHATSAPP_PHONE_ID_HERE`, Zeylogz Orders automatically routes the conversation to Spicy Wok, calculates its specific delivery fee, generates order prefix `SW-1001`, and alerts the Spicy Wok owner.

---

## 12. Cloud Deployment & Persistent SQLite Storage

### Render.com Deployment

1. **Create a Web Service** connected to `zeylogz/zeylogz-orders`.
2. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
   - `DB_PATH`: `/var/data/ordering.db`
   - `META_VERIFY_TOKEN`: `<your-verify-token>`
   - `META_ACCESS_TOKEN`: `<your-meta-system-user-token>`
   - `META_PHONE_NUMBER_ID`: `<your-phone-number-id>`
   - `META_WABA_ID`: `<your-waba-id>`
   - `META_APP_SECRET`: `<your-app-secret>`
3. **Attach Persistent Disk (Crucial)**:
   - In Render Dashboard > Disks:
   - Click **Add Disk**.
   - Mount Path: `/var/data`
   - Size: `1 GB` (sufficient for millions of orders with SQLite).
   - Setting `DB_PATH=/var/data/ordering.db` ensures data, orders, and sessions are never lost across restarts or redeployments.

---

## 13. Meta WhatsApp Cloud API Setup

1. **Create Meta Business App**: In [developers.facebook.com](https://developers.facebook.com/), create an app of type **Business**.
2. **Configure WhatsApp**: Under WhatsApp > API Setup, note your **Phone Number ID** and **WABA ID**.
3. **Webhook URL**:
   - Callback URL: `https://<your-render-app>.onrender.com/webhook`
   - Verify Token: Same as `META_VERIFY_TOKEN`.
   - Subscribe to the **`messages`** webhook field.
4. **Generate Permanent Access Token**:
   - In Meta Business Manager > System Users, create a System User with `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
   - Generate token and save in Render as `META_ACCESS_TOKEN`.

---

## License

ISC © Zeylogz
