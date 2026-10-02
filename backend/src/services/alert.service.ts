import { alertRepository } from "../repositories/alert.repository";
import { projectRepository } from "../repositories/project.repository";
import { expenseService } from "./expense.service";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/app-error";
import { Project } from "@prisma/client";
import { RISK_THRESHOLDS } from "../config/risk-thresholds";

function calculateExpectedProgress(project: Project): number {
  const now = Date.now();
  const start = project.startDate.getTime();
  const end = project.estimatedEndDate.getTime();

  if (now <= start) return 0;
  if (now >= end) return 100;

  const elapsedRatio = (now - start) / (end - start);
  return Math.min(100, Math.max(0, elapsedRatio * 100));
}

async function evaluateScheduleRisk(project: Project) {
  const expectedProgress = calculateExpectedProgress(project);
  const delay = expectedProgress - project.progressPercentage;

  if (delay > RISK_THRESHOLDS.SCHEDULE_DELAY) {
    return {
      shouldAlert: true,
      message: `El avance físico (${project.progressPercentage.toFixed(1)}%) está ${delay.toFixed(1)} puntos por debajo del avance esperado según el cronograma (${expectedProgress.toFixed(1)}%).`,
      severity: delay > RISK_THRESHOLDS.SCHEDULE_DELAY * 2 ? ("HIGH" as const) : ("MEDIUM" as const),
    };
  }
  return { shouldAlert: false };
}

async function evaluateFinancialRisk(project: Project) {
  const indicators = await expenseService.getBudgetIndicators(project.id);

  if (indicators.financialVsPhysicalGap > RISK_THRESHOLDS.FINANCIAL_GAP) {
    return {
      shouldAlert: true,
      message: `Los gastos ejecutados (${indicators.executedPercentage.toFixed(1)}%) crecen más rápido que el avance físico (${project.progressPercentage.toFixed(1)}%), con una brecha de ${indicators.financialVsPhysicalGap.toFixed(1)} puntos.`,
      severity: indicators.financialVsPhysicalGap > RISK_THRESHOLDS.FINANCIAL_GAP * 2 ? ("HIGH" as const) : ("MEDIUM" as const),
    };
  }
  return { shouldAlert: false };
}

async function evaluateActivityRisk(project: Project) {
  const openDelayIncidents = await prisma.incident.count({
    where: { projectId: project.id, type: "ACTIVITY_DELAY", status: { in: ["OPEN", "IN_REVIEW"] } },
  });

  if (openDelayIncidents > 0) {
    return {
      shouldAlert: true,
      message: `La obra tiene ${openDelayIncidents} novedad(es) de tipo retraso de actividad sin resolver.`,
      severity: openDelayIncidents >= 3 ? ("HIGH" as const) : ("MEDIUM" as const),
    };
  }
  return { shouldAlert: false };
}

const RULES: Array<{
  type: "SCHEDULE" | "FINANCIAL" | "ACTIVITY";
  evaluate: (project: Project) => Promise<{ shouldAlert: boolean; message?: string; severity?: "LOW" | "MEDIUM" | "HIGH" }>;
}> = [
  { type: "SCHEDULE", evaluate: evaluateScheduleRisk },
  { type: "FINANCIAL", evaluate: evaluateFinancialRisk },
  { type: "ACTIVITY", evaluate: evaluateActivityRisk },
];

export const alertService = {
  async list(filters: { projectId?: string; status?: "ACTIVE" | "RESOLVED"; page: number; limit: number }) {
    const skip = (filters.page - 1) * filters.limit;
    const [alerts, total] = await alertRepository.findMany({
      projectId: filters.projectId,
      status: filters.status,
      skip,
      take: filters.limit,
    });

    return {
      data: alerts,
      pagination: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) },
    };
  },

  /**
   * Corre las 3 reglas de negocio sobre una obra y crea alertas nuevas
   * solo si no existe ya una alerta ACTIVA del mismo tipo (evita duplicados).
   */
  async generateForProject(projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new AppError(404, "Project not found");

    const createdAlerts = [];

    for (const rule of RULES) {
      const result = await rule.evaluate(project);
      if (!result.shouldAlert) continue;

      const existing = await alertRepository.findActiveByProjectAndType(projectId, rule.type);
      if (existing) continue; // ya existe una alerta activa de este tipo, no duplicamos

      const alert = await alertRepository.create({
        projectId,
        type: rule.type,
        message: result.message!,
        severity: result.severity!,
      });
      createdAlerts.push(alert);
    }

    return createdAlerts;
  },

  /**
   * Analiza TODAS las obras. Esta es la operación "pesada" que en el
   * Paso 19 vamos a comparar ejecutándola en el hilo principal vs en
   * un Worker Thread de Node, tal como pide la sección 13 del documento.
   */
  async generateForAllProjects() {
    const projects = await prisma.project.findMany({
      where: { status: { in: ["PLANNED", "IN_PROGRESS"] } },
    });

    const results = [];
    for (const project of projects) {
      const created = await alertService.generateForProject(project.id);
      if (created.length > 0) {
        results.push({ projectId: project.id, projectName: project.name, alertsCreated: created.length });
      }
    }

    return { projectsAnalyzed: projects.length, projectsWithNewAlerts: results.length, details: results };
  },

  async resolve(id: string) {
    return alertRepository.resolve(id);
  },
};