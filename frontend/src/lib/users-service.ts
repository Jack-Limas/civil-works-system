import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./api-client";
import { AuthUser, Role } from "@/types/auth";
import type { AuditLogEntry } from "./audit-service";

export interface UserSummary extends AuthUser {
  createdAt: string;
}

/** Row of the admin user directory. Never carries the password hash. */
export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  projectsInCharge: number;
}

export interface UserKpis {
  total: number;
  active: number;
  inactive: number;
  admins: number;
  residents: number;
  pendingPasswordChange: number;
  neverLoggedIn: number;
}

export interface UserDetail extends Omit<ManagedUser, "projectsInCharge"> {
  createdBy: { id: string; name: string } | null;
  projectsInCharge: Array<{ id: string; name: string; status: string; municipality: string; progressPercentage: number }>;
  recentActivity: AuditLogEntry[];
}

export interface UserFilters {
  search?: string;
  role?: Role;
  status?: "active" | "inactive";
  page?: number;
  limit?: number;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: Role;
  phone?: string;
}

export interface UpdateUserInput {
  name?: string;
  phone?: string | null;
  role?: Role;
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * Active users only, for pickers (project responsible, fund transfer recipient):
 * a deactivated user can no longer be chosen.
 */
export function useUsers(role?: Role, enabled = true) {
  return useQuery({
    queryKey: ["users", "pickers", role],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: UserSummary[] }>("/users", {
        params: { role, status: "active", limit: 200 },
      });
      return data.data;
    },
    enabled,
  });
}

export function useUserDirectory(filters: UserFilters) {
  return useQuery({
    queryKey: ["users", "directory", filters],
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<ManagedUser> & { summary: UserKpis }>("/users", { params: filters });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useUserDetail(id: string) {
  return useQuery({
    queryKey: ["users", "detail", id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: UserDetail }>(`/users/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["audit"] });
  };
}

/** The temporary password comes back once in this response and is never stored by the client. */
export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const { data } = await apiClient.post<{ data: ManagedUser; temporaryPassword: string }>("/users", input);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateUserInput }) => {
      const { data } = await apiClient.patch<{ data: UserDetail }>(`/users/${id}`, input);
      return data.data;
    },
    onSuccess: invalidate,
  });
}

export function useSetUserActive() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data } = await apiClient.post<{ data: UserDetail }>(`/users/${id}/${active ? "activate" : "deactivate"}`);
      return data.data;
    },
    onSuccess: invalidate,
  });
}

export function useResetUserPassword() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<{ temporaryPassword: string }>(`/users/${id}/reset-password`);
      return data.temporaryPassword;
    },
    onSuccess: invalidate,
  });
}
