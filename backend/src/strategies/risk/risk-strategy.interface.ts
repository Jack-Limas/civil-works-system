export interface ProjectRiskContext {
  project: {
    id: string;
    name: string;
    budget: number;
    progressPercentage: number;
    expectedProgress: number;
    startDate: Date;
    estimatedEndDate: Date;
  };
  financial: {
    executedExpenses: number;
    executedPercentage: number;
    availableBudget: number;
    financialVsPhysicalGap: number;
  };
  openIncidents: Array<{ type: string; priority: string }>;
  lowStockMaterialsCount: number;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface RiskLevelResult {
  level: RiskLevel;
  reasoning: string;
  /**
   * Numbers behind a deterministic reasoning, so clients can render it in any
   * language. Only the rule-based strategy fills it.
   */
  params?: Record<string, number>;
}

export interface ProjectRiskAssessment {
  delayRisk: RiskLevelResult;
  costOverrunRisk: RiskLevelResult;
  confidence: number; // 0 a 1
  source: string; // nombre de la estrategia que generó el resultado
}

/**
 * Strategy Pattern: cualquier forma de analizar el riesgo de una obra
 * (basada en reglas fijas, basada en IA, o una futura estrategia estadística)
 * debe cumplir este mismo contrato para ser intercambiable sin tocar el
 * resto del sistema.
 */
export interface RiskStrategy {
  readonly name: string;
  analyze(context: ProjectRiskContext): Promise<ProjectRiskAssessment>;
}