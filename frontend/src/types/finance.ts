import { Role } from "./auth";

export const EXPENSE_CATEGORIES = ["MATERIALS", "LABOR", "EQUIPMENT", "TRANSPORT", "FUEL", "OTHER"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PAYMENT_METHODS = ["CASH", "TRANSFER", "CARD", "CHECK", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const EXPENSE_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

/** Prisma Decimal values arrive serialized as strings. */
export type Money = number | string;

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface Supplier {
  id: string;
  name: string;
  nit: string | null;
  category: ExpenseCategory | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
}

export interface SupplierStatsRow {
  supplierId: string;
  name: string;
  nit: string | null;
  category: ExpenseCategory | null;
  totalPurchased: number;
  transactions: number;
  lastPurchase: string | null;
}

export interface SupplierStats {
  suppliers: SupplierStatsRow[];
  top: SupplierStatsRow[];
}

export interface ExpenseRecord {
  id: string;
  projectId: string;
  category: ExpenseCategory;
  amount: Money;
  date: string;
  description: string | null;
  supplierId: string | null;
  paymentMethod: PaymentMethod | null;
  invoiceNumber: string | null;
  supportUrl: string | null;
  registeredById: string | null;
  status: ExpenseStatus;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  project: { id: string; name: string };
  supplier: { id: string; name: string; nit: string | null } | null;
  /** null for expenses created before the finance module (company payments). */
  registeredBy: { id: string; name: string; role: Role } | null;
  reviewedBy: { id: string; name: string } | null;
}

export interface ExpenseFilters {
  projectId?: string;
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  supplierId?: string;
  registeredById?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface FundTransfer {
  id: string;
  residentId: string;
  projectId: string | null;
  amount: Money;
  date: string;
  method: PaymentMethod | null;
  notes: string | null;
  resident: { id: string; name: string };
  project: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
}

export interface CreateFundTransferInput {
  residentId: string;
  projectId?: string;
  amount: number;
  date?: string;
  method?: PaymentMethod;
  notes?: string;
}

export interface ResidentBalance {
  residentId: string;
  name: string;
  email: string;
  transfersReceived: number;
  transfersCount: number;
  lastTransferAt: string | null;
  approvedExpenses: number;
  pendingExpenses: number;
  balance: number;
  usedPercentage: number | null;
}

export interface CashBalances {
  residents: ResidentBalance[];
  totals: { transfersReceived: number; spent: number; cashBalance: number; toReimburse: number };
}

export interface ProjectFinance {
  projectId: string;
  name: string;
  status: "PLANNED" | "IN_PROGRESS" | "SUSPENDED" | "FINISHED";
  budget: number;
  approvedSpent: number;
  physicalProgress: number;
  financialProgress: number;
  cpi: number | null;
}

export interface FinancialAlert {
  id: string;
  projectId: string;
  type: "FINANCIAL";
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  params: Record<string, number> | null;
  createdAt: string;
  project: { id: string; name: string };
}

export interface FinanceSummary {
  totalBudget: number;
  approvedSpent: number;
  available: number;
  pendingApproval: { amount: number; count: number };
  cpi: number | null;
  activeSuppliers: number;
  nextMilestone: { projectId: string; name: string; date: string; days: number } | null;
  projects: ProjectFinance[];
  recentExpenses: ExpenseRecord[];
  financialAlerts: FinancialAlert[];
}

export interface CashflowMonth {
  month: string;
  transfers: number;
  expenses: number;
  byCategory: Record<ExpenseCategory, number>;
}

export interface LedgerEntry {
  kind: "EXPENSE" | "TRANSFER";
  id: string;
  date: string;
  amount: number;
  description: string | null;
  category: ExpenseCategory | null;
  project: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
  person: { id: string; name: string } | null;
  method: PaymentMethod | null;
  supportUrl: string | null;
}

export interface Cashflow {
  from: string;
  series: CashflowMonth[];
  totals: { transfers: number; approvedExpenses: number; toBeAccounted: number };
  ledger: Paginated<LedgerEntry>;
}
