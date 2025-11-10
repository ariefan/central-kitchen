import type { Config } from 'drizzle-kit';
import { env } from './src/config/env';

export default {
  dialect: 'postgresql',
  schema: './src/config/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
  tablesFilter: ['erp_*'],
} satisfies Config;