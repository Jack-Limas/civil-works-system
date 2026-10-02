import { prisma } from "../config/prisma";
import { PredictionType } from "@prisma/client";

export const predictionRepository = {
  create(data: { projectId: string; type: PredictionType; resultJson: object; confidence: number }) {
    return prisma.prediction.create({ data });
  },

  findByProject(projectId: string, take = 20) {
    return prisma.prediction.findMany({
      where: { projectId },
      orderBy: { generatedAt: "desc" },
      take,
    });
  },
};