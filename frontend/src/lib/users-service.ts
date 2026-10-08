import { apiClient } from "./api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthUser, Role } from "@/types/auth";

export interface UserSummary extends AuthUser {
  createdAt: string;
}

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export function useUsers(role?: Role, enabled = true) {
  return useQuery({
    queryKey: ["users", "list", role],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: UserSummary[] }>("/users", {
        params: { role },
      });
      return data.data;
    },
    enabled,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const { data } = await apiClient.post<{ user: AuthUser }>("/auth/register", input);
      return data.user;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}
