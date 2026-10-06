"use client";

import { useProjects } from "@/lib/projects-service";
import { Link } from "@/i18n/navigation";

function progressColor(pct: number) {
  if (pct >= 75) return "bg-success";
  if (pct >= 40) return "bg-brand";
  return "bg-warning";
}

export function ProjectsTimeline() {
  const { data, isLoading } = useProjects({ status: "IN_PROGRESS" });
  const projects = data?.data ?? [];

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Línea de Tiempo de las Obras</h2>
        <Link href="/projects" className="text-xs text-accent hover:underline">Ver todas</Link>
      </div>

      {isLoading && <p className="text-sm text-ink-muted">Cargando...</p>}
      {!isLoading && projects.length === 0 && (
        <p className="text-sm text-ink-muted">No hay obras en ejecución.</p>
      )}

      <div className="space-y-5">
        {projects.map((p) => (
          <div key={p.id}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium">{p.name}</span>
              <span className="font-mono-data text-ink-muted">{p.progressPercentage}% Completado</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressColor(p.progressPercentage)}`}
                style={{ width: `${p.progressPercentage}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-ink-muted">{p.municipality}</p>
          </div>
        ))}
      </div>
    </div>
  );
}