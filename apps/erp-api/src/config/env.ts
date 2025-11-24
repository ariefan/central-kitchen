import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().url("Invalid database URL"),
  JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("24h"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  BETTER_AUTH_URL: z.string().url().optional(),
  BETTER_AUTH_SECRET: z.string().optional(),
  FRONTEND_URL: z.string().url().optional(),
  COOKIE_DOMAIN: z.string().optional(),
});

function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error("Invalid environment variables:");
    console.error(error);
    process.exit(1);
  }
}

export const env = validateEnv();

export type Env = z.infer<typeof envSchema>;
