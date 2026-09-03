import { Router } from 'express';

const router = Router();

// GET /webhook — Meta verification challenge
router.get('/webhook', (req, res) => {
  // Placeholder: will be implemented in Phase I (Meta webhook integration)
  res.status(200).send('Webhook verification not yet configured');
});

// POST /webhook — incoming WhatsApp events
router.post('/webhook', (req, res) => {
  // Placeholder: will be implemented in Phase I
  res.sendStatus(200);
});

export default router;
