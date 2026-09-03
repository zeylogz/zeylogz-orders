-- =============================================================================
-- WhatsApp Ordering SaaS — Database Schema
-- =============================================================================
-- All tables include restaurant_id for multi-tenant scoping.
-- Prices are stored as integers (LKR has no subunits worth tracking).
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Restaurants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS restaurants (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  phone_number    TEXT,
  whatsapp_phone_number_id TEXT NOT NULL UNIQUE,
  owner_phone_number       TEXT NOT NULL,
  address         TEXT,
  currency        TEXT    NOT NULL DEFAULT 'LKR',
  delivery_fee    INTEGER NOT NULL DEFAULT 0,
  order_prefix    TEXT    NOT NULL DEFAULT 'ORD',
  lankaqr_enabled INTEGER NOT NULL DEFAULT 1,
  lankaqr_merchant_name TEXT DEFAULT '',
  lankaqr_merchant_id   TEXT DEFAULT '',
  lankaqr_bank_name     TEXT DEFAULT '',
  lankaqr_account_number TEXT DEFAULT '',
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Menu Categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menu_categories (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id   INTEGER NOT NULL,
  name            TEXT    NOT NULL,
  emoji           TEXT    DEFAULT '',
  display_order   INTEGER NOT NULL DEFAULT 0,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Menu Items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menu_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id   INTEGER NOT NULL,
  category_id     INTEGER NOT NULL,
  name            TEXT    NOT NULL,
  description     TEXT    DEFAULT '',
  price           INTEGER NOT NULL,
  image_url       TEXT    DEFAULT '',
  is_available    INTEGER NOT NULL DEFAULT 1,
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id)   REFERENCES menu_categories(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id   INTEGER NOT NULL,
  whatsapp_number TEXT    NOT NULL,
  name            TEXT    DEFAULT '',
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  UNIQUE(restaurant_id, whatsapp_number)
);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id   INTEGER NOT NULL,
  customer_id     INTEGER NOT NULL,
  order_number    TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','confirmed','preparing','ready','completed','cancelled')),
  order_type      TEXT    NOT NULL DEFAULT 'pickup'
                    CHECK(order_type IN ('delivery','pickup','dine_in')),
  customer_name   TEXT    NOT NULL DEFAULT '',
  delivery_address TEXT   DEFAULT '',
  table_number    TEXT    DEFAULT '',
  notes           TEXT    DEFAULT '',
  payment_method  TEXT    NOT NULL DEFAULT 'cod'
                    CHECK(payment_method IN ('cod','lankaqr')),
  payment_status  TEXT    NOT NULL DEFAULT 'unpaid'
                    CHECK(payment_status IN ('unpaid','paid_pending_verification','paid','refunded')),
  subtotal        INTEGER NOT NULL DEFAULT 0,
  delivery_fee    INTEGER NOT NULL DEFAULT 0,
  total           INTEGER NOT NULL DEFAULT 0,

  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id)   REFERENCES customers(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Order Items (snapshot of menu item at time of order)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL,
  menu_item_id    INTEGER,
  item_name       TEXT    NOT NULL,
  unit_price      INTEGER NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  subtotal        INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (order_id)     REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- Conversation Sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id   INTEGER NOT NULL,
  customer_id     INTEGER,
  whatsapp_number TEXT    NOT NULL,
  state           TEXT    NOT NULL DEFAULT 'WELCOME',
  cart_data       TEXT    NOT NULL DEFAULT '[]',
  context_data    TEXT    NOT NULL DEFAULT '{}',
  expires_at      TEXT    NOT NULL DEFAULT (datetime('now', '+24 hours')),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id)   REFERENCES customers(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- Processed Messages (idempotency)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS processed_messages (
  message_id      TEXT    PRIMARY KEY,
  restaurant_id   INTEGER NOT NULL,
  processed_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Indexes for common queries
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant
  ON menu_categories(restaurant_id, display_order);

CREATE INDEX IF NOT EXISTS idx_menu_items_category
  ON menu_items(category_id, display_order);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant
  ON menu_items(restaurant_id, is_available);

CREATE INDEX IF NOT EXISTS idx_customers_lookup
  ON customers(restaurant_id, whatsapp_number);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant
  ON orders(restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_customer
  ON orders(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order
  ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_sessions_lookup
  ON conversation_sessions(restaurant_id, whatsapp_number);

CREATE INDEX IF NOT EXISTS idx_processed_messages_restaurant
  ON processed_messages(restaurant_id, processed_at);
