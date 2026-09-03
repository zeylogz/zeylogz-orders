# WhatsApp Ordering SaaS MVP for Sri Lankan Small Businesses

A lightweight, multi-tenant WhatsApp ordering SaaS application designed for independent restaurants, cafes, bakeries, and takeaways in Sri Lanka. Customers browse interactive menus, build carts, choose delivery or pickup, and place orders directly inside WhatsApp without downloading apps or paying marketplace commissions.

---

## 1. Product Overview

The WhatsApp Ordering SaaS allows food businesses in Sri Lanka to receive direct customer orders via WhatsApp. 
The system features:
- **Zero App Download**: Customers order directly in WhatsApp using modern interactive buttons and list menus.
- **Multi-Tenant Ready**: Designed from day one to support multiple restaurants with database-level isolation (`restaurant_id` on all tables).
- **Automated Operations**: Automatic cart calculation in LKR, delivery fee handling, order numbering, and instant notification sent to the restaurant owner's WhatsApp.
- **Idempotent & Resilient**: Handles retried webhooks safely and prevents duplicate orders.

---

## 2. Example WhatsApp Conversation

### Customer Ordering Experience

```
Customer: Hi
Bot:       👋 Welcome to Urban Bites!
           How can we help you today?
           [🍔 View Menu]  [🛒 View Cart]

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

Customer: Kamal Perera
Bot:       🚗 How would you like to receive your order?
           [🚚 Delivery]  [🏪 Pickup]  [🍽 Dine-in]

Customer: [🚚 Delivery]
Bot:       📍 Please type your delivery address:

Customer: 42 Galle Road, Colombo 03
Bot:       📝 Any special instructions or notes?
           [No, thanks] (or type your notes)

Customer: Extra napkins please
Bot:       💳 *Payment Method*
           How would you like to pay for your order?
           [💵 Cash]  [📱 LankaQR]

Customer: [📱 LankaQR]
Bot:       🧾 Order Summary
           2 × Classic Beef Burger
           Subtotal: Rs. 1,700
           Delivery: Rs. 300
           Total: Rs. 2,000

           👤 Kamal Perera
           📦 Delivery
           💳 📱 LankaQR
           📍 42 Galle Road, Colombo 03
           📝 Extra napkins please

           Confirm this order?
           [✅ Confirm]  [❌ Cancel]

Customer: [✅ Confirm]
Bot:       ✅ Order received!
           Your order number is UB-1001.
           Total: Rs. 2,000
           Urban Bites will contact you if anything needs clarification.
           Thank you! 🙏

           📱 *LANKAQR PAYMENT*
           Please complete your payment of Rs. 2,000 using any LankaQR-supported banking or digital wallet app:
           (Genie, FriMi, Flash, ComBank Q+, HNB SOLO, BOC SmartPay, WePay, etc.)

           🏦 *Bank Transfer Details:*
           • Bank: Commercial Bank of Ceylon
           • Account Name: Urban Bites
           • Account Number: 1000456789
           • Amount: Rs. 2,000
           • Reference: UB-1001

           📲 LankaQR Raw Code:
           00020101021226420022LK.LANKACLEAR.LANKAQR0107UB9400152045812530314454072000.005802LK5911Urban Bites6007Colombo62110107UB-10016304...

           📷 Please reply with a screenshot or photo of your payment slip once transferred!
```

### Restaurant Owner WhatsApp Notification

```
🔔 NEW ORDER

Order: UB-1001
👤 Kamal Perera
📱 94771234567
📦 Delivery
💳 📱 LankaQR (Transfer) (⏳ Pending Verification)

Items:
2 × Classic Beef Burger — Rs. 1,700

Subtotal: Rs. 1,700
Delivery: Rs. 300
TOTAL: Rs. 2,000

📍 42 Galle Road, Colombo 03
📝 Extra napkins please
🕐 07:45 PM
```


---

## 3. Architecture

