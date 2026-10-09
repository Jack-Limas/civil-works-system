"use client";

import { useAuthStore } from "@/store/auth.store";
import { AdminWorkers } from "@/components/workers/admin-workers";
import { ResidentWorkers } from "@/components/workers/resident-workers";

/**
 * Workers (CSR). Admins manage the directory; residents see who works on their
 * projects without personal data. The API applies the same rules.
 */
export default function WorkersPage() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading || !user) {
    return (
      <main className="space-y-4 p-4 sm:p-6" aria-busy="true">
        <div className="h-24 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
        <div className="h-64 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
      </main>
    );
  }

  return user.role === "ADMIN" ? <AdminWorkers /> : <ResidentWorkers />;
}
