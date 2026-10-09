import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import type { Role } from "@/types/auth";

export const AUDIT_ENTITY_TYPES = ["user", "settings", "expense", "transfer", "project", "material", "field_report", "incident", "worker"] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export type AuditMetadata = Record<string, unknown> & {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorEmail: string;
  action: string;
  entityType: AuditEntityType | null;
  entityId: string | null;
  metadata: AuditMetadata | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: string; name: string; email: string; role: Role } | null;
}

export interface AuditFilters {
  actorId?: string;
  action?: string;
  entityType?: AuditEntityType;
  entityId?: string;
  /** Business dates YYYY-MM-DD (America/Bogota) */
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function useAuditLogs(filters: AuditFilters) {
  return useQuery({
    queryKey: ["audit", "list", filters],
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<AuditLogEntry>>("/audit-logs", { params: filters });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useAuditActions() {
  return useQuery({
    queryKey: ["audit", "actions"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Array<{ action: string; count: number }> }>("/audit-logs/actions");
      return data.data;
    },
    staleTime: 60_000,
  });
}

/** Same filters as the table, up to the server's export cap (it says when it truncated). */
export async function fetchAuditExport(filters: Omit<AuditFilters, "page" | "limit">) {
  const { data } = await apiClient.get<{ data: AuditLogEntry[]; total: number; truncated: boolean }>("/audit-logs/export", { params: filters });
  return data;
}
