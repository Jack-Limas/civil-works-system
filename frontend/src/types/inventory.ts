import type { ExpenseCategory, ExpenseStatus, Money } from "./finance";
import type { Role } from "./auth";

export const MATERIAL_CATEGORIES = [
  "CEMENT_CONCRETE",
  "STEEL",
  "AGGREGATES",
  "MASONRY",
  "WOOD",
  "ELECTRICAL",
  "PLUMBING",
  "FINISHES",
  "TOOLS_EQUIPMENT",
  "OTHER",
] as const;
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const MATERIAL_STATUSES = ["OUT", "CRITICAL", "WARNING", "OK"] as const;
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];

export type MovementType = "IN" | "OUT";

/** Material with the backend's rule-based analysis. Cost fields are absent for residents. */
export interface InventoryMaterial {
  id: string;
  name: string;
  unit: string;
  category: MaterialCategory | null;
  stockAvailable: number;
  stockMinimum: number;
  status: MaterialStatus;
  dailyConsumption: number;
  coverageDays: number | null;
  estimatedNeed: number;
  suggestedPurchase: number;
  lastMovement: { type: MovementType; date: string; quantity: number } | null;
  lastUnitCost?: number | null;
  estimatedValue?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventorySummary {
  totalMaterials: number;
  out: number;
  critical: number;
  warning: number;
  ok: number;
  movementsThisMonth: number;
  /** Admin only */
  estimatedValue?: number;
  valuedMaterials?: number;
  criticalMaterials: InventoryMaterial[];
}

export interface InventoryMovement {
  id: string;
  materialId: string;
  projectId: string | null;
  type: MovementType;
  quantity: number;
  date: string;
  notes: string | null;
  unitCost: number | null;
  warning: boolean;
  createdAt: string;
  material: { id: string; name: string; unit: string };
  project: { id: string; name: string } | null;
  registeredBy: { id: string; name: string; role: Role } | null;
  supplier: { id: string; name: string } | null;
  expense: {
    id: string;
    status: ExpenseStatus;
    description: string | null;
    category: ExpenseCategory;
    amount?: Money;
  } | null;
}

export interface MaterialDetail {
  material: InventoryMaterial;
  days: 30 | 90;
  series: Array<{ date: string; stock: number; in: number; out: number }>;
  consumptionByProject: Array<{ projectId: string; name: string; quantity: number }>;
  unassignedConsumption?: number;
  movements: InventoryMovement[];
}

export interface MaterialFilters {
  search?: string;
  category?: MaterialCategory | "NONE";
  status?: MaterialStatus;
  sort?: "name" | "coverage" | "stock" | "status";
  page?: number;
  limit?: number;
}

export interface MovementFilters {
  materialId?: string;
  projectId?: string;
  type?: MovementType;
  registeredById?: string;
  from?: string;
  to?: string;
  warnings?: "true";
  page?: number;
  limit?: number;
}

export interface CreateMovementInput {
  materialId: string;
  type: MovementType;
  quantity: number;
  projectId?: string;
  expenseId?: string;
  supplierId?: string;
  unitCost?: number;
  notes?: string;
}

export interface MovementResult {
  movement: InventoryMovement;
  material: InventoryMaterial;
  belowMinimum: boolean;
}

export interface CreateMaterialInput {
  name: string;
  unit: string;
  stockMinimum?: number;
  category?: MaterialCategory;
}

export interface UpdateMaterialInput {
  name?: string;
  unit?: string;
  stockMinimum?: number;
  category?: MaterialCategory | null;
}
