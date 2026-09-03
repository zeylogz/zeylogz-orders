import { Router } from 'express';
import { verifyWebhook, handleWebhook } from '../controllers/webhook.controller.js';

const router = Router();

// GET /webhook — Meta verification challenge
router.get('/webhook', verifyWebhook);

// POST /webhook — incoming WhatsApp events
router.post('/webhook', handleWebhook);

export default router;

