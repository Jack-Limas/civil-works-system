import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import { materialRepository } from "../repositories/material.repository";
import { inventoryMovementRepository } from "../repositories/inventory-movement.repository";
import { expenseRepository } from "../repositories/expense.repository";
import { supplierRepository } from "../repositories/supplier.repository";
import { projectRepository } from "../repositories/project.repository";
import {
  CreateMaterialInput,
  CreateMovementInput,
  ListMaterialsQuery,
  ListMovementsQuery,
  UpdateMaterialInput,
} from "../schemas/material.schema";
import { AppError } from "../utils/app-error";
import { RequestUser } from "../types/auth";
import { projectAccess } from "./project-access.service";
import { AnalyzedMaterial, inventoryAnalysis, STATUS_RANK } from "./inventory-analysis.service";
import { businessDateKey, businessMonthStart, daysAgo } from "../utils/business-time";
import { audit, AUDIT_ACTIONS } from "./audit.service";

const DAY_MS = 86_400_000;

type Movement = Awaited<ReturnType<typeof inventoryMovementRepository.findMany>>[0][number];

/** Ledger row as sent to clients: rejected-expense warning flag, costs hidden for residents. */
function presentMovement(m: Movement, requester: RequestUser) {
  const warning = m.expense?.status === "REJECTED";
  const base = { ...m, unitCost: m.unitCost === null ? null : Number(m.unitCost), warning };
  if (projectAccess.isAdmin(requester)) return base;
  return {
    ...base,
    unitCost: null,
    expense: m.expense ? { id: m.expense.id, status: m.expense.status, description: m.expense.description, category: m.expense.category } : null,
  };
}

function presentMaterial(m: AnalyzedMaterial, requester: RequestUser) {
  return projectAccess.isAdmin(requester) ? m : inventoryAnalysis.stripCosts(m);
}

