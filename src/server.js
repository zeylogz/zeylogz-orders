import app from './app.js';
import { env } from './config/env.js';
import { initializeDatabase, closeDatabase } from './database/db.js';
import { seedDatabase } from './database/seed.js';
import { logger } from './utils/logger.js';

// ---------------------------------------------------------------------------
// Initialize database & auto-seed if empty
// ---------------------------------------------------------------------------
const db = initializeDatabase();
const restaurantCount = db.prepare('SELECT COUNT(*) as count FROM restaurants').get();
if (restaurantCount.count === 0) {
  seedDatabase(db);
  logger.info('Database auto-seeded with default demo data');
}

const PORT = env.PORT;

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Zeylogz Orders server running on http://0.0.0.0:${PORT}`);
  logger.info(`   Environment: ${env.NODE_ENV}`);
  logger.info(`   Health check: http://localhost:${PORT}/health`);
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(() => {
    closeDatabase();
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds if connections won't close
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
