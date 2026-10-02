import { GoogleGenAI } from "@google/genai";
import { env } from "./env";

const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY no está configurada en las variables de entorno.");
}

export const geminiClient = new GoogleGenAI({ apiKey });

export const GEMINI_MODEL = "gemini-3.8-flash";