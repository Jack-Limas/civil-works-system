import { geminiClient, GEMINI_MODEL } from "../../config/gemini";
import { RiskStrategy, ProjectRiskContext, ProjectRiskAssessment } from "./risk-strategy.interface";
import { AppError } from "../../utils/app-error";

const SYSTEM_INSTRUCTION = `You are a civil construction risk-analysis assistant.
You receive structured JSON data about a construction project and must return
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

    let rawText: string;
    try {
      const response = await geminiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
        },
      });
      rawText = response.text ?? "";
    } catch (error) {
      throw new AppError(502, "Gemini AI service is currently unavailable");
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