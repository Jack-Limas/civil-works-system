import { apiClient } from "./api-client";
import { AuthUser } from "@/types/auth";

export const authService = {
  async login(email: string, password: string) {
    const { data } = await apiClient.post<{ user: AuthUser }>("/auth/login", { email, password });
    return data.user;
  },

  async me() {
    const { data } = await apiClient.get<{ user: AuthUser }>("/auth/me");
    return data.user;
  },

  async logout() {
    await apiClient.post("/auth/logout");
  },
};