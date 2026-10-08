import { riskContextService } from "./risk-context.service";
import { predictionRepository } from "../repositories/prediction.repository";
import { RuleBasedRiskStrategy } from "../strategies/risk/rule-based-risk.strategy";
import { AIRiskStrategy } from "../strategies/risk/ai-risk.strategy";
import {
  RiskStrategy,
  ProjectRiskAssessment,
  RiskLevel,
} from "../strategies/risk/risk-strategy.interface";

export type StrategyName = "RULE_BASED" | "AI_GEMINI";

const strategies: Record<StrategyName, RiskStrategy> = {
  RULE_BASED: new RuleBasedRiskStrategy(),
  AI_GEMINI: new AIRiskStrategy(),
};

const RISK_LEVELS: readonly RiskLevel[] = ["LOW", "MEDIUM", "HIGH"];

/** Shape persisted in Prediction.resultJson. */
interface StoredRisk {
  level: RiskLevel;
  reasoning: string;
  source: string;
}

function asStoredRisk(value: unknown): StoredRisk | null {
  if (!value || typeof value !== "object") return null;
  const { level, reasoning, source } = value as Record<string, unknown>;
  if (typeof reasoning !== "string" || typeof source !== "string") return null;
  if (!RISK_LEVELS.includes(level as RiskLevel)) return null;
  return { level: level as RiskLevel, reasoning, source };
}

/**
 * When Gemini is unavailable, rebuild the latest AI assessment stored for the
 * project. Returns null when the project has never been analyzed with AI.
 */
async function findLastAiAssessment(projectId: string): Promise<ProjectRiskAssessment | null> {
  const history = await predictionRepository.findByProject(projectId);
  const lastAi = (type: "DELAY_RISK" | "COST_OVERRUN_RISK") =>
    history.find((p) => p.type === type && asStoredRisk(p.resultJson)?.source === "AI_GEMINI");

  const delay = lastAi("DELAY_RISK");
  const cost = lastAi("COST_OVERRUN_RISK");
  const delayRisk = asStoredRisk(delay?.resultJson);
  const costRisk = asStoredRisk(cost?.resultJson);
  if (!delay || !delayRisk || !costRisk) return null;

  return {
    delayRisk: { level: delayRisk.level, reasoning: delayRisk.reasoning },
    costOverrunRisk: { level: costRisk.level, reasoning: costRisk.reasoning },
    confidence: delay.confidence ?? 0,
    source: "AI_GEMINI",
  };
}

export const predictionService = {
  /**
   * Runs a strategy and stores its result. If Gemini fails, the last stored AI
   * assessment is returned with fromCache=true and is NOT persisted again, so
   * the history never contains duplicated "new" predictions.
   */
  async generate(projectId: string, strategyName: StrategyName) {
    const context = await riskContextService.build(projectId);

    let assessment: ProjectRiskAssessment;
    try {
      assessment = await strategies[strategyName].analyze(context);
    } catch (error) {
      if (strategyName !== "AI_GEMINI") throw error;

      const cached = await findLastAiAssessment(projectId);
      if (!cached) throw error;

      console.warn("[predictionService] Gemini unavailable, serving the last stored AI assessment");
      return { assessment: cached, predictions: [], fromCache: true };
    }

    const [delayPrediction, costPrediction] = await Promise.all([
      predictionRepository.create({
        projectId,
        type: "DELAY_RISK",
        resultJson: { ...assessment.delayRisk, source: assessment.source },
        confidence: assessment.confidence,
      }),
      predictionRepository.create({
        projectId,
        type: "COST_OVERRUN_RISK",
        resultJson: { ...assessment.costOverrunRisk, source: assessment.source },
        confidence: assessment.confidence,
      }),
    ]);

    return { assessment, predictions: [delayPrediction, costPrediction], fromCache: false };
  },

  async history(projectId: string) {
    return predictionRepository.findByProject(projectId);
  },

  /**
   * Compares both strategies side by side. The AI side degrades to the last
   * stored assessment, or to `null` when there is nothing to show.
   */
  async compareStrategies(projectId: string) {
    const context = await riskContextService.build(projectId);
    const ruleBased = await strategies.RULE_BASED.analyze(context);

    try {
      const ai = await strategies.AI_GEMINI.analyze(context);
      return { ruleBased, ai, aiFromCache: false };
    } catch {
      console.warn("[compareStrategies] Gemini unavailable, falling back to the last stored assessment");
      const ai = await findLastAiAssessment(projectId);
      return { ruleBased, ai, aiFromCache: ai !== null };
    }
  },
};
