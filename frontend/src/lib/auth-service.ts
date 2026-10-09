import { apiClient } from "./api-client";
import { AuthUser } from "@/types/auth";

interface AuthResponse {
  user: AuthUser;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthUser> {
    const { data } = await apiClient.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    return data.user;
  },

  async me(): Promise<AuthUser> {
    const { data } = await apiClient.get<AuthResponse>("/auth/me");
    return data.user;
  },

  /** Signs out the other sessions; this one receives fresh cookies. */
  async changePassword(currentPassword: string, newPassword: string): Promise<AuthUser> {
    const { data } = await apiClient.post<AuthResponse>("/auth/change-password", { currentPassword, newPassword });
    return data.user;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Si responde 401 o la cookie ya expiró, continuamos el flujo de cierre local sin lanzar error
    }
  },
};