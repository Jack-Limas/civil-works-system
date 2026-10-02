import { RiskStrategy, ProjectRiskContext, ProjectRiskAssessment, RiskLevel } from "./risk-strategy.interface";
import { RISK_THRESHOLDS } from "../../config/risk-thresholds";

export class RuleBasedRiskStrategy implements RiskStrategy {
  readonly name = "RULE_BASED";

  async analyze(context: ProjectRiskContext): Promise<ProjectRiskAssessment> {
    const delay = context.project.expectedProgress - context.project.progressPercentage;
    const delayLevel = this.classifyDelay(delay);

    const gap = context.financial.financialVsPhysicalGap;
    const costLevel = this.classifyCostOverrun(gap);

    return {
      delayRisk: {
        level: delayLevel,
        reasoning: `Avance físico ${context.project.progressPercentage.toFixed(1)}% vs esperado ${context.project.expectedProgress.toFixed(1)}% (desviación de ${delay.toFixed(1)} puntos).`,
      },
      costOverrunRisk: {
        level: costLevel,
        reasoning: `Brecha entre gasto ejecutado (${context.financial.executedPercentage.toFixed(1)}%) y avance físico de ${gap.toFixed(1)} puntos.`,
      },
      confidence: 1, // determinista: la regla siempre da el mismo resultado para los mismos datos
      source: this.name,
    };
  }

  private classifyDelay(delay: number): RiskLevel {
    if (delay > RISK_THRESHOLDS.SCHEDULE_DELAY * 2) return "HIGH";
    if (delay > RISK_THRESHOLDS.SCHEDULE_DELAY) return "MEDIUM";
    return "LOW";
  }

  private classifyCostOverrun(gap: number): RiskLevel {
    if (gap > RISK_THRESHOLDS.FINANCIAL_GAP * 2) return "HIGH";
    if (gap > RISK_THRESHOLDS.FINANCIAL_GAP) return "MEDIUM";
    return "LOW";
  }
}