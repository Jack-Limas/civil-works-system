import { GEMINI_MODEL } from "../config/gemini";
import { aiFailureError, generateText } from "../utils/gemini-call";
import { ReportSummaryInput } from "../schemas/report.schema";
import { RequestUser } from "../types/auth";
import { AppError } from "../utils/app-error";
import { reportService } from "./report.service";

/** One summary request every 10 s per user, counted from the start and the end of the previous one (in memory). */
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

    // Time budget and the single retry (Gemini sometimes answers 503 "high demand") live in generateText
    const result = await generateText("reportSummary", `Report (${input.type}):
${JSON.stringify(compact)}`, systemInstruction(input.locale));
    // The 10 s window also counts from the end of the call: a slow failure must not allow an instant retry
    lastRequestByUser.set(requester.sub, Date.now());
    if (result.ok) return { summary: result.text, model: GEMINI_MODEL, basedOn: meta };
    throw aiFailureError(result, "The AI summary is unavailable right now");
  },
};
