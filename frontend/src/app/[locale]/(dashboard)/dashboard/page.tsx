"use client";

import { useAuthStore } from "@/store/auth.store";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">
          Cargando datos del usuario...
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Hola, {user?.name ?? "Usuario"} 👋</h1>
      <p className="text-gray-500 dark:text-gray-400">Rol: {user?.role}</p>
    </div>
  );
}