```
                                +---------------------------+
                                |  Customer WhatsApp App    |
                                +-------------+-------------+
                                              |
                                              v
                                +---------------------------+
                                | Meta WhatsApp Cloud API   |
                                +-------------+-------------+
                                              |
                          POST /webhook       v
                    +------------------------------------+
                    |        Node.js / Express           |
                    |                                    |
                    |  - Webhook verification & auth     |
                    |  - Idempotency filter              |
                    |  - Phone number ID tenant routing  |
                    |  - Conversation State Machine      |
                    |  - Session management (24h TTL)    |
                    |  - Cart & Order calculations       |
                    +-----------------+------------------+
                                      |
                       SQL queries    v
                    +------------------------------------+
                    |        SQLite (better-sqlite3)     |
                    |  - restaurants                     |
                    |  - menu_categories / menu_items    |
                    |  - customers                       |
                    |  - orders / order_items            |
                    |  - conversation_sessions           |
                    |  - processed_messages              |
                    +-----------------+------------------+
                                      |
                                      v
                    +------------------------------------+
                    | Graph API Outgoing Notifications   |
                    |  - Customer confirmation message   |
                    |  - Restaurant owner notification   |
                    +------------------------------------+
```

---

## 4. Tech Stack

- **Runtime**: Node.js (v18+) with modern ES modules (`type: "module"`)
- **Web Framework**: Express.js
- **Database**: SQLite with `better-sqlite3` (WAL mode enabled, foreign keys enforced)
- **Validation**: Zod schema validation for environment configuration and data validation
- **Testing**: Vitest (134 automated unit, service, integration, and e2e tests)
- **Messaging**: Meta WhatsApp Cloud API (Graph API v21.0) with offline mock mode
- **Process & Dev**: Nodemon, Docker multi-stage build

---

## 5. Project Structure

```
whatsapp-ordering-saas/
├── src/
│   ├── server.js                      # HTTP server listener & graceful shutdown (SIGTERM/SIGINT)
│   ├── app.js                         # Express app setup & middleware mounting
│   ├── config/
│   │   └── env.js                     # Zod-validated environment configuration
│   ├── routes/
│   │   ├── health.routes.js           # GET /health
│   │   ├── webhook.routes.js          # GET /webhook (verify), POST /webhook (events)
│   │   └── dev.routes.js              # POST /api/dev/message (local test endpoint)
│   ├── controllers/
│   │   └── webhook.controller.js      # Meta webhook verification & event handler
│   ├── services/
│   │   ├── restaurant.service.js      # Restaurant tenant resolution & order numbers
│   │   ├── menu.service.js            # Menu categories & item retrieval
│   │   ├── cart.service.js            # Pure cart logic & DB price validation
│   │   ├── order.service.js           # Atomic order creation & historical snapshots
│   │   ├── session.service.js         # Conversation session state & JSON storage
│   │   ├── conversation.service.js    # Core ordering state machine
│   │   ├── message.formatter.js       # WhatsApp interactive buttons & list formatters
│   │   └── whatsapp.service.js        # WhatsApp Cloud API client & mock layer
│   ├── database/
│   │   ├── db.js                      # SQLite singleton connection & WAL setup
│   │   ├── schema.sql                 # 8 tables, indexes, CHECK constraints
│   │   └── seed.js                    # Urban Bites demo data seeder
│   ├── middleware/
│   │   └── error.middleware.js        # 404 handler and safe error responses
│   └── utils/
│       ├── logger.js                  # Structured logging
│       └── formatting.js              # LKR currency and order number formatting
├── tests/
│   ├── app.test.js                    # Express app & health checks
│   ├── helpers/
│   │   └── db.helper.js               # Isolated in-memory database test helper
│   ├── database/
│   │   └── database.test.js           # Schema, FK constraints, seed data tests
│   ├── services/
│   │   ├── restaurant.service.test.js # Restaurant service tests
│   │   ├── menu.service.test.js       # Menu service tests
│   │   ├── cart.service.test.js       # Cart manipulation & DB validation tests
│   │   ├── order.service.test.js      # Order processing & price tampering tests
│   │   ├── conversation.service.test.js # State machine transitions tests
│   │   └── whatsapp.service.test.js   # WhatsApp service & webhook parsing tests
│   ├── routes/
│   │   ├── dev.routes.test.js         # Local dev API tests
│   │   └── webhook.routes.test.js     # Meta webhook & idempotency tests
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

## 6. Database Schema

All tables include `restaurant_id` for multi-tenant data isolation.

| Table | Description |
|---|---|
| `restaurants` | Restaurant details, WhatsApp phone number ID, owner number, currency (LKR), delivery fee, order prefix. |
| `menu_categories` | Menu sections with display order, emoji, and active status. |
| `menu_items` | Dishes with name, description, price (integer LKR), and availability status. |
| `customers` | Customers identified by WhatsApp number per restaurant. |
| `orders` | Placed orders with status (`pending`, `confirmed`, etc.), type (`delivery`, `pickup`, `dine_in`), and totals. |
| `order_items` | Snapshot of item name and price at time of order creation. |
| `conversation_sessions` | 24h session state machine tracking customer cart and context JSON. |
| `processed_messages` | Webhook message IDs tracked for idempotency to prevent duplicate order processing. |

---

## 7. Local Setup

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/InojBhashitha/whatsapp-ordering-saas.git
cd whatsapp-ordering-saas

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Seed the database with Urban Bites demo data
npm run seed

# 5. Start the development server
npm run dev
```

