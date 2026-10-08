import { GoogleGenAI } from "@google/genai";
import { env } from "./env";

// Both values are validated at startup by the env schema
export const geminiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

/** Model name comes from GEMINI_MODEL so it can change without touching code. */
export const GEMINI_MODEL = env.GEMINI_MODEL;
