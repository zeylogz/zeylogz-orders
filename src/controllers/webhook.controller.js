import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { getDb } from '../database/db.js';
import { getRestaurantByPhoneNumberId, getRestaurantById } from '../services/restaurant.service.js';
import { parseIncomingWebhook, sendFormattedMessage } from '../services/whatsapp.service.js';
import { handleIncomingMessage } from '../services/conversation.service.js';

/**
 * GET /webhook
 * Meta WhatsApp Cloud API verification challenge.
 */
export function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.META_VERIFY_TOKEN) {
    logger.info('Meta webhook verification successful');
    return res.status(200).send(challenge);
  }

  logger.warn('Meta webhook verification failed', { mode, tokenReceived: Boolean(token) });
  return res.status(403).json({ error: 'Forbidden' });
}

/**
 * Check if a message was already processed (idempotency query).
 */
export function isMessageProcessed(messageId, db = getDb()) {
  if (!messageId) return false;
  const row = db.prepare('SELECT message_id FROM processed_messages WHERE message_id = ?').get(messageId);
  return Boolean(row);
}

/**
 * Mark a message as processed.
 */
export function markMessageProcessed(messageId, restaurantId, db = getDb()) {
  if (!messageId) return;
  db.prepare(`
    INSERT OR IGNORE INTO processed_messages (message_id, restaurant_id)
    VALUES (?, ?)
  `).run(messageId, restaurantId);
}

/**
 * Atomically attempt to claim and mark a message as processed.
 * Returns true if this is the first time the message is being processed,
 * or false if it was already processed (or is currently being processed).
 */
export function tryMarkMessageProcessed(messageId, restaurantId, db = getDb()) {
  if (!messageId) return true;
  const result = db.prepare(`
    INSERT OR IGNORE INTO processed_messages (message_id, restaurant_id)
    VALUES (?, ?)
  `).run(messageId, restaurantId);
  return result.changes > 0;
}

/**
 * Validate incoming X-Hub-Signature-256 header when META_APP_SECRET is set.
 */
export function verifySignature(rawBody, signature, appSecret = env.META_APP_SECRET) {
  if (!appSecret || !signature) return true; // Signature check skipped if secret is not set

  try {
    const rawBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody || '', 'utf-8');
    const hash = crypto.createHmac('sha256', appSecret).update(rawBuffer).digest('hex');
    const expected = `sha256=${hash}`;
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (err) {
    logger.error('Signature verification error', { error: err.message });
    return false;
  }
}

/**
 * POST /webhook
 * Handle incoming WhatsApp events.
 */
export async function handleWebhook(req, res) {
  const db = getDb();

  // Signature verification if META_APP_SECRET is configured
  if (env.META_APP_SECRET) {
    const signature = req.headers['x-hub-signature-256'];
    if (!verifySignature(req.rawBody, signature, env.META_APP_SECRET)) {
      logger.warn('Meta webhook signature verification failed');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  // Always respond with 200 promptly so Meta doesn't retry
  res.sendStatus(200);

  // Log every incoming webhook delivery for complete visibility
  const eventField = req.body?.entry?.[0]?.changes?.[0]?.field;
  logger.info('Meta webhook event received', {
    object: req.body?.object,
    field: eventField || 'unknown',
  });

  try {
    const parsed = parseIncomingWebhook(req.body);
    if (!parsed) {
      // Could be a status update (delivered/read), non-message event, or ping
      return;
    }

    const { phoneNumberId, messageId, from, text, buttonId, listRowId } = parsed;

    logger.info('Incoming WhatsApp customer message', {
      phoneNumberId,
      messageId,
      from,
      hasText: Boolean(text),
      buttonId,
      listRowId,
    });

    // Resolve restaurant by WhatsApp phone number ID
    let restaurant = getRestaurantByPhoneNumberId(phoneNumberId, db);

    // Fallback only in development or test mode for local simulation convenience
    if (!restaurant) {
      if (env.NODE_ENV !== 'production') {
        restaurant = getRestaurantById(1, db); // Fallback to demo restaurant 1 in dev/test
      }
      if (!restaurant) {
        logger.error('No matching restaurant found for phone number ID', { phoneNumberId, env: env.NODE_ENV });
        return;
      }
    }

    // Atomic idempotency check: guarantees duplicate or concurrent webhook messages are skipped
    if (messageId) {
      const isNew = tryMarkMessageProcessed(messageId, restaurant.id, db);
      if (!isNew) {
        logger.info('Duplicate webhook message received, skipping processing', { messageId });
        return;
      }
    }

    // Pass event to conversation state machine
    const result = handleIncomingMessage({
      restaurantId: restaurant.id,
      fromPhone: from,
      text,
      buttonId,
      listRowId,
    }, db);

    const outgoingPhoneId = restaurant.whatsapp_phone_number_id || phoneNumberId;
    const accessToken = restaurant.meta_access_token || env.META_ACCESS_TOKEN;

    // Send customer responses
    if (result.replies && result.replies.length > 0) {
      for (const reply of result.replies) {
        await sendFormattedMessage(from, reply, outgoingPhoneId, accessToken);
      }
    }

    // Send owner notification if order was placed
    if (result.ownerNotification) {
      logger.info('Sending restaurant owner notification', {
        to: result.ownerNotification.to,
      });
      await sendFormattedMessage(
        result.ownerNotification.to,
        result.ownerNotification.message,
        outgoingPhoneId,
        accessToken
      );
    }
  } catch (err) {
    logger.error('Error handling webhook event', { error: err.message, stack: err.stack });
  }
}
