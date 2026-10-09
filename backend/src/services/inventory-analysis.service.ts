import { Material, MaterialCategory, MovementType } from "@prisma/client";
import { materialRepository } from "../repositories/material.repository";
import { inventoryMovementRepository } from "../repositories/inventory-movement.repository";
import { settingsService } from "./settings.service";
import { MaterialStatus } from "../schemas/material.schema";
import { daysAgo } from "../utils/business-time";

/** Thresholds come from system settings (defaults: config/inventory-thresholds.ts). */
export interface InventoryThresholds {
  consumptionWindowDays: number;
  criticalCoverageDays: number;
  warningCoverageDays: number;
  planningHorizonDays: number;
}

/** Material plus the rule-based analysis every screen and report shares. */
export interface AnalyzedMaterial {
  id: string;
  name: string;
  unit: string;
  category: MaterialCategory | null;
  stockAvailable: number;
  stockMinimum: number;
  createdAt: Date;
  updatedAt: Date;
  status: MaterialStatus;
  /** Average daily OUT quantity over the consumption window */
  dailyConsumption: number;
  /** Days the current stock lasts at that pace; null when there is no consumption (never Infinity) */
  coverageDays: number | null;
  /** max(0, daily consumption x horizon - stock) */
  estimatedNeed: number;
  /** Quantity to buy to cover both the minimum and the planning horizon */
  suggestedPurchase: number;
  lastMovement: { type: MovementType; date: Date; quantity: number } | null;
  /** Latest known unit cost (admin only; stripped for residents) */
  lastUnitCost: number | null;
  /** stock x last unit cost; null when the material has no known cost */
  estimatedValue: number | null;
}

const round = (n: number, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;

export function classify(stock: number, minimum: number, coverageDays: number | null, t: InventoryThresholds): MaterialStatus {
  if (stock <= 0) return "OUT";
  if (stock < minimum || (coverageDays !== null && coverageDays < t.criticalCoverageDays)) return "CRITICAL";
  if (coverageDays !== null && coverageDays < t.warningCoverageDays) return "WARNING";
  return "OK";
}

/** Severity order used to sort critical lists (most urgent first). */
export const STATUS_RANK: Record<MaterialStatus, number> = { OUT: 0, CRITICAL: 1, WARNING: 2, OK: 3 };

function analyzeOne(
  material: Material,
  consumed: number,
  last: AnalyzedMaterial["lastMovement"],
  lastUnitCost: number | null,
  t: InventoryThresholds
): AnalyzedMaterial {
  const dailyConsumption = consumed / t.consumptionWindowDays;
  const stock = material.stockAvailable;
  const coverageDays = dailyConsumption > 0 ? round(stock / dailyConsumption, 1) : null;
  const horizonNeed = dailyConsumption * t.planningHorizonDays;

  return {
    id: material.id,
    name: material.name,
    unit: material.unit,
    category: material.category,
    stockAvailable: stock,
    stockMinimum: material.stockMinimum,
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
    status: classify(stock, material.stockMinimum, coverageDays, t),
    dailyConsumption: round(dailyConsumption, 3),
    coverageDays,
    estimatedNeed: round(Math.max(0, horizonNeed - stock)),
    suggestedPurchase: Math.ceil(Math.max(0, Math.max(material.stockMinimum, horizonNeed) - stock)),
    lastMovement: last,
    lastUnitCost,
    estimatedValue: lastUnitCost !== null ? round(stock * lastUnitCost, 0) : null,
  };
}

export const inventoryAnalysis = {
  /**
   * Analyzes every material with four queries in total, regardless of the
   * number of materials (no N+1):
   *   materials, OUT movements of the window, last movement per material and
   *   last unit cost per material.
   * Consumption is aggregated with a Map<materialId, quantity> in ONE pass over
   * the movement rows (O(m)); each material then looks its total up in O(1)
   * instead of filtering the movement array per material (O(n x m)).
   */
  async analyzeAll(): Promise<AnalyzedMaterial[]> {
    const t = await settingsService.get();
    const since = daysAgo(t.consumptionWindowDays);
    const [materials, outRows, lastRows, costRows] = await Promise.all([
      materialRepository.findAll(),
      inventoryMovementRepository.consumptionSince(since),
      inventoryMovementRepository.lastPerMaterial(),
      inventoryMovementRepository.lastCostPerMaterial(),
    ]);

    const consumedByMaterial = new Map<string, number>();
    for (const row of outRows) {
      consumedByMaterial.set(row.materialId, (consumedByMaterial.get(row.materialId) ?? 0) + row.quantity);
    }
    const lastByMaterial = new Map(lastRows.map((r) => [r.materialId, { type: r.type, date: r.date, quantity: r.quantity }]));
    const costByMaterial = new Map(costRows.map((r) => [r.materialId, Number(r.unitCost)]));

    return materials.map((m) =>
      analyzeOne(m, consumedByMaterial.get(m.id) ?? 0, lastByMaterial.get(m.id) ?? null, costByMaterial.get(m.id) ?? null, t)
    );
  },

  async analyzeOneById(id: string): Promise<AnalyzedMaterial | null> {
    const all = await inventoryAnalysis.analyzeAll();
    return all.find((m) => m.id === id) ?? null;
  },

  /** OUT and CRITICAL materials, most urgent first (lowest coverage). */
  critical(materials: AnalyzedMaterial[]) {
    return materials
      .filter((m) => m.status === "OUT" || m.status === "CRITICAL")
      .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || (a.coverageDays ?? -1) - (b.coverageDays ?? -1));
  },

  /** Residents never see costs or inventory value. */
  stripCosts<T extends AnalyzedMaterial>(material: T): Omit<T, "lastUnitCost" | "estimatedValue"> {
    const rest: Omit<T, "lastUnitCost" | "estimatedValue"> & Partial<AnalyzedMaterial> = { ...material };
    delete rest.lastUnitCost;
    delete rest.estimatedValue;
    return rest;
  },
};
