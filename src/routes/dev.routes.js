import { Router } from 'express';
import { env } from '../config/env.js';
import { handleIncomingMessage } from '../services/conversation.service.js';
import { getOrCreateSession, resetSession } from '../services/session.service.js';
import { getRestaurantById } from '../services/restaurant.service.js';

const router = Router();

// Middleware: block in production
router.use((_req, res, next) => {
  if (env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: { message: 'Development endpoints are disabled in production mode.' },
    });
  }
  next();
});

/**
 * POST /api/dev/message
 * Simulate incoming message from a WhatsApp customer.
 *
 * Body:
 * {
 *   "restaurantId": 1,
 *   "phoneNumber": "94771234567",
 *   "message": "Hi",            // Optional: text message
 *   "buttonId": "action_menu",  // Optional: interactive button click
 *   "listRowId": "category_1"   // Optional: interactive list row selection
 * }
 */
router.post('/message', (req, res, next) => {
  try {
    const {
      restaurantId = 1,
      phoneNumber = '94770000000',
      message = '',
      buttonId,
      listRowId,
    } = req.body;

    const result = handleIncomingMessage({
      restaurantId: Number(restaurantId),
      fromPhone: String(phoneNumber),
      text: message,
      buttonId,
      listRowId,
    });

    res.json({
      success: true,
      phoneNumber,
      restaurantId,
      currentState: result.session ? result.session.state : null,
      cart: result.session ? result.session.cart : [],
      replies: result.replies,
      ownerNotification: result.ownerNotification,
      order: result.order,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dev/session
 * Inspect current session state and cart.
 */
router.get('/session', (req, res, next) => {
  try {
    const restaurantId = Number(req.query.restaurantId || 1);
    const phoneNumber = String(req.query.phoneNumber || '94770000000');

    const session = getOrCreateSession(restaurantId, phoneNumber);
    res.json({
      success: true,
      session,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/dev/reset
 * Reset conversation session for a phone number.
 */
router.post('/reset', (req, res, next) => {
  try {
    const { restaurantId = 1, phoneNumber = '94770000000' } = req.body;
    const session = getOrCreateSession(Number(restaurantId), String(phoneNumber));
    const reset = resetSession(session.id);

    res.json({
      success: true,
      message: 'Session reset successfully',
      session: reset,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
