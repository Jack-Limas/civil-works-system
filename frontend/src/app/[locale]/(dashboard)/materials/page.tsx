"use client";

import { useAuthStore } from "@/store/auth.store";
import { AdminInventory } from "@/components/inventory/admin-inventory";
import { ResidentInventory } from "@/components/inventory/resident-inventory";

/**
 * Inventory (CSR). Admins get the full warehouse view; residents a simple,
 * mobile-first view without costs. The API applies the same rules.
 */
export default function MaterialsPage() {
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

  return user.role === "ADMIN" ? <AdminInventory /> : <ResidentInventory />;
}
