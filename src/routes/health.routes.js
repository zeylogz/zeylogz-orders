import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.get('/privacy', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy — Zeylogz Orders</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #222; }
    h1 { color: #059669; }
  </style>
</head>
<body>
  <h1>Privacy Policy — Zeylogz Orders</h1>
  <p>Last updated: September 2026</p>
  <p>Zeylogz Orders by Zeylogz provides automated WhatsApp ordering services for restaurants. We respect your privacy and protect customer data.</p>
  <h2>Information We Process</h2>
  <p>We collect your WhatsApp phone number, customer name, delivery address, and order items strictly for fulfilling your restaurant orders.</p>
  <h2>Data Security</h2>
  <p>All data is processed securely and is never sold or shared with third parties.</p>
  <h2>Contact</h2>
  <p>For questions or data deletion requests, contact us at privacy@zeylogz.com.</p>
</body>
</html>`);
});

export default router;
