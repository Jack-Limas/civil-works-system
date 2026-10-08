import { geminiClient, GEMINI_MODEL } from "../../config/gemini";
import { RiskStrategy, ProjectRiskContext, ProjectRiskAssessment } from "./risk-strategy.interface";
import { AppError } from "../../utils/app-error";

const SYSTEM_INSTRUCTION = `You are a construction risk-analysis assistant for projects of any type
(residential and commercial buildings, roads, bridges, schools, health centers,
warehouses, remodeling, sports facilities, pools and retaining walls).
You receive structured JSON data about a construction project (amounts in COP) and must return
ONLY a JSON object (no markdown, no backticks, no explanation outside the JSON)
with this exact shape:

{
  "delayRisk": { "level": "LOW" | "MEDIUM" | "HIGH", "reasoning": "short reasoning in Spanish, max 2 sentences" },
  "costOverrunRisk": { "level": "LOW" | "MEDIUM" | "HIGH", "reasoning": "short reasoning in Spanish, max 2 sentences" },
  "confidence": 0.0 to 1.0
}

Base your analysis on: progress vs expected progress, budget execution vs
physical progress, open incidents, and low-stock materials. Be conservative:
only mark HIGH when the data clearly shows a serious problem.`;

export class AIRiskStrategy implements RiskStrategy {
  readonly name = "AI_GEMINI";

  async analyze(context: ProjectRiskContext): Promise<ProjectRiskAssessment> {
    const prompt = `Project data:\n${JSON.stringify(context, null, 2)}`;

    let rawText = "";
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const response = await geminiClient.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
          },
        });

        rawText = response.text ?? "";
        if (rawText) break;
      } catch {
        console.warn(`[AI_GEMINI] Intento ${attempts}/${maxAttempts} ocupado. Esperando para reintentar...`);
        if (attempts >= maxAttempts) {
          throw new AppError(502, "Gemini AI service is currently unavailable due to high demand");
        }
        await new Promise((resolve) => setTimeout(resolve, attempts * 1000));
      }
    }

    let parsed: Omit<ProjectRiskAssessment, "source">;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new AppError(502, "Gemini returned an invalid response format");
    }

    return { ...parsed, source: this.name };
  }
}