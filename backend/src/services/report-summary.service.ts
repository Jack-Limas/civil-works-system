import { geminiClient, GEMINI_MODEL } from "../config/gemini";
import { ReportSummaryInput } from "../schemas/report.schema";
import { RequestUser } from "../types/auth";
import { AppError } from "../utils/app-error";
import { reportService } from "./report.service";

/** One summary request every 10 s per user (in memory; enough for a single API instance). */
const RATE_LIMIT_MS = 10_000;
const lastRequestByUser = new Map<string, number>();
/** Rows sent to the model are capped to keep the prompt small and fast. */
const MAX_ROWS_IN_PROMPT = 25;

const LANGUAGE_NAME = { es: "español", en: "English" } as const;

function systemInstruction(locale: "es" | "en") {
  return `You are a senior construction project analyst for ObraIQ, a platform that manages construction
projects of any type in Nariño, Colombia. You receive a report computed by the system as JSON.
Write an executive summary in ${LANGUAGE_NAME[locale]} for a construction company manager:
- 3 to 5 short bullet points with the most important findings, using the numbers provided.
- Then one line starting with "${locale === "es" ? "Recomendación:" : "Recommendation:"}" with the single most useful action.
Rules: use ONLY the data provided; never invent figures; money is in Colombian pesos (COP) without decimals;
percentages keep one decimal; plain text, no markdown headings, no tables.`;
}

export const reportSummaryService = {
  /**
   * Executive summary of a report. The data is ALWAYS recomputed on the server
   * with the requester's role filter (client figures are never accepted).
   * Gemini failures surface as 502 and never affect the report itself.
   */
  async summarize(input: ReportSummaryInput, requester: RequestUser) {
    const now = Date.now();
    const last = lastRequestByUser.get(requester.sub);
    if (last && now - last < RATE_LIMIT_MS) {
      const retryAfter = Math.ceil((RATE_LIMIT_MS - (now - last)) / 1000);
      throw new AppError(429, "Please wait before requesting another summary", { retryAfterSeconds: retryAfter });
    }
    lastRequestByUser.set(requester.sub, now);

    const report = await reportService.generate(
      input.type,
      { projectId: input.projectId, from: input.from, to: input.to },
      requester
    );
    const { meta, ...data } = report;
    const compact = {
      ...data,
      rows: "rows" in data ? data.rows.slice(0, MAX_ROWS_IN_PROMPT) : [],
      totalRows: "rows" in data ? data.rows.length : 0,
      // Daily series are long and add little to a summary
      series: undefined,
    };

    try {
      const response = await geminiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Report (${input.type}):\n${JSON.stringify(compact)}`,
        config: { systemInstruction: systemInstruction(input.locale) },
      });
      const text = response.text?.trim();
      if (!text) throw new Error("Empty response");
      return { summary: text, model: GEMINI_MODEL, basedOn: meta };
    } catch {
      throw new AppError(502, "The AI summary is unavailable right now");
    }
  },
};
