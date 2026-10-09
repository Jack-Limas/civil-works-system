"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/store/auth.store";

/**
 * A user with a temporary password is sent to /change-password as soon as the
 * session loads, instead of waiting for the first 403 from the API.
 */
export function PasswordChangeGuard() {
  const router = useRouter();
  const mustChange = useAuthStore((s) => !!s.user?.mustChangePassword);

  useEffect(() => {
    if (mustChange) router.replace("/change-password");
  }, [mustChange, router]);

  return null;
}
