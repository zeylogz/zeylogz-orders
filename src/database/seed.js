import { initializeDatabase, closeDatabase } from './db.js';
import { logger } from '../utils/logger.js';

/**
 * Seed the database with the demo "Urban Bites" restaurant.
 * Safe to run multiple times — uses INSERT OR IGNORE.
 */
export function seedDatabase(db) {
  // -------------------------------------------------------------------------
  // Restaurant
  // -------------------------------------------------------------------------
  const insertRestaurant = db.prepare(`
    INSERT OR IGNORE INTO restaurants
      (id, name, phone_number, whatsapp_phone_number_id, owner_phone_number,
       address, city, currency, delivery_fee, order_prefix, lankaqr_enabled,
       lankaqr_merchant_name, lankaqr_merchant_id, lankaqr_bank_name,
       lankaqr_account_number, is_active)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRestaurant.run(
    1,
    'Urban Bites',
    '+94112345678',
    'DEMO_PHONE_NUMBER_ID',       // Replaced with real ID when connected
    '+94770000000',               // Owner's WhatsApp number
    '42 Galle Road, Colombo 03',
    'Colombo',
    'LKR',
    300,                          // Delivery fee: Rs. 300
    'UB',                         // Order numbers: UB-1001, UB-1002, ...
    1,                            // LankaQR enabled
    'Urban Bites',                // Merchant name
    'UB94001',                    // Merchant ID
    'Commercial Bank of Ceylon',  // Bank name
    '1000456789',                 // Account number
    1
  );

  logger.info('Seeded restaurant: Urban Bites');

  // -------------------------------------------------------------------------
  // Menu Categories
  // -------------------------------------------------------------------------
  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO menu_categories
      (id, restaurant_id, name, name_si, emoji, display_order, is_active)
    VALUES
      (?, ?, ?, ?, ?, ?, ?)
  `);

  const categories = [
    [1, 1, 'Burgers', 'බර්ගර්',    '🍔', 1, 1],
    [2, 1, 'Sides',   'අතුරු කෑම', '🍟', 2, 1],
    [3, 1, 'Drinks',  'බීම වර්ග',  '🥤', 3, 1],
  ];

  const insertCategories = db.transaction(() => {
    for (const cat of categories) {
      insertCategory.run(...cat);
    }
  });
  insertCategories();

  logger.info(`Seeded ${categories.length} menu categories`);

  // -------------------------------------------------------------------------
  // Menu Items
  // -------------------------------------------------------------------------
  const insertItem = db.prepare(`
    INSERT OR IGNORE INTO menu_items
      (id, restaurant_id, category_id, name, name_si, description, description_si, price,
       is_available, display_order)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const items = [
    // Burgers
    [1, 1, 1, 'Classic Beef Burger',   'ක්ලැසික් බීෆ් බර්ගර්',   'Juicy beef patty with fresh lettuce, tomato & our signature sauce', 'නැවුම් එළවළු සහ රසවත් බීෆ් පැටියක් සහිතයි', 850, 1, 1],
    [2, 1, 1, 'Crispy Chicken Burger', 'ක්‍රිස්පි චිකන් බර්ගර්', 'Crispy fried chicken fillet with coleslaw & mayo',                 'කරස් ගා හැපෙන රසවත් චිකන් බර්ගර්',          900, 1, 2],
    [3, 1, 1, 'Cheese Burger',         'චීස් බර්ගර්',           'Double cheese with caramelized onions & pickles',                  'දියවූ චීස් සමග ජූසි බීෆ් පැටියක්',           950, 1, 3],

    // Sides
    [4, 1, 2, 'French Fries',          'ෆ්‍රෙන්ච් ෆ්‍රයිස්',     'Crispy golden fries with ketchup',                                 'රන්වන් පැහැති අල තීරු',                     450, 1, 1],
    [5, 1, 2, 'Chicken Wings',         'චිකන් වින්ග්ස්',        '6 pcs buffalo wings with blue cheese dip',                         'රසවත් චිකන් වින්ග්ස් කෑලි 6ක්',              800, 1, 2],

    // Drinks
    [6, 1, 3, 'Coca-Cola',             'කොකා-කෝලා',             'Chilled 330ml can',                                                'සිසිල් කළ බීම කෑනයක් (330ml)',              250, 1, 1],
    [7, 1, 3, 'Sprite',                'ස්ප්‍රයිට්',             'Chilled 330ml can',                                                'සිසිල් කළ බීම කෑනයක් (330ml)',              250, 1, 2],
    [8, 1, 3, 'Chocolate Milkshake',   'චොකලට් මිල්ක්ෂේක්',     'Rich & creamy chocolate milkshake',                                'ක්‍රීමි චොකලට් මිල්ක්ෂේක්',                  550, 1, 3],
  ];

  const insertItems = db.transaction(() => {
    for (const item of items) {
      insertItem.run(...item);
    }
  });
  insertItems();

  logger.info(`Seeded ${items.length} menu items`);

  return {
    restaurant: { id: 1, name: 'Urban Bites' },
    categories: categories.length,
    items: items.length,
  };
}

// ---------------------------------------------------------------------------
// CLI: node src/database/seed.js
// ---------------------------------------------------------------------------
const isDirectRun = process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isDirectRun) {
  try {
    const db = initializeDatabase();
    const result = seedDatabase(db);
    console.log('\n✅ Database seeded successfully');
    console.log(`   Restaurant: ${result.restaurant.name}`);
    console.log(`   Categories: ${result.categories}`);
    console.log(`   Menu items: ${result.items}`);
    closeDatabase();
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}