The server will start on `http://localhost:3000`.

---

## 8. Environment Variables

| Variable | Required | Description | Default |
|---|---|---|---|
| `PORT` | Optional | Port on which the server listens | `3000` |
| `NODE_ENV` | Optional | `development`, `test`, or `production` | `development` |
| `DB_PATH` | Optional | Path to SQLite database file | `./data/ordering.db` |
| `META_VERIFY_TOKEN` | Production | Secret verification token configured in Meta App dashboard | `your_webhook_verify_token_here` |
| `META_ACCESS_TOKEN` | Production | System User Access Token from Meta Business Manager | `your_meta_access_token_here` |
| `META_PHONE_NUMBER_ID` | Production | Phone Number ID from Meta WhatsApp Business settings | `your_phone_number_id_here` |
| `META_WABA_ID` | Production | WhatsApp Business Account ID | `your_whatsapp_business_account_id_here` |
| `META_GRAPH_API_VERSION`| Optional | Meta Graph API version | `v21.0` |
| `META_APP_SECRET` | Optional | App secret for SHA256 webhook payload signature verification | `your_meta_app_secret_here` |
| `LOG_LEVEL` | Optional | `debug`, `info`, `warn`, or `error` | `info` |

---

## 9. Running Tests

The test suite runs with Vitest using in-memory databases and mock WhatsApp dispatchers:

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

**Test Coverage**: 134 automated tests across 12 test suites verifying every layer of the system.

---

## 10. Running Development Mode (Without Meta Account)

You can simulate the entire WhatsApp ordering conversation locally using the development API:

### 1. Send "Hi"
```bash
curl -X POST http://localhost:3000/api/dev/message \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": 1,
    "phoneNumber": "94771234567",
    "message": "Hi"
  }'
```

### 2. Click "View Menu"
```bash
curl -X POST http://localhost:3000/api/dev/message \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": 1,
    "phoneNumber": "94771234567",
    "buttonId": "action_menu"
  }'
```

### 3. Select Category (Burgers)
```bash
curl -X POST http://localhost:3000/api/dev/message \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": 1,
    "phoneNumber": "94771234567",
    "listRowId": "category_1"
  }'
```

### 4. Select Item (Classic Beef Burger)
```bash
curl -X POST http://localhost:3000/api/dev/message \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": 1,
    "phoneNumber": "94771234567",
    "listRowId": "item_1"
  }'
```

