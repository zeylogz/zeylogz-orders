import { getDb } from '../database/db.js';
import { logger } from '../utils/logger.js';

const SESSION_TTL_HOURS = 24;

/**
 * Find or create a conversation session for a restaurant + WhatsApp number.
 * Returns the session with parsed cart_data and context_data.
 */
export function getOrCreateSession(restaurantId, whatsappNumber, db = getDb()) {
  let session = db.prepare(`
    SELECT * FROM conversation_sessions
    WHERE restaurant_id = ? AND whatsapp_number = ?
  `).get(restaurantId, whatsappNumber);

  if (session) {
    // Check if expired
    if (new Date(session.expires_at) < new Date()) {
      logger.info('Session expired, resetting', { restaurantId, whatsappNumber });
      return resetSession(session.id, db);
    }

    // Extend expiry on activity
    db.prepare(`
      UPDATE conversation_sessions
      SET expires_at = datetime('now', '+${SESSION_TTL_HOURS} hours'),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(session.id);

    return parseSession(session);
  }

  // Create new session
  const result = db.prepare(`
    INSERT INTO conversation_sessions
      (restaurant_id, whatsapp_number, state, language, cart_data, context_data, expires_at)
    VALUES (?, ?, 'WELCOME', 'en', '[]', '{}', datetime('now', '+${SESSION_TTL_HOURS} hours'))
  `).run(restaurantId, whatsappNumber);

  logger.debug('New session created', { restaurantId, whatsappNumber });

  return {
    id: result.lastInsertRowid,
    restaurant_id: restaurantId,
    whatsapp_number: whatsappNumber,
    customer_id: null,
    state: 'WELCOME',
    language: 'en',
    cart: [],
    context: {},
  };
}


/**
 * Update session state, cart, and context.
 */
export function updateSession(sessionId, updates, db = getDb()) {
  const { state, language, cart, context, customerId } = updates;

  const sets = [];
  const params = [];

  if (state !== undefined) {
    sets.push('state = ?');
    params.push(state);
  }
  if (language !== undefined) {
    sets.push('language = ?');
    params.push(language);
  }
  if (cart !== undefined) {
    sets.push('cart_data = ?');
    params.push(JSON.stringify(cart));
  }
  if (context !== undefined) {
    sets.push('context_data = ?');
    params.push(JSON.stringify(context));
  }
  if (customerId !== undefined) {
    sets.push('customer_id = ?');
    params.push(customerId);
  }

  sets.push("updated_at = datetime('now')");
  params.push(sessionId);

  db.prepare(`
    UPDATE conversation_sessions
    SET ${sets.join(', ')}
    WHERE id = ?
  `).run(...params);
}

/**
 * Reset a session to its initial state.
 */
export function resetSession(sessionId, db = getDb()) {
  db.prepare(`
    UPDATE conversation_sessions
    SET state = 'WELCOME',
        cart_data = '[]',
        context_data = '{}',
        expires_at = datetime('now', '+${SESSION_TTL_HOURS} hours'),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(sessionId);

  const session = db.prepare('SELECT * FROM conversation_sessions WHERE id = ?').get(sessionId);
  return parseSession(session);
}

/**
 * Parse JSON columns from a raw session row.
 */
function parseSession(row) {
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    whatsapp_number: row.whatsapp_number,
    customer_id: row.customer_id,
    state: row.state,
    language: row.language || 'en',
    cart: safeJsonParse(row.cart_data, []),
    context: safeJsonParse(row.context_data, {}),
  };
}


function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
