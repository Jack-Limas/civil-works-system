import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  PORT: z.string().default("4000"),
  FRONTEND_URL: z.string().url(),
  DATABASE_URL: z.string(),
  JWT_ACCESS_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  COOKIE_SECRET: z.string().min(10),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("7d"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1),
});

export const env = envSchema.parse(process.env);