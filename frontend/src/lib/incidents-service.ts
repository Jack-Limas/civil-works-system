import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { createResourceHooks } from "./create-resource-hooks";

export const INCIDENT_TYPES = [
  "MATERIAL_SHORTAGE",
  "ACTIVITY_DELAY",
  "WEATHER",
  "EQUIPMENT_DAMAGE",
  "STAFF_ISSUE",
  "ACTIVITY_CHANGE",
  "OTHER",
] as const;
export const INCIDENT_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
/** IN_REVIEW is shown as "In progress" / "En progreso". */
export const INCIDENT_STATUSES = ["OPEN", "IN_REVIEW", "RESOLVED"] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number];
export type IncidentPriority = (typeof INCIDENT_PRIORITIES)[number];
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

/** Lifecycle order: residents only move forward; going back is admin-only (API rule). */
export const STATUS_ORDER: Record<IncidentStatus, number> = { OPEN: 0, IN_REVIEW: 1, RESOLVED: 2 };

type Person = { id: string; name: string } | null;

export interface Incident {
  id: string;
  projectId: string;
  type: IncidentType;
  priority: IncidentPriority;
  description: string;
  status: IncidentStatus;
  /** When it happened (event date). createdAt is internal only. */
  date: string;
  reportedById?: string | null;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  project?: { id: string; name: string; responsibleId?: string };
  reportedBy?: Person;
  _count?: { evidence: number };
}

export interface IncidentDetail extends Incident {
  project: { id: string; name: string; municipality: string; responsibleId: string };
  reportedBy: Person;
  resolvedBy: Person;
  statusChanges: Array<{
    id: string;
    fromStatus: IncidentStatus | null;
    toStatus: IncidentStatus;
    note: string | null;
    createdAt: string;
    changedBy: Person;
  }>;
  evidence: Array<{ id: string; imageUrl: string; description: string | null; date: string; uploadedBy: Person }>;
}

export interface IncidentKpis {
  open: number;
  inProgress: number;
  highActive: number;
  resolvedThisMonth: number;
}

export interface IncidentFilters {
  projectId?: string;
  status?: IncidentStatus;
  state?: "active";
  priority?: IncidentPriority;
  type?: IncidentType;
  search?: string;
  from?: string;
  to?: string;
  sort?: "priority" | "date";
  page?: number;
  limit?: number;
}

export interface CreateIncidentInput {
  projectId: string;
  type: IncidentType;
  priority: IncidentPriority;
  description: string;
  date?: string;
}

interface IncidentList {
  data: Incident[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: IncidentKpis;
}

// Kept for existing screens (project detail tab)
export const {
  useList: useIncidents,
  useCreate: useCreateIncident,
  useUpdate: useUpdateIncident,
} = createResourceHooks<Incident, CreateIncidentInput, { status: IncidentStatus }>("incidents", "/incidents");

export function useIncidentList(filters: IncidentFilters) {
  return useQuery({
    queryKey: ["incidents", "list", filters],
    queryFn: async () => {
      const { data } = await apiClient.get<IncidentList>("/incidents", { params: filters });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useIncidentDetail(id: string | null) {
  return useQuery({
    queryKey: ["incidents", "detail", id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: IncidentDetail }>(`/incidents/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

function useInvalidateIncidents() {
  const queryClient = useQueryClient();
  return () => {
    // Open delay incidents feed the alert rules and the dashboard
    for (const key of ["incidents", "alerts", "dashboard", "reports", "field-reports"]) queryClient.invalidateQueries({ queryKey: [key] });
  };
}

export function useReportIncident() {
  const invalidate = useInvalidateIncidents();
  return useMutation({
    mutationFn: async (input: CreateIncidentInput) => {
      const { data } = await apiClient.post<{ data: IncidentDetail }>("/incidents", input);
      return data.data;
    },
    onSuccess: invalidate,
  });
}

export function useChangeIncidentStatus() {
  const invalidate = useInvalidateIncidents();
  return useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: IncidentStatus; note?: string }) => {
      const { data } = await apiClient.post<{ data: IncidentDetail }>(`/incidents/${id}/status`, { status, note });
      return data.data;
    },
    onSuccess: invalidate,
  });
}

/** Uses the evidence endpoint (Cloudinary) with the incident link. */
export function useAddIncidentPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ incident, file, description }: { incident: Pick<Incident, "id" | "projectId">; file: File; description?: string }) => {
      const form = new FormData();
      // Text fields go before the file: the API reads them from the first part
      form.append("projectId", incident.projectId);
      form.append("incidentId", incident.id);
      if (description) form.append("description", description);
      form.append("file", file);
      await apiClient.post("/evidence", form, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["evidence"] });
    },
  });
}
