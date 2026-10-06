import { geminiClient, GEMINI_MODEL } from "../config/gemini";
import { prisma } from "../config/prisma";
import { materialService } from "./material.service";
import { AppError } from "../utils/app-error";

const SYSTEM_INSTRUCTION = `Eres el asistente del Sistema de Gestión de Obras Civiles (Obrix).
Respondes preguntas del administrador o ingeniero residente basándote
EXCLUSIVAMENTE en los datos JSON que se te proporcionan a continuación.
Si la pregunta no se puede responder con esos datos, dilo claramente
en vez de inventar información. Responde en español, de forma breve,
clara y profesional, como lo haría un analista de obra experimentado.`;

async function buildSystemContext() {
  const [projects, lowStockMaterials, activeAlerts] = await Promise.all([
    prisma.project.findMany({
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
      where: { status: "ACTIVE" },
      select: {
        type: true,
        message: true,
        severity: true,
        project: { select: { name: true } },
      },
    }),
  ]);

  return { projects, lowStockMaterials, activeAlerts };
}

export const assistantService = {
  async ask(question: string) {
    const context = await buildSystemContext();
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