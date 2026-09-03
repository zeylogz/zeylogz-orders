/**
 * Internationalization (i18n) dictionary and helpers for English and Sinhala (සිංහල).
 */

const translations = {
  en: {
    // General
    currency_symbol: 'Rs.',
    
    // Welcome
    welcome_title: '👋 Welcome to *{restaurantName}*!\n\nHow can we help you today?',
    btn_menu: '🍔 View Menu',
    btn_cart: '🛒 View Cart',
    btn_lang_switch: '🇱🇰 සිංහල',

    // Menu
    menu_title: '📋 *Our Menu*\n\nSelect a category to browse:',
    btn_view_categories: 'View Categories',
    btn_view_items: 'View Items',
    category_header: '{emoji} *{categoryName}*\n\nSelect an item to add to your cart:',
    no_items: 'No items currently available in this category.',

    // Quantity
    qty_prompt: '🛒 *{itemName}*\n💰 {price}\n\nHow many would you like?',
    qty_footer: 'Or type a number (1-99)',

    // Cart
    cart_empty: '🛒 Your cart is empty.\n\nWould you like to browse our menu?',
    cart_title: '🛒 *Your Cart*\n\n{items}\n\n*Subtotal: {subtotal}*',
    cart_added: '✅ Added {quantity} × *{itemName}* to your cart!\n\n🛒 *Your Cart*\n{items}\n\n*Subtotal: {subtotal}*',
    btn_add_more: '➕ Add More',
    btn_clear_cart: '🗑 Clear Cart',
    btn_checkout: '✅ Checkout',
    cart_cleared: '🗑 Your cart has been cleared.',

    // Checkout
    ask_name: '📝 *Checkout*\n\nPlease type your name:',
    ask_order_type: '🚗 How would you like to receive your order?',
    btn_delivery: '🚚 Delivery',
    btn_pickup: '🏪 Pickup',
    btn_dine_in: '🍽 Dine-in',
    ask_delivery_address: '📍 Please type your delivery address:',
    ask_table_number: '🍽 Please type your table number:',
    ask_notes: '📝 Any special instructions or notes?\n\n(e.g., "No onions", "Extra spicy")',
    btn_skip_notes: 'No, thanks',
    notes_footer: 'Or type your notes',

    // Payment
    ask_payment: '💳 *Payment Method*\n\nHow would you like to pay for your order?',
    btn_cod: '💵 Cash',
    btn_lankaqr: '📱 LankaQR',
    pay_cod_label: 'Cash on Delivery',
    pay_counter_label: 'Pay at Counter',
    pay_lankaqr_label: '📱 LankaQR',

    // Confirmation
    order_summary_title: '🧾 *Order Summary*\n\n{items}\n',
    summary_subtotal: 'Subtotal: {subtotal}',
    summary_delivery: 'Delivery: {deliveryFee}',
    summary_total: '*Total: {total}*',
    confirm_question: 'Confirm this order?',
    btn_confirm: '✅ Confirm',
    btn_cancel: '❌ Cancel',
    order_cancelled: '❌ Your order has been cancelled.\n\nYour cart has been preserved. You can continue shopping or start fresh.',

    // Order Completion
    order_completed: '✅ *Order received!*\n\nYour order number is *{orderNumber}*\nTotal: *{total}*{payNote}\n\n{restaurantName} will contact you if anything needs clarification.\n\nThank you! 🙏',
    cod_pay_note: '\n💵 Please have *{total}* ready to pay upon handover.',

    // LankaQR Instructions
    lankaqr_title: '📱 *LANKAQR PAYMENT*\n\n',
    lankaqr_prompt: 'Please complete your payment of *{total}* using any LankaQR-supported banking or digital wallet app:\n(Genie, FriMi, Flash, ComBank Q+, HNB SOLO, BOC SmartPay, WePay, etc.)\n\n',
    lankaqr_bank_details: '🏦 *Bank Transfer Details:*\n',
    lankaqr_bank: '• Bank: {bankName}\n',
    lankaqr_account_name: '• Account Name: {accountName}\n',
    lankaqr_account_number: '• Account Number: {accountNumber}\n',
    lankaqr_amount: '• Amount: *{total}*\n',
    lankaqr_reference: '• Reference: *{orderNumber}*\n\n',
    lankaqr_raw_code: '📲 *LankaQR Raw Code:*\n```{qrPayload}```\n\n',
    lankaqr_slip_note: '📷 Please reply with a screenshot or photo of your payment slip once transferred!',

    // Fallbacks
    invalid_input: '❌ Sorry, I didn\'t understand that.\n\n{hint}',
    item_unavailable: '😔 Sorry, that item is currently unavailable.',
    choose_category: 'Please select one of the categories below:',
    choose_item: 'Please select an item from the list:',
    valid_name_error: 'Please enter a valid name (at least 2 characters):',
    valid_address_error: 'Please enter your full delivery address:',
    valid_table_error: 'Please enter your table number:',
    valid_qty_error: 'Please select or type a quantity between 1 and 99:',
    valid_action_error: 'Please choose an action:',
    valid_confirm_error: 'Please confirm or cancel using the buttons below:',
  },

  si: {
    // General
    currency_symbol: 'රු.',

    // Welcome
    welcome_title: '👋 *{restaurantName}* වෙත සාදරයෙන් පිළිගනිමු!\n\nඅද ඔබ කැමති කුමක් කිරීමටද?',
    btn_menu: '🍔 මෙනුව බලන්න',
    btn_cart: '🛒 මගේ බෑගය',
    btn_lang_switch: '🇬🇧 English',

    // Menu
    menu_title: '📋 *අපගේ මෙනුව*\n\nකරුණාකර වර්ගයක් තෝරන්න:',
    btn_view_categories: 'වර්ග බලන්න',
    btn_view_items: 'අයිතම බලන්න',
    category_header: '{emoji} *{categoryName}*\n\nබෑගයට එක් කිරීමට අයිතමයක් තෝරන්න:',
    no_items: 'මෙම වර්ගය යටතේ දැනට අයිතම නොමැත.',

    // Quantity
    qty_prompt: '🛒 *{itemName}*\n💰 {price}\n\nඔබට කීයක් අවශ්‍යද?',
    qty_footer: 'හෝ අංකයක් ටයිප් කරන්න (1-99)',

    // Cart
    cart_empty: '🛒 ඔබගේ බෑගය හිස්ව පවතී.\n\nමෙනුව පරීක්ෂා කිරීමට කැමතිද?',
    cart_title: '🛒 *ඔබගේ බෑගය*\n\n{items}\n\n*එකතුව: {subtotal}*',
    cart_added: '✅ *{itemName}* {quantity}ක් බෑගයට එකතු කළා!\n\n🛒 *ඔබගේ බෑගය*\n{items}\n\n*එකතුව: {subtotal}*',
    btn_add_more: '➕ තව එක් කරන්න',
    btn_clear_cart: '🗑 ඉවත් කරන්න',
    btn_checkout: '✅ ඇණවුම් කරන්න',
    cart_cleared: '🗑 ඔබගේ බෑගය හිස් කරන ලදී.',

    // Checkout
    ask_name: '📝 *ඇණවුම් කිරීම*\n\nකරුණාකර ඔබගේ නම ටයිප් කරන්න:',
    ask_order_type: '🚗 ඔබ ඇණවුම ලබාගන්නේ කෙසේද?',
    btn_delivery: '🚚 ඩිලිවරි',
    btn_pickup: '🏪 රැගෙන යාම',
    btn_dine_in: '🍽 ආපනශාලාවේදී',
    ask_delivery_address: '📍 කරුණාකර ඔබගේ ඩිලිවරි ලිපිනය ටයිප් කරන්න:',
    ask_table_number: '🍽 කරුණාකර ඔබගේ මේස අංකය ටයිප් කරන්න:',
    ask_notes: '📝 විශේෂ සටහනක් තිබේද?\n\n(උදා: "ළූණු අඩු කරන්න", "සැර වැඩි කරන්න")',
    btn_skip_notes: 'නැත, ස්තූතියි',
    notes_footer: 'හෝ ඔබගේ සටහන ටයිප් කරන්න',

    // Payment
    ask_payment: '💳 *ගෙවීම් ක්‍රමය*\n\nඔබ මුදල් ගෙවීමට කැමති කෙසේද?',
    btn_cod: '💵 මුදලින්',
    btn_lankaqr: '📱 ලංකා QR',
    pay_cod_label: 'භාණ්ඩ ලැබුණු පසු මුදලින්',
    pay_counter_label: 'කවුන්ටරයට මුදලින්',
    pay_lankaqr_label: '📱 ලංකා QR',

    // Confirmation
    order_summary_title: '🧾 *ඇණවුම් සාරාංශය*\n\n{items}\n',
    summary_subtotal: 'අයිතම එකතුව: {subtotal}',
    summary_delivery: 'ඩිලිවරි ගාස්තු: {deliveryFee}',
    summary_total: '*මුළු එකතුව: {total}*',
    confirm_question: 'මෙම ඇණවුම තහවුරු කරනවාද?',
    btn_confirm: '✅ තහවුරු කරන්න',
    btn_cancel: '❌ අවලංගු කරන්න',
    order_cancelled: '❌ ඔබගේ ඇණවුම අවලංගු කරන ලදී.\n\nඔබ තෝරාගත් අයිතම සුරැකී ඇත. ඔබට නැවත ඇණවුම් කළ හැක.',

    // Order Completion
    order_completed: '✅ *ඔබගේ ඇණවුම සාර්ථකව ලැබුණා!*\n\nඇණවුම් අංකය: *{orderNumber}*\nමුළු මුදල: *{total}*{payNote}\n\nකිසියම් පැහැදිලි කිරීමක් අවශ්‍ය නම් {restaurantName} ඔබව සම්බන්ධ කර ගනු ඇත.\n\nස්තූතියි! 🙏',
    cod_pay_note: '\n💵 ඇණවුම භාරගන්නා විට *{total}* සූදානම් කර තබාගන්න.',

    // LankaQR Instructions
    lankaqr_title: '📱 *ලංකා QR ගෙවීම*\n\n',
    lankaqr_prompt: 'කරුණාකර ඔබගේ *{total}* මුදල ඕනෑම ලංකා QR සහය දක්වන බැංකු හෝ ඩිජිටල් ඇප් එකකින් ගෙවන්න:\n(Genie, FriMi, Flash, ComBank Q+, HNB SOLO, BOC SmartPay, WePay, ආදිය)\n\n',
    lankaqr_bank_details: '🏦 *බැංකු තොරතුරු:*\n',
    lankaqr_bank: '• බැංකුව: {bankName}\n',
    lankaqr_account_name: '• ගිණුමේ නම: {accountName}\n',
    lankaqr_account_number: '• ගිණුම් අංකය: {accountNumber}\n',
    lankaqr_amount: '• මුදල: *{total}*\n',
    lankaqr_reference: '• යොමු අංකය (Ref): *{orderNumber}*\n\n',
    lankaqr_raw_code: '📲 *ලංකා QR කේතය:*\n```{qrPayload}```\n\n',
    lankaqr_slip_note: '📷 මුදල් හුවමාරු කළ පසු කරුණාකර රිසිට්පතේ ඡායාරූපයක් එවන්න!',

    // Fallbacks
    invalid_input: '❌ කණගාටුයි, මට එය තේරුම් ගැනීමට නොහැකි විය.\n\n{hint}',
    item_unavailable: '😔 කණගාටුයි, මෙම අයිතමය දැනට ලබාගත නොහැක.',
    choose_category: 'කරුණාකර පහත ඇති වර්ග වලින් එකක් තෝරන්න:',
    choose_item: 'කරුණාකර ලැයිස්තුවෙන් අයිතමයක් තෝරන්න:',
    valid_name_error: 'කරුණාකර වලංගු නමක් ඇතුළත් කරන්න (අවම වශයෙන් අකුරු 2ක්):',
    valid_address_error: 'කරුණාකර ඔබගේ සම්පූර්ණ ඩිලිවරි ලිපිනය ඇතුළත් කරන්න:',
    valid_table_error: 'කරුණාකර ඔබගේ මේස අංකය ඇතුළත් කරන්න:',
    valid_qty_error: 'කරුණාකර 1 සිට 99 දක්වා ප්‍රමාණයක් තෝරන්න හෝ ටයිප් කරන්න:',
    valid_action_error: 'කරුණාකර විකල්පයක් තෝරන්න:',
    valid_confirm_error: 'කරුණාකර පහත බොත්තම් මගින් තහවුරු කරන්න හෝ අවලංගු කරන්න:',
  },
};

/**
 * Get translated string with optional parameter interpolation.
 *
 * @param {string} key
 * @param {string} [lang='en'] - 'en' | 'si'
 * @param {object} [params={}] - Parameters to interpolate {name: value}
 * @returns {string}
 */
export function t(key, lang = 'en', params = {}) {
  const dictionary = translations[lang] || translations.en;
  let text = dictionary[key] || translations.en[key] || key;

  for (const [paramKey, paramVal] of Object.entries(params)) {
    text = text.replaceAll(`{${paramKey}}`, String(paramVal));
  }

  return text;
}

/**
 * Format price in Rupees according to language.
 *
 * @param {number} amount
 * @param {string} [lang='en'] - 'en' | 'si'
 * @returns {string}
 */
export function formatPriceLocalized(amount, lang = 'en') {
  const formatted = new Intl.NumberFormat('en-LK', {
    maximumFractionDigits: 0,
  }).format(amount);

  const symbol = lang === 'si' ? 'රු.' : 'Rs.';
  return `${symbol} ${formatted}`;
}
