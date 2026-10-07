"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Search, Plus, Play, CheckCircle2, Loader2 } from "lucide-react";
import { AxiosError } from "axios";
import { Link } from "@/i18n/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  useProjects,
  useUpdateProject,
  Project,
} from "@/lib/projects-service";
import { useAlerts } from "@/lib/alerts-service";

const STATUS_CLASS: Record<Project["status"], string> = {
  PLANNED: "bg-surface-2 text-ink-muted border border-line",
  IN_PROGRESS: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  SUSPENDED: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  FINISHED: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30",
};

function progressColor(pct: number) {
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 40) return "bg-accent";
  return "bg-amber-500";
}

export default function ProjectsPage() {
  const t = useTranslations("projects");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data, isLoading } = useProjects();
  const { data: activeAlerts } = useAlerts("ACTIVE");
  const updateProject = useUpdateProject();

  const projects = useMemo(() => data?.data ?? [], [data?.data]);
  const alertedIds = useMemo(
    () => new Set((activeAlerts ?? []).map((a) => a.project.id)),
    [activeAlerts]
  );

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

  async function handleStatusChange(projectId: string, newStatus: Project["status"]) {
    try {
      await updateProject.mutateAsync({
        id: projectId,
        input: { status: newStatus },
      });
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string; message?: string }>;
      const status = axiosErr.response?.status;
      const message =
        axiosErr.response?.data?.message ??
        axiosErr.response?.data?.error ??
        axiosErr.message;

      console.error(`Error ${status ?? "sin respuesta"}: ${message}`);
      alert(`No se pudo actualizar (${status ?? "sin conexión"}): ${message}`);
    }
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
            <p className="font-mono-data text-2xl font-semibold text-ink">
              {totals.total}
            </p>
          </div>
          <div className="hover-lift rounded-xl border border-line bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {t("inProgress")}
            </p>
            <p className="font-mono-data text-2xl font-semibold text-emerald-400">
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

        {/* Filtros y Botón Nuevo Proyecto */}
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
          <Link
            href="/projects/new"
            className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors shadow-sm"
          >
            <Plus size={15} /> {t("newProject")}
          </Link>
        </div>

        {/* Tabla de Obras con Link Dinámico */}
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
                <th className="px-4 py-3 text-right">Acciones</th>
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
                    <Link
                      href={`/projects/${p.id}`}
                      className="flex items-center gap-2 hover:text-accent transition-colors"
                    >
                      {alertedIds.has(p.id) && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-critical"
                          title="Tiene alertas activas"
                        />
                      )}
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{p.municipality}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink border border-line">
                      {t(`types.${p.type}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={`h-full rounded-full ${progressColor(
                            p.progressPercentage
                          )}`}
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
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        STATUS_CLASS[p.status]
                      }`}
                    >
                      {t(`status.${p.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {p.responsible?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      {p.status === "PLANNED" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(p.id, "IN_PROGRESS")}
                          disabled={updateProject.isPending}
                          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50 shadow-sm"
                        >
                          {updateProject.isPending ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Play size={13} />
                          )}
                          Marcar en curso
                        </button>
                      )}

                      {p.status === "IN_PROGRESS" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(p.id, "FINISHED")}
                          disabled={updateProject.isPending}
                          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50 shadow-sm"
                        >
                          {updateProject.isPending ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={13} />
                          )}
                          Marcar finalizada
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}