export const materialService = {
  /** Search, filter by category/status, sort and paginate the analyzed catalog. */
  async list(query: ListMaterialsQuery, requester: RequestUser) {
    const all = await inventoryAnalysis.analyzeAll();
    const search = query.search?.toLowerCase();

    const filtered = all.filter(
      (m) =>
        (!search || m.name.toLowerCase().includes(search)) &&
        (!query.category || (query.category === "NONE" ? m.category === null : m.category === query.category)) &&
        (!query.status || m.status === query.status)
    );

    const sorters: Record<ListMaterialsQuery["sort"], (a: AnalyzedMaterial, b: AnalyzedMaterial) => number> = {
      name: (a, b) => a.name.localeCompare(b.name, "es"),
      stock: (a, b) => a.stockAvailable - b.stockAvailable,
      status: (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.name.localeCompare(b.name, "es"),
      // No consumption (null) sorts last: those materials are not running out
      coverage: (a, b) => (a.coverageDays ?? Number.MAX_VALUE) - (b.coverageDays ?? Number.MAX_VALUE),
    };
    filtered.sort(sorters[query.sort]);

    const start = (query.page - 1) * query.limit;
    return {
      data: filtered.slice(start, start + query.limit).map((m) => presentMaterial(m, requester)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / query.limit),
      },
    };
  },

  /** KPIs for the inventory screen. Inventory value is admin-only. */
  async summary(requester: RequestUser) {
    const [all, movementsThisMonth] = await Promise.all([
      inventoryAnalysis.analyzeAll(),
      inventoryMovementRepository.countSince(businessMonthStart()),
    ]);

    const counts = { OUT: 0, CRITICAL: 0, WARNING: 0, OK: 0 };
    let estimatedValue = 0;
    let valuedMaterials = 0;
    for (const m of all) {
      counts[m.status]++;
      if (m.estimatedValue !== null) {
        estimatedValue += m.estimatedValue;
        valuedMaterials++;
      }
    }

    const critical = inventoryAnalysis.critical(all).map((m) => presentMaterial(m, requester));
    return {
      totalMaterials: all.length,
      out: counts.OUT,
      critical: counts.CRITICAL,
      warning: counts.WARNING,
      ok: counts.OK,
      movementsThisMonth,
      ...(projectAccess.isAdmin(requester) && { estimatedValue, valuedMaterials }),
      criticalMaterials: critical,
    };
  },

  /**
   * Material detail: analysis, daily stock evolution reconstructed backwards
   * from the current stock (every movement in the range is undone in reverse),
   * consumption per project and the latest movements.
   */
  async detail(id: string, days: number, requester: RequestUser) {
    const material = await inventoryAnalysis.analyzeOneById(id);
    if (!material) throw new AppError(404, "Material not found");

    const since = daysAgo(days);
    const [movements, outRows, latest] = await Promise.all([
      inventoryMovementRepository.forMaterialSince(id, since),
      inventoryMovementRepository.consumptionSince(since, id),
      inventoryMovementRepository.findMany(
        projectAccess.isAdmin(requester) ? { materialId: id } : { materialId: id, ...movementScope(requester) },
        0,
        30
      ),
    ]);

    // Net change per business day, then walk back from today's stock
    const netByDay = new Map<string, number>();
    for (const mv of movements) {
      const key = businessDateKey(mv.date);
      netByDay.set(key, (netByDay.get(key) ?? 0) + (mv.type === "IN" ? mv.quantity : -mv.quantity));
    }
    const series: Array<{ date: string; stock: number; in: number; out: number }> = [];
    let stock = material.stockAvailable;
    const today = Date.now();
    for (let i = 0; i <= days; i++) {
      const key = businessDateKey(new Date(today - i * DAY_MS));
      series.push({ date: key, stock: Math.round(stock * 100) / 100, in: 0, out: 0 });
      stock -= netByDay.get(key) ?? 0; // stock at the end of the previous day
    }
    series.reverse();
    const seriesByDay = new Map(series.map((p) => [p.date, p]));
    for (const mv of movements) {
      const point = seriesByDay.get(businessDateKey(mv.date));
      if (point) point[mv.type === "IN" ? "in" : "out"] += mv.quantity;
    }

    // Consumption per project in one pass (Map keyed by project id)
    const byProject = new Map<string, number>();
    let unassigned = 0;
    for (const row of outRows) {
      if (row.projectId) byProject.set(row.projectId, (byProject.get(row.projectId) ?? 0) + row.quantity);
      else unassigned += row.quantity;
    }
    const projects = await projectRepository.findNamesByIds([...byProject.keys()]);
    const scope = projectAccess.scope(requester);
    const consumptionByProject = projects
      // Residents see consumption of their own projects only
      .filter((p) => !scope || p.responsibleId === scope)
      .map((p) => ({ projectId: p.id, name: p.name, quantity: byProject.get(p.id) ?? 0 }))
      .sort((a, b) => b.quantity - a.quantity);

    return {
      material: presentMaterial(material, requester),
      days,
      series,
      consumptionByProject,
      unassignedConsumption: projectAccess.isAdmin(requester) ? unassigned : undefined,
      movements: latest[0].map((m) => presentMovement(m, requester)),
    };
  },

  /** Admin: full record. Resident: inline creation with name and unit only. */
  async create(data: CreateMaterialInput, requester: RequestUser) {
    if (await materialRepository.findByNameInsensitive(data.name)) {
      throw new AppError(409, "A material with this name already exists");
    }
    const isAdmin = projectAccess.isAdmin(requester);
    return materialRepository.create({
      name: data.name,
      unit: data.unit,
      stockMinimum: isAdmin ? data.stockMinimum : 0,
      ...(isAdmin && data.category && { category: data.category }),
    });
  },

  /** Admin-only edit of descriptive fields; stockAvailable is never editable. */
  async update(id: string, data: UpdateMaterialInput) {
    const existing = await materialRepository.findById(id);
    if (!existing) throw new AppError(404, "Material not found");
    if (data.name && data.name.toLowerCase() !== existing.name.toLowerCase()) {
      const taken = await materialRepository.findByNameInsensitive(data.name);
      if (taken) throw new AppError(409, "A material with this name already exists");
    }
    return materialRepository.update(id, data);
  },

  /**
   * Registers a movement following the inventory rules:
   * - ADMIN: IN or OUT, every optional field allowed.
   * - RESIDENT_ENGINEER: OUT only on projects they are responsible for
   *   (projectId required); IN only linked to their own non-rejected MATERIALS
   *   expense (expenseId required). Costs and suppliers come from that expense.
   * registeredById always comes from the session. The ledger is append-only.
   */
  async registerMovement(data: CreateMovementInput, requester: RequestUser) {
    const material = await materialRepository.findById(data.materialId);
    if (!material) throw new AppError(404, "Material not found");

    const isAdmin = projectAccess.isAdmin(requester);
    let projectId = data.projectId;
    let supplierId = isAdmin ? data.supplierId : undefined;
    let unitCost = isAdmin ? data.unitCost : undefined;
    let expenseId: string | undefined;

    if (!isAdmin && data.type === "OUT" && !projectId) {
      throw new AppError(400, "projectId is required to register consumption");
    }
    if (!isAdmin && data.type === "IN" && !data.expenseId) {
      throw new AppError(400, "Residents can only register entries linked to one of their material expenses");
    }

    if (data.expenseId && (isAdmin || data.type === "IN")) {
      const expense = await expenseRepository.findById(data.expenseId);
      if (!expense) throw new AppError(404, "Expense not found");
      if (expense.category !== "MATERIALS") throw new AppError(400, "Only MATERIALS expenses can be linked to inventory");
      if (expense.status === "REJECTED") throw new AppError(400, "A rejected expense cannot be linked to inventory");
      if (!isAdmin && expense.registeredById !== requester.sub) {
        throw new AppError(403, "You can only link expenses you registered");
      }
      expenseId = expense.id;
      projectId ??= expense.projectId;
      supplierId ??= expense.supplierId ?? undefined;
      if (unitCost === undefined && data.type === "IN") unitCost = Number(expense.amount) / data.quantity;
    }

    if (projectId) await projectAccess.assert(requester, projectId);
    if (supplierId && !(await supplierRepository.findById(supplierId))) throw new AppError(404, "Supplier not found");

    // Movement and its audit event commit together (no event for a rejected movement)
    const result = await prisma.$transaction(async (tx) => {
      const registered = await inventoryMovementRepository.registerAtomic(
        {
          materialId: data.materialId,
          type: data.type,
          quantity: data.quantity,
          projectId,
          expenseId,
          supplierId,
          unitCost: unitCost !== undefined ? Math.round(unitCost * 100) / 100 : undefined,
          date: data.date,
          notes: data.notes,
          registeredById: requester.sub,
        },
        tx
      );
      if (!registered) return null;
      await audit.record(
        tx,
        {
          action: AUDIT_ACTIONS.movementRegistered,
          entityType: "material",
          entityId: data.materialId,
          metadata: { materialName: material.name, type: data.type, quantity: data.quantity, unit: material.unit, projectId, expenseId },
        },
        audit.context(requester)
      );
      return registered;
    });
    if (!result) throw new AppError(400, "Insufficient stock for this movement");

    const analyzed = await inventoryAnalysis.analyzeOneById(result.material.id);
    return {
      movement: presentMovement(result.movement, requester),
      material: analyzed ? presentMaterial(analyzed, requester) : result.material,
      belowMinimum: result.material.stockAvailable < result.material.stockMinimum,
    };
  },

  /** Ledger with filters. Residents see movements of their projects or registered by them. */
  async listMovements(query: ListMovementsQuery, requester: RequestUser) {
    if (query.projectId) await projectAccess.assert(requester, query.projectId);

    const where: Prisma.InventoryMovementWhereInput = {
      ...(query.materialId && { materialId: query.materialId }),
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.type && { type: query.type }),
      ...(query.registeredById && { registeredById: query.registeredById }),
      ...((query.from || query.to) && {
        date: { ...(query.from && { gte: query.from }), ...(query.to && { lte: query.to }) },
      }),
      ...(query.warnings && { expense: { status: "REJECTED" } }),
      ...(!projectAccess.isAdmin(requester) && movementScope(requester)),
    };

    const skip = (query.page - 1) * query.limit;
    const [rows, total] = await inventoryMovementRepository.findMany(where, skip, query.limit);
    return {
      data: rows.map((m) => presentMovement(m, requester)),
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  },

  /**
   * GET /materials/low-stock (contract kept: Material-shaped rows). Backed by
   * the same status engine as every screen, so dashboard, assistant and risk
   * context agree: a material is "low" when it is OUT or CRITICAL.
   */
  async getLowStockMaterials() {
    const all = await inventoryAnalysis.analyzeAll();
    return inventoryAnalysis.critical(all).map((m) => inventoryAnalysis.stripCosts(m));
  },
};

function movementScope(requester: RequestUser): Prisma.InventoryMovementWhereInput {
  return { OR: [{ project: { responsibleId: requester.sub } }, { registeredById: requester.sub }] };
}
