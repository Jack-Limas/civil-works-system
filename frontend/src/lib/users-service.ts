import { apiClient } from "./api-client";
import { useMutation } from "@tanstack/react-query";

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "RESIDENT_ENGINEER";
}

export function useCreateUser() {
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const { data } = await apiClient.post("/auth/register", input);
      return data.data;
    },
  });
}