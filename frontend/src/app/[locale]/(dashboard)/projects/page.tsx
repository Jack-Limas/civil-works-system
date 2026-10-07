"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Search, Plus, Camera } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Modal } from "@/components/ui/modal";
import { useProjects, useCreateProject, Project } from "@/lib/projects-service";
import { useAlerts } from "@/lib/alerts-service";
import { useUploadEvidence } from "@/lib/evidence-service";

const schema = z.object({
  name: z.string().min(3),
  type: z.enum(["STADIUM", "POOL", "SYNTHETIC_FIELD", "RETAINING_WALL", "PRIVATE_WORK", "OTHER"]),
  municipality: z.string().min(2),
  startDate: z.string(),
  estimatedEndDate: z.string(),
  budget: z.coerce.number().positive(),
  responsibleId: z.string().uuid(),
});

type FormValues = z.infer<typeof schema>;

const STATUS_CLASS: Record<Project["status"], string> = {
  PLANNED: "bg-surface-2 text-ink-muted",
  IN_PROGRESS: "bg-success/15 text-success",
  SUSPENDED: "bg-warning/15 text-warning",
  FINISHED: "bg-brand/15 text-brand",
};

function progressColor(pct: number) {
  if (pct >= 75) return "bg-success";
  if (pct >= 40) return "bg-brand";
  return "bg-warning";
}

