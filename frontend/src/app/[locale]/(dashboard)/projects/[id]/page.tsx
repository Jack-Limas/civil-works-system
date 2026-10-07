"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Camera } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { useProject } from "@/lib/projects-service";
import { useProjectActivities } from "@/lib/activities-service";
import { useBudgetIndicators } from "@/lib/expenses-service";
import { useIncidents } from "@/lib/incidents-service";
import { useEvidenceList, useUploadEvidence } from "@/lib/evidence-service";
import { Modal } from "@/components/ui/modal";
import { ImageLightbox } from "@/components/ui/image-lightbox";

const TABS = ["Resumen", "Actividades", "Costos", "Novedades", "Evidencias"] as const;

interface IncidentItem {
  id: string;
  type: string;
  description: string;
}

interface EvidenceItem {
  id: string;
  url?: string;
  imageUrl?: string;
  description?: string;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [tab, setTab] = useState<(typeof TABS)[number]>("Resumen");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: project } = useProject(id);
  const { data: activities } = useProjectActivities(id);
  const { data: indicators } = useBudgetIndicators(id);
  const { data: incidents } = useIncidents();
  const { data: evidence } = useEvidenceList(id);
  const uploadEvidence = useUploadEvidence();

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !id) return;

    const formData = new FormData();
    formData.append("projectId", id);
    formData.append("description", description);
    formData.append("file", file);

    await uploadEvidence.mutateAsync(formData);

    setDescription("");
    setFile(null);
    setEvidenceOpen(false);
  }

  if (!project) return <main className="p-6 text-sm text-ink-muted">Cargando obra...</main>;

  const incidentList = ((incidents as { data?: unknown })?.data ?? []) as IncidentItem[];
  const evidenceList = ((evidence as { data?: unknown })?.data ?? []) as EvidenceItem[];

  return (
    <>
      <DashboardHeader title={project.name} subtitle={`${project.municipality} · ${project.status}`} />

      <main className="space-y-5 p-6">
        <Link href="/projects" className="flex w-fit items-center gap-1 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> Volver a Obras
        </Link>

        <div className="flex gap-1 border-b border-line">
          {TABS.map((tName) => (
            <button
              key={tName}
              onClick={() => setTab(tName)}
              className={`border-b-2 px-4 py-2 text-sm transition-colors ${
                tab === tName
                  ? "border-accent font-medium text-accent"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {tName}
            </button>
          ))}
        </div>

        {tab === "Resumen" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-5">
              <p className="text-xs font-medium uppercase text-ink-muted">Avance Físico</p>
              <p className="font-mono-data text-3xl font-semibold">{project.progressPercentage}%</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-accent" style={{ width: `${project.progressPercentage}%` }} />
              </div>
            </div>
            {indicators && (
              <div className="rounded-xl border border-line bg-surface p-5">
                <p className="text-xs font-medium uppercase text-ink-muted">Avance Financiero</p>
                <p className="font-mono-data text-3xl font-semibold">{indicators.executedPercentage}%</p>
                <p className="mt-1 text-xs text-ink-muted">
                  Ejecutado ${indicators.executedExpenses.toLocaleString("es-CO")} / Presupuesto ${indicators.budget.toLocaleString("es-CO")}
                </p>
              </div>
            )}
          </div>
        )}

        {tab === "Actividades" && (
          <div className="space-y-2">
            {(activities ?? []).map((a) => (
              <div key={a.id} className="rounded-lg border border-line bg-surface p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{a.name}</p>
                  <span className="font-mono-data text-xs text-ink-muted">{a.progressPercentage}%</span>
                </div>
                <p className="text-xs text-ink-muted">
                  {new Date(a.date).toLocaleDateString("es-CO")} · {a.responsible?.name}
                </p>
              </div>
            ))}
            {(!activities || activities.length === 0) && (
              <p className="text-sm text-ink-muted">Sin actividades registradas.</p>
            )}
          </div>
        )}

        {tab === "Costos" && indicators && (
          <div className="rounded-xl border border-line bg-surface p-5">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-ink-muted">Presupuesto</dt>
                <dd className="font-mono-data font-medium">${indicators.budget.toLocaleString("es-CO")}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Ejecutado</dt>
                <dd className="font-mono-data font-medium">${indicators.executedExpenses.toLocaleString("es-CO")}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Disponible</dt>
                <dd className="font-mono-data font-medium">${indicators.availableBudget.toLocaleString("es-CO")}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Brecha financiero-física</dt>
                <dd className="font-mono-data font-medium">{indicators.financialVsPhysicalGap}%</dd>
              </div>
            </dl>
          </div>
        )}

        {tab === "Novedades" && (
          <div className="space-y-2">
            {incidentList.map((i) => (
              <div key={i.id} className="rounded-lg border border-line bg-surface p-3 text-sm">
                <p className="font-medium">{i.type}</p>
                <p className="text-ink-muted">{i.description}</p>
              </div>
            ))}
            {incidentList.length === 0 && (
              <p className="text-sm text-ink-muted">Sin novedades registradas.</p>
            )}
          </div>
        )}

        {tab === "Evidencias" && (
          <div className="space-y-3">
            <button
              onClick={() => setEvidenceOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <Camera size={14} /> Adjuntar evidencia
            </button>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {evidenceList.map((e) => (
                <ImageLightbox
                  key={e.id}
                  src={e.url ?? e.imageUrl ?? ""}
                  alt={e.description ?? ""}
                  thumbClassName="h-28 w-full rounded-lg border border-line object-cover"
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <Modal open={evidenceOpen} onClose={() => setEvidenceOpen(false)} title="Adjuntar evidencia">
        <form onSubmit={handleUpload} className="space-y-3">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción"
            className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none"
            required
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-ink-muted"
            required
          />
          <button
            type="submit"
            disabled={uploadEvidence.isPending}
            className="w-full rounded-md bg-accent py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {uploadEvidence.isPending ? "Subiendo..." : "Subir"}
          </button>
        </form>
      </Modal>
    </>
  );
}