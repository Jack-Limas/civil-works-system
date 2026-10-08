import { geminiClient, GEMINI_MODEL } from "../config/gemini";

/**
 * Each attempt gets the minimum deadline Gemini accepts (shorter ones are
 * rejected with 400 "Minimum allowed deadline is 10s"), so two attempts plus
 * the pause stay within ~20 s.
 */
const ATTEMPT_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 500;

/**
 * One Gemini call with a per-attempt deadline and a single retry.
 *
 * The SDK retries up to 5 times by default, which made a failing call take
 * ~84 s; its own retries are disabled here so this function owns the policy.
 * Returns the trimmed text, or null when every attempt failed. The cause is
 * logged truncated (never the prompt or keys) so callers only map null to 502.
 */
export async function generateText(label: string, contents: string, systemInstruction: string): Promise<string | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await geminiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction,
          httpOptions: { timeout: ATTEMPT_TIMEOUT_MS, retryOptions: { attempts: 1 } },
        },
      });
      const text = response.text?.trim();
      if (!text) throw new Error("Empty response");
      return text;
    } catch (error) {
      console.warn(`[${label}] Gemini attempt ${attempt}/2 failed:`, error instanceof Error ? error.message.slice(0, 300) : error);
      if (attempt === 1) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  return null;
}