### 5. Choose Quantity (2)
```bash
curl -X POST http://localhost:3000/api/dev/message \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": 1,
    "phoneNumber": "94771234567",
    "buttonId": "qty_2"
  }'
```

### 6. Inspect Session State
```bash
curl http://localhost:3000/api/dev/session?restaurantId=1&phoneNumber=94771234567
```

### 7. Reset Conversation
```bash
curl -X POST http://localhost:3000/api/dev/reset \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": 1,
    "phoneNumber": "94771234567"
  }'
```

---

## 11. Meta WhatsApp Cloud API Setup

When you are ready to connect to a real WhatsApp Business number:

1. **Create a Meta Developer Account**: Go to [developers.facebook.com](https://developers.facebook.com/).
2. **Create App**: Choose "Business" app type.
3. **Add WhatsApp Product**: In the dashboard, click "Set up" under WhatsApp.
4. **Get Credentials**:
   - In WhatsApp > API Setup, copy your **Phone Number ID** and **WhatsApp Business Account ID**.
   - Generate a **Permanent System User Access Token** in Meta Business Manager.
5. **Update `.env`**:
   ```env
   META_ACCESS_TOKEN=your_permanent_access_token
   META_PHONE_NUMBER_ID=your_phone_number_id
   META_WABA_ID=your_waba_id
   META_VERIFY_TOKEN=create_a_strong_secret_token_here
   ```
6. **Update Demo Restaurant**:
   Update `whatsapp_phone_number_id` in the `restaurants` table to match your Meta Phone Number ID.

---

## 12. Webhook Setup

1. **Expose your local server** (during development):
   ```bash
   ngrok http 3000
   ```
2. **Configure in Meta Dashboard**:
   - Go to WhatsApp > Configuration in your Meta App.
   - Callback URL: `https://<your-domain-or-ngrok>.ngrok-free.app/webhook`
   - Verify Token: The string set in `META_VERIFY_TOKEN` in your `.env`.
   - Click "Verify and Save".
3. **Subscribe to Webhook Fields**:
   - In Webhook Fields, subscribe to **`messages`**.

---

## 13. Deployment Considerations

### Cloud Hosting & SQLite Persistence
SQLite stores the database in a local file (`data/ordering.db`).
- **Persistent Disk Required**: If deploying on platforms like Render, Railway, Fly.io, or AWS EC2/Lightsail, you **MUST attach a persistent volume** to `/app/data`.
- **Stateless Cloud Warning**: If hosted on ephemeral containers (e.g., vanilla Heroku or serverless Lambda), the database will reset on restart.
- **Future Migration**: For enterprise horizontal scaling across multiple servers, the database layer can be migrated to PostgreSQL without altering the core state machine or business services.

### Docker Deployment

```bash
# Build container image
docker build -t whatsapp-ordering .

# Run with persistent volume
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  --name whatsapp-ordering-app \
  whatsapp-ordering
```

---

## 14. Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `GET /webhook 403` | Verify token mismatch | Ensure `hub.verify_token` sent by Meta matches `META_VERIFY_TOKEN` in `.env`. |
| Outgoing messages not delivered | Token expired or unverified number | Check Meta token validity in Graph API Explorer. Ensure test recipient numbers are whitelisted in sandbox mode. |
| Orders not creating | Empty cart or inactive items | Check item availability in `menu_items` table. |
| Duplicate order on network glitch | Handled automatically | The `processed_messages` table automatically deduplicates incoming Meta webhook events. |

---

## 15. Future Roadmap

- **v1.0 (Current MVP)**: WhatsApp interactive ordering, state machine, cart, delivery/pickup flow, SQLite multi-tenancy.
- **v2.0**: Restaurant owner web dashboard (order status management, menu editing, business hours).
- **v3.0**: LankaQR payment slip upload or automated dynamic LankaQR generation.
- **v4.0**: Customer loyalty points and automated broadcast marketing.
- **v5.0**: Delivery rider WhatsApp dispatch alerts.
- **v6.0**: Booking and reservation state machines for salons, doctors, and clinics.

---

## License

ISC
