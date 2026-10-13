import { apiClient } from "./api-client";
import { AuthUser } from "@/types/auth";
import { setAccessToken } from "./access-token";

interface AuthResponse {
  user: AuthUser;
  /** Also returned in the body (besides the httpOnly cookie) for the Bearer fallback */
  accessToken?: string;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthUser> {
    const { data } = await apiClient.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    setAccessToken(data.accessToken);
    return data.user;
  },

  async me(): Promise<AuthUser> {
    const { data } = await apiClient.get<AuthResponse>("/auth/me");
    return data.user;
  },

  /** Signs out the other sessions; this one receives fresh cookies. */
  async changePassword(currentPassword: string, newPassword: string): Promise<AuthUser> {
    const { data } = await apiClient.post<AuthResponse>("/auth/change-password", { currentPassword, newPassword });
    setAccessToken(data.accessToken);
    return data.user;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Si responde 401 o la cookie ya expiró, continuamos el flujo de cierre local sin lanzar error
    } finally {
      setAccessToken(null);
    }
  },
};