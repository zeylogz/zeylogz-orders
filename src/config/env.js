import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Meta WhatsApp Cloud API
  META_VERIFY_TOKEN: z.string().default(''),
  META_ACCESS_TOKEN: z.string().default(''),
  META_PHONE_NUMBER_ID: z.string().default(''),
  META_WABA_ID: z.string().default(''),
  META_GRAPH_API_VERSION: z.string().default('v21.0'),
  META_APP_SECRET: z.string().default(''),

  // Database
  DB_PATH: z.string().default('./data/ordering.db'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }

  return Object.freeze(result.data);
}

export const env = loadEnv();
