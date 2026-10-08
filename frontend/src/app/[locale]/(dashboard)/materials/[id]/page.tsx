"use client";

import { useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowLeft, ArrowLeftRight, Info, PackageX, Pencil } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Modal } from "@/components/ui/modal";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { CoverageMeter, MaterialStatusBadge } from "@/components/inventory/material-status";
import { ConsumptionByProjectChart, StockChart } from "@/components/inventory/material-charts";
import { MaterialFormModal } from "@/components/inventory/material-form-modal";
import { MovementForm } from "@/components/inventory/movement-form";
import { MovementsLedger } from "@/components/inventory/movements-ledger";
import { Link } from "@/i18n/navigation";
import { useMaterialDetail } from "@/lib/materials-service";
import { useFormatCOP } from "@/lib/format";
import { useAuthStore } from "@/store/auth.store";

const RANGES = [30, 90] as const;

function Kpi({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <div className="mt-1 font-mono-data text-xl font-semibold text-ink">{children}</div>
      {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

/** Material detail (CSR): stock history, consumption per project and its ledger. */
export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("inventory");
  const format = useFormatter();
  const formatCOP = useFormatCOP();
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");

  const [days, setDays] = useState<30 | 90>(30);
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);
  const { data, isLoading, isError, isFetching } = useMaterialDetail(id, days);
  const qty = (v: number) => format.number(v, { maximumFractionDigits: 2 });

  const back = (
    <Link href="/materials" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-accent">
      <ArrowLeft size={15} aria-hidden /> {t("detail.back")}
    </Link>
  );

  if (isLoading) {
    return (
      <main className="space-y-4 p-4 sm:p-6" aria-busy="true">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="p-4 sm:p-6">
        {back}
        <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-surface p-10 text-center">
          <PackageX size={32} className="text-ink-muted" aria-hidden />
          <p className="text-sm text-ink-muted">{t("detail.notFound")}</p>
        </div>
      </main>
    );
  }

  const m = data.material;

  return (
    <>
      <DashboardHeader title={m.name} subtitle={m.category ? t(`categories.${m.category}`) : t("list.noCategory")} />
      <main className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {back}
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={secondaryButtonClass} onClick={() => setEditing(true)}>
                <Pencil size={15} aria-hidden /> {t("editMaterial")}
              </button>
              <button type="button" className={primaryButtonClass} onClick={() => setMoving(true)}>
                <ArrowLeftRight size={15} aria-hidden /> {t("registerMovement")}
              </button>
            </div>
          )}
        </div>

        <Reveal className="space-y-5">
          <RevealItem>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
              <Kpi label={t("fields.stock")} hint={m.unit}>
                <AnimatedNumber value={m.stockAvailable} format={qty} />
              </Kpi>
              <Kpi label={t("fields.minimum")} hint={m.unit}>
                {qty(m.stockMinimum)}
              </Kpi>
              <div className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-ink-muted">{t("fields.coverage")}</p>
                  <MaterialStatusBadge status={m.status} />
                </div>
                <div className="mt-2">
                  <CoverageMeter days={m.coverageDays} status={m.status} />
                </div>
              </div>
              <Kpi label={t("fields.need")} hint={`${t("fields.dailyConsumption")}: ${qty(m.dailyConsumption)} ${m.unit}`}>
                {qty(m.estimatedNeed)}
              </Kpi>
              <Kpi label={t("fields.suggested")} hint={m.unit}>
                <span className={m.suggestedPurchase > 0 ? "text-warning" : undefined}>{qty(m.suggestedPurchase)}</span>
              </Kpi>
              {isAdmin && (
                <Kpi label={t("fields.value")} hint={m.lastUnitCost != null ? `${t("fields.lastCost")}: ${formatCOP(m.lastUnitCost)}` : undefined}>
                  {m.estimatedValue != null ? <AnimatedNumber value={m.estimatedValue} format={(v) => formatCOP(v)} /> : "—"}
                </Kpi>
              )}
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-muted">
              <Info size={13} className="mt-0.5 shrink-0" aria-hidden /> {t("detail.explain")}
            </p>
          </RevealItem>

          <RevealItem>
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
              <section className={`rounded-xl border border-line bg-surface p-5 transition-opacity ${isFetching ? "opacity-70" : ""}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-ink">{t("detail.stockChart")}</h2>
                  <div role="radiogroup" aria-label={t("detail.stockChart")} className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
                    {RANGES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={days === r}
                        onClick={() => setDays(r)}
                        className={`min-h-9 rounded-md px-3 text-xs font-medium transition-colors ${
                          days === r ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
                        }`}
                      >
                        {t(`detail.range.${r}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <StockChart series={data.series} minimum={m.stockMinimum} unit={m.unit} />
              </section>

              <section className="rounded-xl border border-line bg-surface p-5">
                <h2 className="mb-3 text-base font-semibold text-ink">{t("detail.byProject")}</h2>
                {data.consumptionByProject.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-ink-muted">{t("detail.byProjectEmpty")}</p>
                ) : (
                  <ConsumptionByProjectChart data={data.consumptionByProject} unit={m.unit} />
                )}
                {!!data.unassignedConsumption && (
                  <p className="mt-2 text-xs text-ink-muted">
                    {t("detail.unassigned", { quantity: qty(data.unassignedConsumption), unit: m.unit })}
                  </p>
                )}
              </section>
            </div>
          </RevealItem>

          <RevealItem>
            <MovementsLedger fixedMaterialId={m.id} />
          </RevealItem>
        </Reveal>
      </main>

      {isAdmin && (
        <>
          <MaterialFormModal open={editing} onClose={() => setEditing(false)} material={m} isAdmin />
          <Modal open={moving} onClose={() => setMoving(false)} title={t("movement.title")} size="lg">
            {moving && <MovementForm mode="admin" defaultType="IN" defaultMaterial={m} onDone={() => setMoving(false)} />}
          </Modal>
        </>
      )}
    </>
  );
}
