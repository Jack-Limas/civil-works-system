import { riskContextService } from "./risk-context.service";
import { predictionRepository } from "../repositories/prediction.repository";
import { RuleBasedRiskStrategy } from "../strategies/risk/rule-based-risk.strategy";
import { AIRiskStrategy } from "../strategies/risk/ai-risk.strategy";
import { RiskStrategy, ProjectRiskAssessment } from "../strategies/risk/risk-strategy.interface";

export type StrategyName = "RULE_BASED" | "AI_GEMINI";

const strategies: Record<StrategyName, RiskStrategy> = {
  RULE_BASED: new RuleBasedRiskStrategy(),
  AI_GEMINI: new AIRiskStrategy(),
};

export const predictionService = {
  async generate(projectId: string, strategyName: StrategyName) {
    const strategy = strategies[strategyName];
    const context = await riskContextService.build(projectId);
    
    let assessment: ProjectRiskAssessment;

    try {
      assessment = await strategy.analyze(context);
    } catch (error) {
      if (strategyName === "AI_GEMINI") {
        console.warn("[predictionService] Fallback activo: Recuperando último análisis de Gemini desde PostgreSQL...");
        const history = await predictionRepository.findByProject(projectId);
        const lastAiDelay = history.find((p) => p.type === "DELAY_RISK" && (p.resultJson as any)?.source === "AI_GEMINI");
        const lastAiCost = history.find((p) => p.type === "COST_OVERRUN_RISK" && (p.resultJson as any)?.source === "AI_GEMINI");

        if (lastAiDelay && lastAiCost) {
          assessment = {
            delayRisk: {
              level: (lastAiDelay.resultJson as any).level,
              reasoning: (lastAiDelay.resultJson as any).reasoning + " (Recuperado de caché por alta demanda)",
            },
            costOverrunRisk: {
              level: (lastAiCost.resultJson as any).level,
              reasoning: (lastAiCost.resultJson as any).reasoning + " (Recuperado de caché por alta demanda)",
            },
            confidence: lastAiDelay.confidence ?? 0.95,
            source: "AI_GEMINI",
          };
        } else {
          throw error;
        }
      } else {
        throw error;
      }
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

    return { assessment, predictions: [delayPrediction, costPrediction] };
  },

  async history(projectId: string) {
    return predictionRepository.findByProject(projectId);
  },

  /**
   * Compara ambas estrategias lado a lado.
   */
  async compareStrategies(projectId: string) {
    const context = await riskContextService.build(projectId);

    const ruleBasedResult = await strategies.RULE_BASED.analyze(context);

    let aiResult: ProjectRiskAssessment;
    try {
      aiResult = await strategies.AI_GEMINI.analyze(context);
    } catch (error) {
      console.warn("[compareStrategies] IA no disponible temporalmente. Buscando última predicción en BD...");
      
      const history = await predictionRepository.findByProject(projectId);
      const lastAiDelay = history.find((p) => p.type === "DELAY_RISK" && (p.resultJson as any)?.source === "AI_GEMINI");
      const lastAiCost = history.find((p) => p.type === "COST_OVERRUN_RISK" && (p.resultJson as any)?.source === "AI_GEMINI");

      if (lastAiDelay && lastAiCost) {
        aiResult = {
          delayRisk: {
            level: (lastAiDelay.resultJson as any).level,
            reasoning: (lastAiDelay.resultJson as any).reasoning + " (Recuperado de BD)",
          },
          costOverrunRisk: {
            level: (lastAiCost.resultJson as any).level,
            reasoning: (lastAiCost.resultJson as any).reasoning + " (Recuperado de BD)",
          },
          confidence: lastAiDelay.confidence ?? 0.95,
          source: "AI_GEMINI",
        };
      } else {
        aiResult = {
          delayRisk: { 
            level: "MEDIUM", 
            reasoning: "Servicio de IA de Gemini no disponible temporalmente por alta demanda en Google." 
          },
          costOverrunRisk: { 
            level: "MEDIUM", 
            reasoning: "Servicio de IA de Gemini no disponible temporalmente por alta demanda en Google." 
          },
          confidence: 0,
          source: "AI_GEMINI",
        };
      }
    }

    return { ruleBased: ruleBasedResult, ai: aiResult };
  },
};