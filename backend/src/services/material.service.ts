import { materialRepository } from "../repositories/material.repository";
import { inventoryMovementRepository } from "../repositories/inventory-movement.repository";
import { CreateMaterialInput, CreateMovementInput, ListMaterialsQuery } from "../schemas/material.schema";
import { AppError } from "../utils/app-error";
import { Material } from "@prisma/client";

export const materialService = {
  async list(query: ListMaterialsQuery) {
    const skip = (query.page - 1) * query.limit;
    const [materials, total] = await materialRepository.findMany(skip, query.limit);

    return {
      data: materials,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  },

  async create(data: CreateMaterialInput) {
    return materialRepository.create(data);
  },

  async registerMovement(data: CreateMovementInput) {
    const material = await materialRepository.findById(data.materialId);
    if (!material) throw new AppError(404, "Material not found");

    if (data.type === "OUT" && material.stockAvailable < data.quantity) {
      throw new AppError(400, "Insufficient stock for this movement");
    }

    const delta = data.type === "IN" ? data.quantity : -data.quantity;

    const [movement, updatedMaterial] = await Promise.all([
      inventoryMovementRepository.create(data),
      materialRepository.adjustStock(data.materialId, delta),
    ]);

    return { movement, material: updatedMaterial };
  },

  /**
   * Calcula qué materiales están por debajo de su stock mínimo.
   *
   * Usamos un Map<materialId, Material> en vez de recorrer el array con
   * .find() en cada iteración: con N materiales, un enfoque ingenuo de
   * "buscar el material por id dentro de un loop" sería O(n^2). Aquí,
   * construir el Map es O(n) una sola vez, y cada lookup posterior es O(1).
   * Esto se vuelve relevante cuando este mismo patrón se reutiliza en el
   * Paso 16 (alertas generales) cruzando materiales con múltiples obras.
   */
  async getLowStockMaterials(): Promise<Material[]> {
    const materials = await materialRepository.findAllRaw();

    const materialsById = new Map<string, Material>();
    for (const material of materials) {
      materialsById.set(material.id, material);
    }

    const lowStock: Material[] = [];
    for (const material of materialsById.values()) {
      if (material.stockAvailable < material.stockMinimum) {
        lowStock.push(material);
      }
    }

    return lowStock;
  },
};