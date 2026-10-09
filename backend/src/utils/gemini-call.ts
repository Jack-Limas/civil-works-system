import { ThinkingLevel } from "@google/genai";
import { geminiClient, GEMINI_MODEL } from "../config/gemini";
import { AppError } from "./app-error";

/**
 * Client-side limit per attempt. It is enforced with an AbortSignal, NOT with
 * httpOptions.timeout: that option is also sent to Gemini as a server deadline,
 * and the API answered 504 DEADLINE_EXCEEDED at ~10 s even for requests that
 * finish in 6 s without it (measured on 2026-10-09).
 */
const ATTEMPT_TIMEOUT_MS = 30_000;
/** Only failures that come back fast (overload, rate limit) are worth one retry. */
const RETRY_IF_FAILED_WITHIN_MS = 8_000;
const RETRY_DELAY_MS = 800;

/**
 * Low reasoning effort: these are short data questions. With the default the
 * configured flash model took ~30 s per answer; with LOW, ~5 s (same answers).
 * Models that do not support the option are retried once without it.
 */
const FAST_THINKING = { thinkingLevel: ThinkingLevel.LOW };

/** Why an answer could not be produced; callers turn it into their HTTP error. */
export type GenerateFailure = { ok: false; reason: "quota"; retryAfterSeconds: number | null } | { ok: false; reason: "unavailable" };
export type GenerateResult = { ok: true; text: string } | GenerateFailure;

/**
 * A spent quota (free tier: a few requests per model per day) is not transient:
 * retrying is useless and the user deserves to know how long to wait.
 */
function quotaFailure(text: string): GenerateFailure | null {
  if (!/RESOURCE_EXHAUSTED|exceeded your current quota|"code":\s*429/i.test(text)) return null;
  const delay = text.match(/"retryDelay":\s*"(\d+)(?:\.\d+)?s"/);
  return { ok: false, reason: "quota", retryAfterSeconds: delay ? Number(delay[1]) : null };
}

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function call(contents: string, systemInstruction: string, withThinkingConfig: boolean) {
  const response = await geminiClient.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction,
      ...(withThinkingConfig && { thinkingConfig: FAST_THINKING }),
      abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      // The SDK retries up to 5 times by default (that made failures take ~84 s): this helper owns the policy
      httpOptions: { retryOptions: { attempts: 1 } },
    },
  });
  const text = response.text?.trim();
  if (!text) throw new Error("Empty response");
  return text;
}

/**
 * One Gemini text answer with a bounded wait and at most one retry. On failure
 * the cause is logged truncated (never the prompt or the key) and returned as
 * a reason, so callers answer "quota spent" or "unavailable".
 */
export async function generateText(label: string, contents: string, systemInstruction: string): Promise<GenerateResult> {
  let useThinkingConfig = true;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const started = Date.now();
    try {
      return { ok: true, text: await call(contents, systemInstruction, useThinkingConfig) };
    } catch (error) {
      const text = message(error);
      console.warn(`[${label}] Gemini attempt ${attempt}/2 failed after ${Date.now() - started} ms:`, text.slice(0, 300));
      // A model without "thinking level" support rejects the option: retry plainly
      if (useThinkingConfig && /thinking/i.test(text) && /400|INVALID_ARGUMENT/i.test(text)) {
        useThinkingConfig = false;
        continue;
      }
      const quota = quotaFailure(text);
      if (quota) return quota;
      if (Date.now() - started > RETRY_IF_FAILED_WITHIN_MS) break;
      if (attempt === 1) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  return { ok: false, reason: "unavailable" };
}

/** Same AppError shape for every AI feature: 503 + AI_QUOTA_EXCEEDED, or 502 when Gemini is down. */
export function aiFailureError(result: GenerateFailure, unavailableMessage: string) {
  return result.reason === "quota"
    ? new AppError(503, "The daily AI quota is used up", { code: "AI_QUOTA_EXCEEDED", retryAfterSeconds: result.retryAfterSeconds })
    : new AppError(502, unavailableMessage);
}
