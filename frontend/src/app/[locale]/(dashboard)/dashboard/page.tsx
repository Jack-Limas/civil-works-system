"use client";

import { useAuthStore } from "@/store/auth.store";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <h1 className="text-2xl font-bold">Hola, {user?.name ?? "..."} 👋</h1>
      <p className="text-gray-500 dark:text-gray-400">Rol: {user?.role}</p>
    </div>
  );
}