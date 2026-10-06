"use client";

import { useEvidenceList } from "@/lib/evidence-service";
import { Link } from "@/i18n/navigation";
import { ImageLightbox } from "@/components/ui/image-lightbox";

export function FieldActivityFeed() {
  const { data } = useEvidenceList();
  const items = (data?.data ?? []).slice(0, 3);

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Actividad Reciente en Campo</h2>
        <Link href="/evidence" className="text-xs text-accent hover:underline">
          Ver bitácora completa
        </Link>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => {
          const raw = item as unknown as {
            id?: string;
            imageUrl?: string;
            url?: string;
            description?: string;
            date?: string;
            createdAt?: string;
            uploadedBy?: { name?: string };
            user?: { name?: string };
            project?: { name?: string };
          };

          const id = raw.id ?? `evidence-${index}`;
          const imageUrl = raw.imageUrl || raw.url || "";
          const dateStr = raw.date || raw.createdAt || new Date().toISOString();
          const userName = raw.uploadedBy?.name || raw.user?.name || "Usuario";
          const projectName = raw.project?.name || "una obra";
          const description = raw.description || "Evidencia";

          return (
            <div key={id} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-medium text-accent">
                {userName[0]?.toUpperCase() ?? "?"}
              </div>
              <div>
                <p className="text-sm text-ink">
                  <span className="font-medium text-ink">{userName}</span>{" "}
                  registró avance fotográfico en{" "}
                  <span className="font-medium text-ink">{projectName}</span>.
                </p>
                <p className="mb-2 text-xs text-ink-muted">
                  {new Date(dateStr).toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
                {imageUrl && (
                  <ImageLightbox
                    src={imageUrl}
                    alt={description}
                    thumbClassName="h-24 w-32 rounded-lg border border-line object-cover"
                  />
                )}
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="text-sm text-ink-muted">Sin evidencias registradas aún.</p>
        )}
      </div>
    </div>
  );
}