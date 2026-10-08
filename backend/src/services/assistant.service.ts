import { geminiClient, GEMINI_MODEL } from "../config/gemini";
import { prisma } from "../config/prisma";
import { materialService } from "./material.service";
import { AppError } from "../utils/app-error";
import { RequestUser } from "../types/auth";
import { projectAccess } from "./project-access.service";

const SYSTEM_INSTRUCTION = `Eres el asistente de ObraIQ, una plataforma para gestionar obras de
construcción de cualquier tipo (edificaciones residenciales y comerciales,
vías, puentes, colegios, centros de salud, bodegas, remodelaciones, obras
deportivas, piscinas y muros de contención) en Nariño, Colombia.
Respondes preguntas del administrador o ingeniero residente basándote
EXCLUSIVAMENTE en los datos JSON que se te proporcionan a continuación.
Los montos están en pesos colombianos (COP). Si la pregunta no se puede
responder con esos datos, dilo claramente en vez de inventar información.
Responde en el mismo idioma de la pregunta (español o inglés), de forma breve,
clara y profesional, como lo haría un analista de obra experimentado.`;

/** Context sent to Gemini: a resident only ever sees data from their own projects. */
async function buildSystemContext(requester: RequestUser) {
  const responsibleId = projectAccess.scope(requester);

  const [projects, lowStockMaterials, activeAlerts] = await Promise.all([
    prisma.project.findMany({
      where: { ...(responsibleId && { responsibleId }) },
      select: {
        id: true,
        name: true,
        municipality: true,
        status: true,
        progressPercentage: true,
        budget: true,
        type: true,
      },
      take: 50,
    }),
    materialService.getLowStockMaterials(),
    prisma.alert.findMany({
      where: { status: "ACTIVE", ...(responsibleId && { project: { responsibleId } }) },
      select: {
        type: true,
        message: true,
        severity: true,
        project: { select: { name: true } },
      },
    }),
  ]);

  // Executed spend per project: APPROVED expenses only (PENDING ones are reported apart)
  const projectIds = projects.map((p) => p.id);
  const [approved, pending] = await Promise.all([
    prisma.expense.groupBy({
      by: ["projectId"],
      where: { projectId: { in: projectIds }, status: "APPROVED" },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["projectId"],
      where: { projectId: { in: projectIds }, status: "PENDING" },
      _sum: { amount: true },
      _count: true,
    }),
  ]);
  const approvedByProject = new Map(approved.map((r) => [r.projectId, Number(r._sum.amount ?? 0)]));
  const pendingByProject = new Map(pending.map((r) => [r.projectId, r]));

  const projectsWithCosts = projects.map((p) => {
    const pend = pendingByProject.get(p.id);
    return {
      ...p,
      budget: Number(p.budget),
      approvedExpensesCOP: approvedByProject.get(p.id) ?? 0,
      pendingApprovalExpensesCOP: Number(pend?._sum.amount ?? 0),
      pendingApprovalCount: pend?._count ?? 0,
    };
  });

  return { projects: projectsWithCosts, lowStockMaterials, activeAlerts };
}

export const assistantService = {
  async ask(question: string, requester: RequestUser) {
    const context = await buildSystemContext(requester);
    const prompt = `Datos del sistema:\n${JSON.stringify(
      context,
      null,
      2
    )}\n\nPregunta: ${question}`;

    try {
      const response = await geminiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { systemInstruction: SYSTEM_INSTRUCTION },
      });
      return (
        response.text ??
        "No obtuve una respuesta del asistente, intenta de nuevo."
      );
    } catch {
      throw new AppError(
        502,
        "El asistente de IA no está disponible en este momento."
      );
    }
  },
};