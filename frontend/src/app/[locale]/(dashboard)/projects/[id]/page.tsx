"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, Plus, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Modal } from "@/components/ui/modal";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { useAuthStore } from "@/store/auth.store";
import { useProject } from "@/lib/projects-service";
import { Activity, useCreateActivity, useProjectActivities } from "@/lib/activities-service";
import { useBudgetIndicators, useProjectExpenses } from "@/lib/expenses-service";
import { useIncidents } from "@/lib/incidents-service";
import { useEvidenceList, useUploadEvidence } from "@/lib/evidence-service";
import { useAlerts } from "@/lib/alerts-service";
import { useLowStockMaterials } from "@/lib/materials-service";
import { Prediction, useGeneratePrediction, usePredictions } from "@/lib/predictions-service";

const TAB_KEYS = ["overview", "activities", "costs", "incidents", "evidence"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
type Level = (typeof LEVELS)[number];

const LEVEL_CLASS: Record<Level, string> = {
  LOW: "bg-success/15 text-success",
  MEDIUM: "bg-warning/15 text-warning",
  HIGH: "bg-critical/15 text-critical",
};

const SOURCE_KEYS = ["RULE_BASED", "AI_GEMINI"];

const fieldClass =
  "w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/30";

const activitySchema = z.object({
  name: z.string().min(3),
  progressPercentage: z.number().min(0).max(100),
  observations: z.string().optional(),
});
type ActivityFormValues = z.infer<typeof activitySchema>;

interface IncidentItem {
  id: string;
  projectId: string;
  type: string;
  description: string;
  priority: string;
  date?: string;
}

interface EvidenceItem {
  id: string;
  url?: string;
  imageUrl?: string;
  description?: string;
}

// Helpers fuera del componente: mantienen el render puro
function asLevel(value: unknown): Level | null {
  return LEVELS.find((l) => l === value) ?? null;
}

function expectedProgress(start: string, end: string): number {
  const now = Date.now();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (now <= s) return 0;
  if (now >= e) return 100;
  return ((now - s) / (e - s)) * 100;
}

function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

const money = (value: number | string) => `$${Number(value).toLocaleString("es-CO")}`;

function Card({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ProgressBar({ value, marker, color = "bg-accent" }: { value: number; marker?: number; color?: string }) {
  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  return (
    <div className="relative mt-3 h-2 w-full rounded-full bg-surface-2">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${clamp(value)}%` }} />
      {marker !== undefined && (
        <div className="absolute -top-1 h-4 w-0.5 rounded bg-ink" style={{ left: `${clamp(marker)}%` }} />
      )}
    </div>
  );
}

export default function ProjectDetailPage() {
  const t = useTranslations("projectDetail");
  const tp = useTranslations("projects");
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<TabKey>("overview");
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: project, isLoading, isError } = useProject(id);
  const { data: activities } = useProjectActivities(id);
  const { data: indicators } = useBudgetIndicators(id);
  const { data: expenses } = useProjectExpenses(id);
  const { data: incidents } = useIncidents();
  const { data: evidence } = useEvidenceList(id);
  const { data: allAlerts } = useAlerts("ACTIVE");
  const { data: lowStock } = useLowStockMaterials();
  const { data: predictions } = usePredictions(id);
  const generatePrediction = useGeneratePrediction(id);
  const createActivity = useCreateActivity();
  const uploadEvidence = useUploadEvidence();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ActivityFormValues>({ resolver: zodResolver(activitySchema) });

  const incidentList = useMemo(
    () =>
      (((incidents as { data?: unknown } | undefined)?.data ?? []) as IncidentItem[]).filter(
        (i) => i.projectId === id
      ),
    [incidents, id]
  );
  const evidenceList = useMemo(
    () => ((evidence as { data?: unknown } | undefined)?.data ?? []) as EvidenceItem[],
    [evidence]
  );
  const projectAlerts = useMemo(
    () => (allAlerts ?? []).filter((a) => a.project.id === id),
    [allAlerts, id]
  );

  // Map para acumular el gasto por categoría en una sola pasada
  const costByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses ?? []) {
      totals.set(e.category, (totals.get(e.category) ?? 0) + Number(e.amount));
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  if (isLoading) return <main className="p-6 text-sm text-ink-muted">{t("loading")}</main>;

  if (isError || !project) {
    return (
      <main className="flex flex-col items-center justify-center gap-2 p-12 text-center">
        <p className="text-sm text-ink-muted">{t("notFound")}</p>
        <Link href="/projects" className="text-sm text-accent hover:underline">
          {t("back")}
        </Link>
      </main>
    );
  }

  const expected = expectedProgress(project.startDate, project.estimatedEndDate);
  const daysLeft = daysUntil(project.estimatedEndDate);
  const latestDelay = predictions?.find((p) => p.type === "DELAY_RISK");
  const latestCost = predictions?.find((p) => p.type === "COST_OVERRUN_RISK");
  const totalExecuted = costByCategory.reduce((sum, [, amount]) => sum + amount, 0);
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });

  const openActivityModal = () => {
    reset({ name: "", progressPercentage: project.progressPercentage, observations: "" });
    setActivityError(null);
    setActivityOpen(true);
  };

  const onActivitySubmit = async (values: ActivityFormValues) => {
    if (!user) return;
    setActivityError(null);
    try {
      await createActivity.mutateAsync({
        projectId: id,
        date: new Date().toISOString(),
        name: values.name,
        progressPercentage: values.progressPercentage,
        responsibleId: user.id,
        observations: values.observations || undefined,
      });
      setActivityOpen(false);
    } catch {
      setActivityError(t("activityForm.error"));
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append("projectId", id);
    formData.append("description", description);
    formData.append("file", file);
    await uploadEvidence.mutateAsync(formData);
    setDescription("");
    setFile(null);
    setEvidenceOpen(false);
  };

  const renderActivity = (a: Activity) => (
    <li key={a.id} className="flex items-start justify-between gap-3 rounded-lg bg-surface-2 p-3">
      <div>
        <p className="text-sm font-medium">{a.name}</p>
        <p className="text-xs text-ink-muted">
          {formatDate(a.date)} · {a.responsible?.name}
        </p>
        {a.observations && <p className="mt-1 text-xs text-ink-muted">{a.observations}</p>}
      </div>
      <span className="font-mono-data text-sm font-medium">{a.progressPercentage}%</span>
    </li>
  );

  const renderRisk = (label: string, p?: Prediction) => {
    const level = p ? asLevel(p.resultJson.level) : null;
    const source = p?.resultJson.source ?? "";
    return (
      <div className="rounded-lg bg-surface-2 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          {level && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_CLASS[level]}`}>
              {t(`level.${level}`)}
            </span>
          )}
        </div>
        {p ? (
          <>
            <p className="mt-1 text-xs text-ink-muted">{p.resultJson.reasoning}</p>
            <p className="mt-1 text-[11px] text-ink-muted">
              {SOURCE_KEYS.includes(source) ? t(`source.${source}`) : source} · {formatDate(p.generatedAt)}
            </p>
          </>
        ) : (
          <p className="mt-1 text-xs text-ink-muted">—</p>
        )}
      </div>
    );
  };

  const costBreakdown =
    costByCategory.length === 0 ? (
      <p className="text-sm text-ink-muted">{t("noExpenses")}</p>
    ) : (
      <ul className="space-y-3">
        {costByCategory.map(([category, amount]) => (
          <li key={category}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{t(`categories.${category}`)}</span>
              <span className="font-mono-data">{money(amount)}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${totalExecuted > 0 ? (amount / totalExecuted) * 100 : 0}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    );

  return (
    <>
      <DashboardHeader
        title={project.name}
        subtitle={`${project.municipality} · ${tp(`status.${project.status}`)}`}
      />

      <main className="space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/projects" className="flex w-fit items-center gap-1 text-sm text-ink-muted hover:text-ink">
            <ArrowLeft size={14} /> {t("back")}
          </Link>
          <button
            type="button"
            onClick={openActivityModal}
            className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            <Plus size={15} /> {t("newActivity")}
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-line">
          {TAB_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm transition-colors ${
                tab === key
                  ? "border-accent font-medium text-accent"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {t(`tabs.${key}`)}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="hover-lift rounded-xl border border-line bg-surface p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    {t("physicalProgress")}
                  </p>
                  <p className="font-mono-data text-3xl font-semibold">{project.progressPercentage}%</p>
                  <ProgressBar value={project.progressPercentage} marker={expected} />
                  <p className="mt-2 text-xs text-ink-muted">
                    {t("expectedProgress")}: <span className="font-mono-data">{expected.toFixed(1)}%</span>
                  </p>
                </div>

                <div className="hover-lift rounded-xl border border-line bg-surface p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    {t("financialProgress")}
                  </p>
                  {indicators ? (
                    <>
                      <p
                        className={`font-mono-data text-3xl font-semibold ${
                          indicators.financialVsPhysicalGap > 15 ? "text-critical" : ""
                        }`}
                      >
                        {indicators.executedPercentage}%
                      </p>
                      <ProgressBar
                        value={indicators.executedPercentage}
                        color={indicators.financialVsPhysicalGap > 15 ? "bg-critical" : "bg-success"}
                      />
                      <p className="mt-2 text-xs text-ink-muted">
                        {t("executedOfBudget", {
                          executed: money(indicators.executedExpenses),
                          budget: money(indicators.budget),
                        })}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-ink-muted">{t("loading")}</p>
                  )}
                </div>
              </div>

              <Card title={t("timeline")}>
                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-ink-muted">{t("startDate")}</dt>
                    <dd className="font-mono-data font-medium">{formatDate(project.startDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">{t("endDate")}</dt>
                    <dd className="font-mono-data font-medium">{formatDate(project.estimatedEndDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">{t("daysLeft")}</dt>
                    <dd className={`font-mono-data font-medium ${daysLeft < 0 ? "text-critical" : ""}`}>
                      {daysLeft < 0 ? t("overdue") : `${daysLeft} ${t("daysUnit")}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">{t("responsible")}</dt>
                    <dd className="font-medium">{project.responsible?.name ?? "—"}</dd>
                  </div>
                </dl>
              </Card>

              <Card
                title={t("lastActivities")}
                action={
                  <button onClick={() => setTab("activities")} className="text-xs text-accent hover:underline">
                    {t("seeAll")}
                  </button>
                }
              >
                {activities && activities.length > 0 ? (
                  <ul className="space-y-2">{activities.slice(0, 4).map(renderActivity)}</ul>
                ) : (
                  <p className="text-sm text-ink-muted">{t("noActivities")}</p>
                )}
              </Card>

              <Card
                title={t("recentPhotos")}
                action={
                  <button onClick={() => setTab("evidence")} className="text-xs text-accent hover:underline">
                    {t("seeAll")}
                  </button>
                }
              >
                {evidenceList.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {evidenceList.slice(0, 4).map((e) => (
                      <ImageLightbox
                        key={e.id}
                        src={e.url ?? e.imageUrl ?? ""}
                        alt={e.description ?? ""}
                        thumbClassName="h-28 w-full rounded-lg border border-line"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-muted">{t("noEvidence")}</p>
                )}
              </Card>
            </div>

            <div className="space-y-5">
              <Card title={t("alerts")} icon={<AlertTriangle size={15} className="text-critical" />}>
                {projectAlerts.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-ink-muted">
                    <CheckCircle2 size={15} className="shrink-0 text-success" />
                    {t("noAlerts")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {projectAlerts.map((a) => (
                      <div
                        key={a.id}
                        className={`rounded-r-lg border-l-[3px] bg-surface-2 p-3 ${
                          a.severity === "HIGH"
                            ? "border-l-critical"
                            : a.severity === "MEDIUM"
                            ? "border-l-warning"
                            : "border-l-line"
                        }`}
                      >
                        <p className="text-xs text-ink-muted">{a.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title={t("aiRisk")} icon={<Sparkles size={15} className="text-indigo-500" />}>
                <div className="space-y-2">
                  {!latestDelay && !latestCost && (
                    <p className="text-sm text-ink-muted">{t("noPredictions")}</p>
                  )}
                  {(latestDelay || latestCost) && (
                    <>
                      {renderRisk(t("delayRisk"), latestDelay)}
                      {renderRisk(t("costRisk"), latestCost)}
                    </>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={generatePrediction.isPending}
                    onClick={() => generatePrediction.mutate("RULE_BASED")}
                    className="flex-1 rounded-md border border-line px-2 py-1.5 text-xs hover:bg-surface-2 disabled:opacity-50"
                  >
                    {generatePrediction.isPending ? t("analyzing") : t("runRules")}
                  </button>
                  <button
                    type="button"
                    disabled={generatePrediction.isPending}
                    onClick={() => generatePrediction.mutate("AI_GEMINI")}
                    className="flex-1 rounded-md bg-indigo-600 px-2 py-1.5 text-xs text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {generatePrediction.isPending ? t("analyzing") : t("runAI")}
                  </button>
                </div>
                {generatePrediction.isError && (
                  <p className="mt-2 text-xs text-critical">{t("analysisError")}</p>
                )}
              </Card>

              <Card title={t("costSummary")}>
                {costBreakdown}
                {costByCategory.length > 0 && (
                  <div className="mt-4 flex justify-between border-t border-line pt-3 text-sm font-medium">
                    <span>{t("totalExecuted")}</span>
                    <span className="font-mono-data">
                      {money(indicators?.executedExpenses ?? totalExecuted)}
                    </span>
                  </div>
                )}
              </Card>

              <Card title={t("lowStock")}>
                <p className="mb-3 -mt-2 text-xs text-ink-muted">{t("lowStockHint")}</p>
                {lowStock && lowStock.length > 0 ? (
                  <ul className="space-y-3">
                    {lowStock.slice(0, 5).map((m) => (
                      <li key={m.id}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span>{m.name}</span>
                          <span className="font-mono-data text-critical">
                            {m.stockAvailable}/{m.stockMinimum} {m.unit}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                          <div
                            className="h-full rounded-full bg-critical"
                            style={{
                              width: `${m.stockMinimum > 0 ? Math.min(100, (m.stockAvailable / m.stockMinimum) * 100) : 0}%`,
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-muted">{t("noLowStock")}</p>
                )}
              </Card>
            </div>
          </div>
        )}

        {tab === "activities" && (
          <div>
            {activities && activities.length > 0 ? (
              <ul className="space-y-2">{activities.map(renderActivity)}</ul>
            ) : (
              <p className="text-sm text-ink-muted">{t("noActivities")}</p>
            )}
          </div>
        )}

        {tab === "costs" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {indicators && (
              <Card title={t("financialProgress")}>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-ink-muted">{t("budget")}</dt>
                    <dd className="font-mono-data font-medium">{money(indicators.budget)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">{t("executed")}</dt>
                    <dd className="font-mono-data font-medium">{money(indicators.executedExpenses)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">{t("available")}</dt>
                    <dd className="font-mono-data font-medium">{money(indicators.availableBudget)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">{t("gap")}</dt>
                    <dd
                      className={`font-mono-data font-medium ${
                        indicators.financialVsPhysicalGap > 15 ? "text-critical" : ""
                      }`}
                    >
                      {indicators.financialVsPhysicalGap}%
                    </dd>
                  </div>
                </dl>
              </Card>
            )}
            <Card title={t("costSummary")}>{costBreakdown}</Card>
          </div>
        )}

        {tab === "incidents" && (
          <div className="space-y-2">
            {incidentList.map((i) => {
              const level = asLevel(i.priority);
              return (
                <div key={i.id} className="rounded-lg border border-line bg-surface p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium capitalize">{i.type.replace(/_/g, " ").toLowerCase()}</p>
                    {level && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_CLASS[level]}`}>
                        {t(`level.${level}`)}
                      </span>
                    )}
                  </div>
                  <p className="text-ink-muted">{i.description}</p>
                  {i.date && <p className="mt-1 text-xs text-ink-muted">{formatDate(i.date)}</p>}
                </div>
              );
            })}
            {incidentList.length === 0 && <p className="text-sm text-ink-muted">{t("incidentsEmpty")}</p>}
          </div>
        )}

        {tab === "evidence" && (
          <div className="space-y-3">
            <button
              onClick={() => setEvidenceOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              <Camera size={14} /> {t("attachEvidence")}
            </button>
            {evidenceList.length === 0 && <p className="text-sm text-ink-muted">{t("noEvidence")}</p>}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {evidenceList.map((e) => (
                <ImageLightbox
                  key={e.id}
                  src={e.url ?? e.imageUrl ?? ""}
                  alt={e.description ?? ""}
                  thumbClassName="h-28 w-full rounded-lg border border-line"
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <Modal open={activityOpen} onClose={() => setActivityOpen(false)} title={t("activityForm.title")}>
        <form onSubmit={handleSubmit(onActivitySubmit)} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">{t("activityForm.name")}</label>
            <input
              {...register("name")}
              placeholder={t("activityForm.namePlaceholder")}
              className={fieldClass}
            />
            {errors.name && <p className="mt-1 text-xs text-critical">{t("activityForm.invalid")}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("activityForm.progress")}</label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              {...register("progressPercentage", { valueAsNumber: true })}
              className={fieldClass}
            />
            <p className="mt-1 text-xs text-ink-muted">
              {t("activityForm.progressHint", { current: project.progressPercentage })}
            </p>
            {errors.progressPercentage && (
              <p className="mt-1 text-xs text-critical">{t("activityForm.invalid")}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("activityForm.observations")}</label>
            <textarea {...register("observations")} rows={3} className={fieldClass} />
          </div>
          {activityError && <p className="text-sm text-critical">{activityError}</p>}
          <button
            type="submit"
            disabled={createActivity.isPending}
            className="w-full rounded-md bg-accent py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createActivity.isPending ? t("activityForm.saving") : t("activityForm.submit")}
          </button>
        </form>
      </Modal>

      <Modal open={evidenceOpen} onClose={() => setEvidenceOpen(false)} title={t("evidenceForm.title")}>
        <form onSubmit={handleUpload} className="space-y-3">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("evidenceForm.description")}
            className={fieldClass}
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
            {uploadEvidence.isPending ? t("evidenceForm.uploading") : t("evidenceForm.submit")}
          </button>
        </form>
      </Modal>
    </>
  );
}