"use client";

import { useEvidenceList } from "@/lib/evidence-service";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { ImageLightbox } from "@/components/ui/image-lightbox";

export default function EvidencePage() {
  const { data, isLoading } = useEvidenceList();
  const items = data?.data ?? [];

  return (
    <>
      <DashboardHeader
        title="Bitácora de Evidencias"
        subtitle="Registro fotográfico completo de avance en campo."
      />
      <main className="p-6">
        {isLoading && <p className="text-sm text-ink-muted">Cargando...</p>}
        {!isLoading && items.length === 0 && (
          <p className="rounded-xl border border-line bg-surface p-6 text-center text-sm text-ink-muted">
            Aún no hay evidencias registradas.
          </p>
        )}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, index) => {
            const raw = item as unknown as {
              id?: string;
              imageUrl?: string;
              url?: string;
              description?: string;
              date?: string;
              createdAt?: string;
              project?: { name?: string };
            };

            const id = raw.id ?? `evidence-${index}`;
            const imageUrl = raw.imageUrl || raw.url || "";
            const dateStr = raw.date || raw.createdAt || new Date().toISOString();
            const projectName = raw.project?.name || "Obra";
            const description = raw.description || "Sin descripción";

            return (
              <div
                key={id}
                className="overflow-hidden rounded-xl border border-line bg-surface"
              >
                {imageUrl && (
                  <ImageLightbox
                    src={imageUrl}
                    alt={description}
                    thumbClassName="h-40 w-full"
                  />
                )}
                <div className="p-3">
                  <p className="text-sm font-medium text-ink">{projectName}</p>
                  <p className="text-xs text-ink-muted">{description}</p>
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {new Date(dateStr).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}