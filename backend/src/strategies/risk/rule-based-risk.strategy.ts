import { RiskStrategy, ProjectRiskContext, ProjectRiskAssessment, RiskLevel } from "./risk-strategy.interface";
import { settingsService } from "../../services/settings.service";

const round1 = (n: number) => Math.round(n * 10) / 10;

export class RuleBasedRiskStrategy implements RiskStrategy {
  readonly name = "RULE_BASED";

  async analyze(context: ProjectRiskContext): Promise<ProjectRiskAssessment> {
    // Thresholds are system settings (defaults: config/risk-thresholds.ts)
    const settings = await settingsService.get();
    const delay = context.project.expectedProgress - context.project.progressPercentage;
    const delayLevel = this.classify(delay, settings.scheduleDelayThreshold);

    const gap = context.financial.financialVsPhysicalGap;
    const costLevel = this.classify(gap, settings.financialGapThreshold);

    return {
      delayRisk: {
        level: delayLevel,
        reasoning: `Avance físico ${context.project.progressPercentage.toFixed(1)}% vs esperado ${context.project.expectedProgress.toFixed(1)}% (desviación de ${delay.toFixed(1)} puntos).`,
        params: {
          progress: round1(context.project.progressPercentage),
          expected: round1(context.project.expectedProgress),
          delay: round1(delay),
        },
      },
      costOverrunRisk: {
        level: costLevel,
        reasoning: `Brecha entre gasto ejecutado (${context.financial.executedPercentage.toFixed(1)}%) y avance físico de ${gap.toFixed(1)} puntos.`,
        params: {
          executed: round1(context.financial.executedPercentage),
          progress: round1(context.project.progressPercentage),
          gap: round1(gap),
        },
      },
      confidence: 1, // determinista: la regla siempre da el mismo resultado para los mismos datos
      source: this.name,
    };
  }

  /** Above the threshold is MEDIUM, above twice the threshold is HIGH. */
  private classify(value: number, threshold: number): RiskLevel {
    if (value > threshold * 2) return "HIGH";
    if (value > threshold) return "MEDIUM";
    return "LOW";
  }
}