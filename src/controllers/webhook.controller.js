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
 * Check if a message was already processed (idempotency).
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
 * Validate incoming X-Hub-Signature-256 header when META_APP_SECRET is set.
 */
export function verifySignature(rawBody, signature, appSecret = env.META_APP_SECRET) {
  if (!appSecret || !signature) return true; // Signature check skipped if secret is not set

  try {
    const hash = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
    const expected = `sha256=${hash}`;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
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

  // Always respond with 200 promptly so Meta doesn't retry
  res.sendStatus(200);

  try {
    const parsed = parseIncomingWebhook(req.body);
    if (!parsed) {
      // Could be a status update (delivered/read) or ping
      return;
    }

    const { phoneNumberId, messageId, from, text, buttonId, listRowId } = parsed;

    logger.info('Incoming WhatsApp message', {
      phoneNumberId,
      messageId,
      from,
      hasText: Boolean(text),
      buttonId,
      listRowId,
    });

    // Resolve restaurant by WhatsApp phone number ID
    let restaurant = getRestaurantByPhoneNumberId(phoneNumberId, db);

    // Fallback for development/testing if phone number ID is not yet mapped
    if (!restaurant) {
      restaurant = getRestaurantById(1, db); // Fallback to demo restaurant 1
      if (!restaurant) {
        logger.error('No matching restaurant found for phone number ID', { phoneNumberId });
        return;
      }
    }

    // Idempotency check: avoid duplicate processing of retried webhook messages
    if (messageId && isMessageProcessed(messageId, db)) {
      logger.info('Duplicate webhook message received, skipping processing', { messageId });
      return;
    }

    if (messageId) {
      markMessageProcessed(messageId, restaurant.id, db);
    }

    // Pass event to conversation state machine
    const result = handleIncomingMessage({
      restaurantId: restaurant.id,
      fromPhone: from,
      text,
      buttonId,
      listRowId,
    }, db);

    // Send customer responses
    if (result.replies && result.replies.length > 0) {
      for (const reply of result.replies) {
        await sendFormattedMessage(from, reply, phoneNumberId);
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
        phoneNumberId
      );
    }
  } catch (err) {
    logger.error('Error handling webhook event', { error: err.message, stack: err.stack });
  }
}
