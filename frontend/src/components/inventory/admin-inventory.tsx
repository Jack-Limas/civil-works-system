"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertOctagon,
  ArrowLeftRight,
  Boxes,
  CircleSlash,
  Download,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DataTable } from "@/components/ui/data-table";
import { KpiCard } from "@/components/ui/kpi-card";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Modal } from "@/components/ui/modal";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { Link } from "@/i18n/navigation";
import { InventoryTabs } from "./inventory-tabs";
import { CoverageMeter, MaterialStatusBadge, STATUS_TONE } from "./material-status";
import { MaterialFormModal } from "./material-form-modal";
import { MovementForm } from "./movement-form";
import { useInventorySummary, useMaterials } from "@/lib/materials-service";
import { useFormatCOP } from "@/lib/format";
import { exportCsv } from "@/lib/export-csv";
import {
  MATERIAL_CATEGORIES,
  MATERIAL_STATUSES,
  type InventoryMaterial,
  type MaterialFilters,
  type MovementType,
} from "@/types/inventory";

const SEARCH_DEBOUNCE_MS = 250;

export function AdminInventory() {
  const t = useTranslations("inventory");
  const format = useFormatter();
  const formatCOP = useFormatCOP();
  const reduceMotion = useReducedMotion();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<MaterialFilters>({ sort: "status", limit: 200 });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryMaterial | null>(null);
  const [movement, setMovement] = useState<{ type: MovementType; material: InventoryMaterial | null } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => ({ ...f, search: search.trim() || undefined })), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: summary, isLoading: summaryLoading } = useInventorySummary();
  const { data, isLoading, isFetching } = useMaterials(filters);
  const materials = data?.data ?? [];

  const n = useCallback((v: number) => format.number(Math.round(v)), [format]);
  const qty = (v: number) => format.number(v, { maximumFractionDigits: 2 });
  const money = useCallback((v: number) => formatCOP(v, { compact: true }), [formatCOP]);

  function handleExport() {
    exportCsv(
      `obraiq-inventario-${new Date().toISOString().slice(0, 10)}`,
      [
        t("fields.name"),
        t("fields.category"),
        t("fields.unit"),
        t("fields.stock"),
        t("fields.minimum"),
        t("fields.status"),
        t("fields.coverage"),
        t("fields.dailyConsumption"),
        t("fields.need"),
        t("fields.suggested"),
        `${t("fields.lastCost")} (COP)`,
        `${t("fields.value")} (COP)`,
      ],
      materials.map((m) => [
        m.name,
        m.category ? t(`categories.${m.category}`) : t("list.noCategory"),
        m.unit,
        m.stockAvailable,
        m.stockMinimum,
        t(`status.${m.status}`),
        m.coverageDays,
        m.dailyConsumption,
        m.estimatedNeed,
        m.suggestedPurchase,
        m.lastUnitCost ?? null,
        m.estimatedValue ?? null,
      ])
    );
  }

  const critical = summary?.criticalMaterials ?? [];

  return (
    <>
      <DashboardHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <button type="button" onClick={() => { setEditing(null); setFormOpen(true); }} className={secondaryButtonClass}>
              <Plus size={15} aria-hidden /> {t("newMaterial")}
            </button>
            <button type="button" onClick={() => setMovement({ type: "IN", material: null })} className={primaryButtonClass}>
              <ArrowLeftRight size={15} aria-hidden /> {t("registerMovement")}
            </button>
          </>
        }
      />

      <main className="space-y-5 p-4 sm:p-6">
        <InventoryTabs />

        <Reveal className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <RevealItem>
              <KpiCard
                label={t("kpis.materials")}
                icon={Boxes}
                loading={summaryLoading}
                value={<AnimatedNumber value={summary?.totalMaterials ?? 0} format={n} />}
                hint={t("kpis.materialsHint", { count: materials.filter((m) => !m.category).length })}
              />
            </RevealItem>
            <RevealItem>
              <KpiCard
                label={t("kpis.out")}
                icon={CircleSlash}
                tone="critical"
                emphasize={(summary?.out ?? 0) > 0}
                loading={summaryLoading}
                value={<AnimatedNumber value={summary?.out ?? 0} format={n} />}
                hint={t("kpis.outHint")}
              />
            </RevealItem>
            <RevealItem>
              <KpiCard
                label={t("kpis.critical")}
                icon={AlertOctagon}
                tone="critical"
                emphasize={(summary?.critical ?? 0) > 0}
                loading={summaryLoading}
                value={<AnimatedNumber value={summary?.critical ?? 0} format={n} />}
                hint={t("kpis.criticalHint")}
              />
            </RevealItem>
            <RevealItem>
              <KpiCard
                label={t("kpis.warning")}
                icon={TriangleAlert}
                tone="warning"
                emphasize={(summary?.warning ?? 0) > 0}
                loading={summaryLoading}
                value={<AnimatedNumber value={summary?.warning ?? 0} format={n} />}
                hint={t("kpis.warningHint")}
              />
            </RevealItem>
            <RevealItem>
              <KpiCard
                label={t("kpis.value")}
                labelAddon={<InfoTooltip text={t("kpis.valueTooltip")} label={t("kpis.value")} />}
                icon={Wallet}
                tone="success"
                loading={summaryLoading}
                value={<AnimatedNumber value={summary?.estimatedValue ?? 0} format={money} />}
                hint={t("kpis.valueHint", { count: summary?.valuedMaterials ?? 0 })}
              />
            </RevealItem>
            <RevealItem>
              <KpiCard
                label={t("kpis.movements")}
                icon={ArrowLeftRight}
                tone="ai"
                loading={summaryLoading}
                value={<AnimatedNumber value={summary?.movementsThisMonth ?? 0} format={n} />}
                hint={t("kpis.movementsHint")}
              />
            </RevealItem>
          </div>

          <RevealItem>
            <section className="rounded-xl border border-line bg-surface p-5">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                    <AlertOctagon size={17} className="text-critical" aria-hidden /> {t("critical.title")}
                    {critical.length > 0 && (
                      <span className="rounded-full bg-critical px-2 py-0.5 text-xs font-semibold text-white">{critical.length}</span>
                    )}
                  </h2>
                  <p className="text-xs text-ink-muted">{t("critical.subtitle")}</p>
                </div>
              </div>
              {summaryLoading && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-40 animate-pulse rounded-xl bg-surface-2 motion-reduce:animate-none" />
                  ))}
                </div>
              )}
              {!summaryLoading && critical.length === 0 && (
                <p className="rounded-lg bg-success/10 p-4 text-sm text-success">{t("critical.empty")}</p>
              )}
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {critical.slice(0, 6).map((m, index) => {
                  const fill = m.stockMinimum > 0 ? Math.min(100, (m.stockAvailable / m.stockMinimum) * 100) : 0;
                  return (
                    <li key={m.id} className="hover-lift rounded-xl border border-line bg-surface-2 p-4">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <Link href={`/materials/${m.id}`} className="min-w-0 font-semibold text-ink hover:text-accent">
                          <span className="line-clamp-2">{m.name}</span>
                        </Link>
                        <MaterialStatusBadge status={m.status} />
                      </div>
                      <p className="font-mono-data text-xs text-ink-muted">
                        {t("critical.stockOfMin", { stock: qty(m.stockAvailable), min: qty(m.stockMinimum), unit: m.unit })}
                      </p>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface" aria-hidden>
                        <motion.div
                          className={`h-full rounded-full ${STATUS_TONE[m.status].bar}`}
                          initial={reduceMotion ? false : { width: 0 }}
                          animate={{ width: `${fill}%` }}
                          transition={{ duration: 0.6, delay: index * 0.05 }}
                          style={reduceMotion ? { width: `${fill}%` } : undefined}
                        />
                      </div>
                      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <dt className="text-ink-muted">{t("critical.coverage")}</dt>
                          <dd className="font-mono-data font-semibold text-ink">
                            {m.coverageDays === null ? t("noCoverage") : t("coverageDays", { days: qty(m.coverageDays) })}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-ink-muted">{t("critical.need")}</dt>
                          <dd className="font-mono-data font-semibold text-ink">
                            {qty(m.estimatedNeed)} {m.unit}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-ink-muted">{t("critical.suggested")}</dt>
                          <dd className="font-mono-data font-semibold text-accent">
                            {qty(m.suggestedPurchase)} {m.unit}
                          </dd>
                        </div>
                      </dl>
                      <button
                        type="button"
                        onClick={() => setMovement({ type: "IN", material: m })}
                        className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-accent/40 text-xs font-medium text-accent hover:bg-accent/10"
                      >
                        <ShoppingCart size={14} aria-hidden /> {t("critical.buy")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </RevealItem>

          <RevealItem className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-base font-semibold text-ink">{t("list.title")}</h2>
              <button type="button" onClick={handleExport} disabled={materials.length === 0} className={secondaryButtonClass}>
                <Download size={15} aria-hidden /> {t("list.export")}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("list.search")}
                  aria-label={t("list.search")}
                  className={`${fieldClass} bg-surface pl-9`}
                />
              </div>
              <select
                aria-label={t("fields.category")}
                value={filters.category ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, category: (e.target.value || undefined) as MaterialFilters["category"] }))}
                className={`${fieldClass} bg-surface`}
              >
                <option value="">{t("list.allCategories")}</option>
                {MATERIAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`categories.${c}`)}
                  </option>
                ))}
                <option value="NONE">{t("list.noCategory")}</option>
              </select>
              <select
                aria-label={t("fields.status")}
                value={filters.status ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value || undefined) as MaterialFilters["status"] }))}
                className={`${fieldClass} bg-surface`}
              >
                <option value="">{t("list.allStatuses")}</option>
                {MATERIAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`status.${s}`)}
                  </option>
                ))}
              </select>
              <select
                aria-label={t("list.sort.label")}
                value={filters.sort}
                onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as MaterialFilters["sort"] }))}
                className={`${fieldClass} bg-surface`}
              >
                {(["status", "coverage", "name", "stock"] as const).map((s) => (
                  <option key={s} value={s}>
                    {t("list.sort.label")}: {t(`list.sort.${s}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className={isFetching && !isLoading ? "opacity-70 transition-opacity" : ""}>
              <DataTable<InventoryMaterial>
                rows={materials}
                isLoading={isLoading}
                rowKey={(m) => m.id}
                emptyMessage={filters.search || filters.category || filters.status ? t("list.empty") : t("list.emptyAll")}
                emptyAction={
                  <button type="button" onClick={() => { setEditing(null); setFormOpen(true); }} className={primaryButtonClass}>
                    <Plus size={15} aria-hidden /> {t("newMaterial")}
                  </button>
                }
                rowActions={(m) => (
                  <>
                    <button
                      type="button"
                      onClick={() => setMovement({ type: "IN", material: m })}
                      aria-label={`${t("registerMovement")}: ${m.name}`}
                      title={t("registerMovement")}
                      className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-line text-ink-muted hover:bg-surface-2 hover:text-accent"
                    >
                      <ArrowLeftRight size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditing(m); setFormOpen(true); }}
                      aria-label={`${t("editMaterial")}: ${m.name}`}
                      title={t("editMaterial")}
                      className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-line text-ink-muted hover:bg-surface-2 hover:text-ink"
                    >
                      <Pencil size={14} />
                    </button>
                  </>
                )}
                columns={[
                  {
                    id: "material",
                    header: t("fields.material"),
                    primary: true,
                    accessor: (m) => (
                      <Link href={`/materials/${m.id}`} className="group block min-w-0">
                        <span className="block truncate font-medium text-ink group-hover:text-accent">{m.name}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {m.category ? t(`categories.${m.category}`) : t("list.noCategory")}
                        </span>
                      </Link>
                    ),
                  },
                  {
                    id: "stock",
                    header: t("fields.stock"),
                    align: "right",
                    accessor: (m) => (
                      <span className="whitespace-nowrap font-mono-data">
                        <span className="font-semibold text-ink">{qty(m.stockAvailable)}</span>{" "}
                        <span className="text-xs text-ink-muted">
                          / {qty(m.stockMinimum)} {m.unit}
                        </span>
                      </span>
                    ),
                  },
                  { id: "status", header: t("fields.status"), accessor: (m) => <MaterialStatusBadge status={m.status} /> },
                  {
                    id: "coverage",
                    header: t("fields.coverage"),
                    accessor: (m) => <CoverageMeter days={m.coverageDays} status={m.status} compact />,
                  },
                  {
                    id: "last",
                    header: t("fields.lastMovement"),
                    accessor: (m) =>
                      m.lastMovement ? (
                        <span className="whitespace-nowrap text-xs">
                          <span className={m.lastMovement.type === "IN" ? "text-success" : "text-accent"}>
                            {t(`movementType.${m.lastMovement.type}`)}
                          </span>{" "}
                          <span className="text-ink-muted">
                            · {format.dateTime(new Date(m.lastMovement.date), { day: "numeric", month: "short" })}
                          </span>
                        </span>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      ),
                  },
                  {
                    id: "value",
                    header: t("fields.value"),
                    align: "right",
                    accessor: (m) =>
                      m.estimatedValue != null ? (
                        <span className="whitespace-nowrap font-mono-data">{formatCOP(m.estimatedValue, { compact: true })}</span>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      ),
                  },
                ]}
              />
            </div>
          </RevealItem>
        </Reveal>
      </main>

      <MaterialFormModal open={formOpen} onClose={() => setFormOpen(false)} material={editing} isAdmin />

      <Modal open={movement !== null} onClose={() => setMovement(null)} title={t("movement.title")} size="lg">
        {movement && (
          <MovementForm
            key={`${movement.type}-${movement.material?.id ?? "none"}`}
            mode="admin"
            defaultType={movement.type}
            defaultMaterial={movement.material}
            onDone={() => setMovement(null)}
          />
        )}
      </Modal>
    </>
  );
}