export default function ProjectsPage() {
  const t = useTranslations("projects");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);

  // Estados para el Modal de Subir Evidencia Fotográfica
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const { data, isLoading } = useProjects();
  const { data: activeAlerts } = useAlerts("ACTIVE");
  const createProject = useCreateProject();
  const uploadEvidence = useUploadEvidence();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const projects = data?.data ?? [];
  const alertedIds = new Set((activeAlerts ?? []).map((a) => a.project.id));

  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          (statusFilter === "ALL" || p.status === statusFilter) &&
          p.name.toLowerCase().includes(search.toLowerCase())
      ),
    [projects, search, statusFilter]
  );

  const totals = useMemo(
    () => ({
      total: projects.length,
      inProgress: projects.filter((p) => p.status === "IN_PROGRESS").length,
      budget: projects.reduce((sum, p) => sum + Number(p.budget), 0),
    }),
    [projects]
  );

  async function onSubmit(values: FormValues) {
    await createProject.mutateAsync(values);
    reset();
    setModalOpen(false);
  }

  // Manejo de subida de evidencias fotográficas mediante FormData
  async function handleEvidenceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProjectId || !evidenceFile) {
      alert("Selecciona un archivo de imagen válido");
      return;
    }

    const formData = new FormData();
    formData.append("projectId", selectedProjectId);
    formData.append("description", evidenceDescription);
    formData.append("file", evidenceFile);

    await uploadEvidence.mutateAsync(formData);

    setEvidenceDescription("");
    setEvidenceFile(null);
    setSelectedProjectId(null);
    setEvidenceModalOpen(false);
    alert("Evidencia subida correctamente");
  }

  function openEvidenceModal(projectId: string) {
    setSelectedProjectId(projectId);
    setEvidenceModalOpen(true);
  }

  return (
    <>
      <DashboardHeader title={t("title")} subtitle={t("subtitle")} />

      <main className="space-y-5 p-6">
        {/* KPI Cards Superiores */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="hover-lift rounded-xl border border-line bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {t("totalProjects")}
            </p>
            <p className="font-mono-data text-2xl font-semibold text-ink">{totals.total}</p>
          </div>
          <div className="hover-lift rounded-xl border border-line bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {t("inProgress")}
            </p>
            <p className="font-mono-data text-2xl font-semibold text-success">
              {totals.inProgress}
            </p>
          </div>
          <div className="hover-lift rounded-xl border border-line bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {t("totalBudget")}
            </p>
            <p className="font-mono-data text-2xl font-semibold text-ink">
              ${totals.budget.toLocaleString("es-CO")}
            </p>
          </div>
        </div>

        {/* Filtros de Búsqueda y Botón de Nueva Obra */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <div className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2">
              <Search size={14} className="text-ink-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="bg-transparent text-sm text-ink outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none"
            >
              <option value="ALL">{t("allStatuses")}</option>
              <option value="PLANNED">{t("status.PLANNED")}</option>
              <option value="IN_PROGRESS">{t("status.IN_PROGRESS")}</option>
              <option value="SUSPENDED">{t("status.SUSPENDED")}</option>
              <option value="FINISHED">{t("status.FINISHED")}</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
          >
            <Plus size={15} /> {t("newProject")}
          </button>
        </div>

        {/* Tabla Rica de Proyectos */}
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 text-left">{t("fields.name")}</th>
                <th className="px-4 py-3 text-left">{t("fields.municipality")}</th>
                <th className="px-4 py-3 text-left">{t("fields.type")}</th>
                <th className="px-4 py-3 text-left">{t("fields.progress")}</th>
                <th className="px-4 py-3 text-left">{t("fields.budget")}</th>
                <th className="px-4 py-3 text-left">{t("fields.status")}</th>
                <th className="px-4 py-3 text-left">{t("fields.responsible")}</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-ink-muted">
                    Cargando obras...
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-ink-muted">
                    Sin resultados.
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <motion.tr
                  key={p.id}
                  whileHover={{ backgroundColor: "var(--surface-2)" }}
                  className="transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-ink">
                    <div className="flex items-center gap-2">
                      {alertedIds.has(p.id) && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-critical"
                          title="Tiene alertas activas"
                        />
                      )}
                      {p.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{p.municipality}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink">
                      {t(`types.${p.type}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={`h-full rounded-full ${progressColor(p.progressPercentage)}`}
                          style={{ width: `${p.progressPercentage}%` }}
                        />
                      </div>
                      <span className="font-mono-data text-xs text-ink">
                        {p.progressPercentage}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono-data text-ink">
                    ${Number(p.budget).toLocaleString("es-CO")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[p.status]}`}
                    >
                      {t(`status.${p.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink">{p.responsible?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => openEvidenceModal(p.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-2 px-2.5 py-1 text-xs text-ink hover:bg-surface hover:text-accent transition-colors"
                    >
                      <Camera size={13} /> Evidencia
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal para Crear Obra */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("newProject")}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              {t("fields.name")}
            </label>
            <input
              {...register("name")}
              className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none"
            />
            {errors.name && <p className="mt-1 text-xs text-critical">Mínimo 3 caracteres</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              {t("fields.type")}
            </label>
            <select
              {...register("type")}
              className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none"
            >
              {[
                "STADIUM",
                "POOL",
                "SYNTHETIC_FIELD",
                "RETAINING_WALL",
                "PRIVATE_WORK",
                "OTHER",
              ].map((opt) => (
                <option key={opt} value={opt}>
                  {t(`types.${opt}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              {t("fields.municipality")}
            </label>
            <input
              {...register("municipality")}
              className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">
                {t("fields.startDate")}
              </label>
              <input
                type="date"
                {...register("startDate")}
                className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">
                {t("fields.endDate")}
              </label>
              <input
                type="date"
                {...register("estimatedEndDate")}
                className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              {t("fields.budget")}
            </label>
            <input
              type="number"
              {...register("budget")}
              className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              ID del responsable
            </label>
            <input
              {...register("responsibleId")}
              placeholder="UUID del usuario"
              className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={createProject.isPending}
            className="w-full rounded-md bg-accent py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createProject.isPending ? "Guardando..." : t("newProject")}
          </button>
        </form>
      </Modal>

      {/* Modal para Subir Evidencia Fotográfica */}
      <Modal
        open={evidenceModalOpen}
        onClose={() => setEvidenceModalOpen(false)}
        title="Adjuntar Evidencia Fotográfica"
      >
        <form onSubmit={handleEvidenceSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              Descripción
            </label>
            <input
              type="text"
              value={evidenceDescription}
              onChange={(e) => setEvidenceDescription(e.target.value)}
              placeholder="Ej: Foto del avance de cimentación"
              className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              Fotografía (Imagen)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-ink-muted file:mr-4 file:rounded-md file:border-0 file:bg-surface-2 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink hover:file:bg-line"
              required
            />
          </div>

          <button
            type="submit"
            disabled={uploadEvidence.isPending}
            className="w-full rounded-md bg-accent py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {uploadEvidence.isPending ? "Subiendo..." : "Subir Fotografía"}
          </button>
        </form>
      </Modal>
    </>
  );
}