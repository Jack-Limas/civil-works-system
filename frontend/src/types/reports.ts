import type { ExpenseCategory, ExpenseStatus } from "./finance";
import type { MaterialCategory, MaterialStatus, MovementType } from "./inventory";
import type { IncidentPriority, IncidentStatus, IncidentType } from "@/lib/incidents-service";
import type { ProjectStatus, ProjectType } from "@/lib/projects-service";

export const REPORT_TYPES = ["progress", "financial", "materials", "incidents"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export interface ReportMeta {
  generatedAt: string;
  generatedBy: { id: string; name: string };
  durationMs: number;
  recordCount: number;
}

export interface ReportParams {
  projectId?: string;
  from?: string;
  to?: string;
}

interface ReportBase {
  period: { from: string; to: string };
  meta: ReportMeta;
}

export interface ProgressReport extends ReportBase {
  type: "progress";
  kpis: { projects: number; inProgress: number; averageProgress: number; delayed: number; onTrack: number; activitiesInPeriod: number };
  rows: Array<{
    projectId: string;
    name: string;
    type: ProjectType;
    status: ProjectStatus;
    municipality: string;
    responsible: string;
    progress: number;
    expected: number;
    delay: number;
    onTrack: boolean;
    gainInPeriod: number;
    activitiesInPeriod: number;
    lastActivity: { date: string; name: string } | null;
    estimatedEndDate: string;
    daysRemaining: number;
  }>;
  series: Array<{ date: string; activities: number }>;
}

export interface FinancialReport extends ReportBase {
  type: "financial";
  kpis: {
    totalBudget: number;
    approvedTotal: number;
    approvedInPeriod: number;
    pending: number;
    available: number;
    cpi: number | null;
    transfersInPeriod: number;
    overrunProjects: number;
  };
  rows: Array<{
    projectId: string;
    name: string;
    status: ProjectStatus;
    budget: number;
    approvedTotal: number;
    approvedInPeriod: number;
    pending: number;
    available: number;
    executedPct: number;
    physicalProgress: number;
    gap: number;
    cpi: number | null;
  }>;
  byCategory: Array<{ category: ExpenseCategory; amount: number }>;
  series: Array<{ date: string; approved: number }>;
}

export interface MaterialsReport extends ReportBase {
  type: "materials";
  kpis: {
    movements: number;
    inMovements: number;
    outMovements: number;
    materialsMoved: number;
    criticalMaterials: number;
    rejectedExpenseWarnings?: number;
  };
  rows: Array<{
    materialId: string;
    name: string;
    unit: string;
    category: MaterialCategory | null;
    in: number;
    out: number;
    net: number;
    movements: number;
    stock: number;
    status: MaterialStatus;
    coverageDays: number | null;
  }>;
  byProject: Array<{ projectId: string; name: string; outMovements: number; materials: number }>;
  series: Array<{ date: string; in: number; out: number }>;
}

export interface IncidentsReport extends ReportBase {
  type: "incidents";
  kpis: { total: number; open: number; inReview: number; resolved: number; highPriority: number };
  rows: Array<{
    id: string;
    date: string;
    project: { id: string; name: string };
    type: IncidentType;
    priority: IncidentPriority;
    status: IncidentStatus;
    description: string;
  }>;
  byType: Array<{ type: IncidentType; count: number }>;
  series: Array<{ date: string; incidents: number }>;
}

export type AnyReport = ProgressReport | FinancialReport | MaterialsReport | IncidentsReport;
export interface ReportByType {
  progress: ProgressReport;
  financial: FinancialReport;
  materials: MaterialsReport;
  incidents: IncidentsReport;
}

export interface ReportSummary {
  summary: string;
  model: string;
  basedOn: ReportMeta;
}

// ---------- Daily site log ----------

export const WEATHER_VALUES = ["SUNNY", "CLOUDY", "RAINY", "STORMY"] as const;
export type Weather = (typeof WEATHER_VALUES)[number];
export type FieldReportStatus = "SUBMITTED" | "REVIEWED";

export interface FieldReport {
  id: string;
  projectId: string;
  authorId: string;
  /** Business date "YYYY-MM-DD" (America/Bogota) */
  date: string;
  weather: Weather | null;
  workersOnSite: number | null;
  summary: string;
  issues: string | null;
  status: FieldReportStatus;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; municipality: string; responsibleId: string };
  author: { id: string; name: string };
  reviewedBy: { id: string; name: string } | null;
}

export interface CompiledDay {
  date: string;
  activities: Array<{ id: string; name: string; progressPercentage: number; observations: string | null; date: string; responsible: { name: string } }>;
  incidents: Array<{ id: string; type: IncidentType; priority: IncidentPriority; status: IncidentStatus; description: string; date: string }>;
  evidence: Array<{ id: string; imageUrl: string; description: string | null; date: string }>;
  materialMovements: Array<{ id: string; type: MovementType; quantity: number; date: string; notes: string | null; material: { id: string; name: string; unit: string } }>;
  expenses: Array<{ id: string; category: ExpenseCategory; amount: number; status: ExpenseStatus; description: string | null; date: string; supportUrl: string | null }>;
  counts: { activities: number; incidents: number; evidence: number; materialMovements: number; expenses: number };
  existingReportId?: string | null;
}

export interface FieldReportDetail extends FieldReport {
  compiled: CompiledDay;
}

export interface FieldReportList {
  data: FieldReport[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  pendingReview: number;
  today: string;
}

export interface FieldReportFilters {
  projectId?: string;
  status?: FieldReportStatus;
  authorId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface FieldReportInput {
  projectId: string;
  date?: string;
  weather?: Weather;
  workersOnSite?: number;
  summary: string;
  issues?: string;
}
