import express from 'express';
import healthRoutes from './routes/health.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import devRoutes from './routes/dev.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.json());

// Disable X-Powered-By header to avoid leaking server info
app.disable('x-powered-by');

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
