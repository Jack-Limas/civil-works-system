"use client";

import { useEffect, ReactNode } from "react";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/lib/auth-service";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    authService
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [setUser, setLoading]);

  return <>{children}</>;
}