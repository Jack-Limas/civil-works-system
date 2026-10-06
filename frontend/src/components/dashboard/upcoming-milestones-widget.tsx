"use client";

import { useProjects } from "@/lib/projects-service";
import { Calendar } from "lucide-react";

// Interfaz local para evitar el error de ESLint sin depender de @/types/project
interface MilestoneProject {
  id: string;
  name: string;
  municipality: string;
  estimatedEndDate?: string;
}

export function UpcomingMilestonesWidget() {
  const { data } = useProjects({ status: "IN_PROGRESS" });

  const projects = [...(data?.data ?? [])]
    .filter((p: MilestoneProject) => p.estimatedEndDate)
    .sort(
      (a: MilestoneProject, b: MilestoneProject) =>
        new Date(a.estimatedEndDate!).getTime() - new Date(b.estimatedEndDate!).getTime()
    )
    .slice(0, 3);

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <Calendar size={16} className="text-brand" />
        <h2 className="text-sm font-semibold">Próximos Hitos de Entrega</h2>
      </div>

      <div className="space-y-3">
        {projects.map((p: MilestoneProject) => {
          const date = new Date(p.estimatedEndDate!);
          return (
            <div key={p.id} className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-surface-2 text-center">
                <span className="text-[10px] font-medium uppercase text-ink-muted">
                  {date.toLocaleDateString("es-CO", { month: "short" })}
                </span>
                <span className="font-mono-data text-sm font-semibold leading-none">
                  {date.getDate()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-ink-muted">{p.municipality}</p>
              </div>
            </div>
          );
        })}
        {projects.length === 0 && (
          <p className="text-sm text-ink-muted">Sin obras en ejecución.</p>
        )}
      </div>
    </div>
  );
}