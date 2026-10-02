import { riskContextService } from "./risk-context.service";
import { predictionRepository } from "../repositories/prediction.repository";
import { RuleBasedRiskStrategy } from "../strategies/risk/rule-based-risk.strategy";
import { AIRiskStrategy } from "../strategies/risk/ai-risk.strategy";
import { RiskStrategy } from "../strategies/risk/risk-strategy.interface";

export type StrategyName = "RULE_BASED" | "AI_GEMINI";

const strategies: Record<StrategyName, RiskStrategy> = {
  RULE_BASED: new RuleBasedRiskStrategy(),
  AI_GEMINI: new AIRiskStrategy(),
};

export const predictionService = {
  async generate(projectId: string, strategyName: StrategyName) {
    const strategy = strategies[strategyName];
    const context = await riskContextService.build(projectId);
    const assessment = await strategy.analyze(context);

    // Guardamos dos registros de Prediction (uno por tipo), reutilizando
    // los enums ya definidos en el schema sin necesidad de migrarlo.
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
   * Compara ambas estrategias lado a lado sobre la misma obra — útil para
   * la sustentación: mostrar que el Strategy Pattern permite ejecutar
   * reglas fijas y IA con el mismo contrato, sin tocar el resto del sistema.
   */
  async compareStrategies(projectId: string) {
    const context = await riskContextService.build(projectId);
    const [ruleBased, ai] = await Promise.all([
      strategies.RULE_BASED.analyze(context),
      strategies.AI_GEMINI.analyze(context),
    ]);

    return { ruleBased, ai };
  },
};