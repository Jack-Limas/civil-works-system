"use client";

import { useEffect, ReactNode } from "react";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/lib/auth-service";

export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  // Store starts with isLoading=true, so no synchronous setState is needed here.
  useEffect(() => {
    authService
      .me()
      .then((user) => {
        setUser(user);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [setUser, setLoading]);

  return <>{children}</>;
}