import express from 'express';
import healthRoutes from './routes/health.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import devRoutes from './routes/dev.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { env } from './config/env.js';

const app = express();

// ---------------------------------------------------------------------------
// Security & Headers Middleware
// ---------------------------------------------------------------------------
app.disable('x-powered-by');

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Capture raw body for Meta webhook signature verification (X-Hub-Signature-256)
app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use(healthRoutes);
app.use(webhookRoutes);
app.use('/api/dev', devRoutes);

// ---------------------------------------------------------------------------
// Error handling (must be registered last)
// ---------------------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
