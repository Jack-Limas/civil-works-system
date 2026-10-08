"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowUpFromLine, Lightbulb, PackageMinus, Search } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Modal } from "@/components/ui/modal";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { fieldClass } from "@/components/ui/form";
import { MaterialStatusBadge } from "./material-status";
import { MovementForm } from "./movement-form";
import { useMaterials, useMovements } from "@/lib/materials-service";
import { useAuthStore } from "@/store/auth.store";
import type { InventoryMaterial } from "@/types/inventory";

const SEARCH_DEBOUNCE_MS = 250;

/**
 * Resident view: no costs or values, one big action ("record consumption",
 * reachable in two taps), a searchable stock list and their own recent movements.
 */
export function ResidentInventory() {
  const t = useTranslations("inventory");
  const format = useFormatter();
  const userId = useAuthStore((s) => s.user?.id);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sheet, setSheet] = useState<{ material: InventoryMaterial | null } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useMaterials({ search: debounced || undefined, sort: "name", limit: 200 });
  const { data: recent, isLoading: recentLoading } = useMovements({ registeredById: userId, limit: 5 }, !!userId);
  const materials = data?.data ?? [];
  const qty = (v: number) => format.number(v, { maximumFractionDigits: 2 });

  return (
    <>
      <DashboardHeader title={t("title")} subtitle={t("residentSubtitle")} />

      <main className="mx-auto w-full max-w-2xl space-y-5 p-4 sm:p-6">
        <Reveal className="space-y-5">
          <RevealItem>
            <button
              type="button"
              onClick={() => setSheet({ material: null })}
              className="flex min-h-20 w-full items-center gap-4 rounded-2xl bg-accent px-5 text-left text-white shadow-lg shadow-accent/20 transition-transform active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20" aria-hidden>
                <PackageMinus size={26} />
              </span>
              <span>
                <span className="block text-lg font-semibold">{t("registerConsumption")}</span>
                <span className="block text-sm text-white/85">{t("movement.outHint")}</span>
              </span>
            </button>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
              <Lightbulb size={13} aria-hidden /> {t("resident.quickTip")}
            </p>
          </RevealItem>

          <RevealItem>
            <section>
              <h2 className="mb-2 text-sm font-semibold text-ink">{t("resident.recentTitle")}</h2>
              {recentLoading && <div className="h-16 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />}
              {!recentLoading && (recent?.data.length ?? 0) === 0 && (
                <p className="rounded-xl border border-dashed border-line bg-surface p-4 text-sm text-ink-muted">{t("resident.recentEmpty")}</p>
              )}
              <ul className={`divide-y divide-line overflow-hidden rounded-xl bg-surface ${recent?.data.length ? "border border-line" : ""}`}>
                {recent?.data.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${m.type === "OUT" ? "bg-accent/15 text-accent" : "bg-success/15 text-success"}`} aria-hidden>
                      <ArrowUpFromLine size={16} className={m.type === "IN" ? "rotate-180" : ""} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{m.material.name}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {m.project?.name ?? t("ledger.noProject")} · {format.dateTime(new Date(m.date), { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <span className={`shrink-0 font-mono-data text-sm font-semibold ${m.type === "OUT" ? "text-accent" : "text-success"}`}>
                      {m.type === "OUT" ? "−" : "+"}
                      {qty(m.quantity)} {m.material.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </RevealItem>

          <RevealItem>
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-ink">{t("resident.stockTitle")}</h2>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("resident.searchPlaceholder")}
                  aria-label={t("resident.searchPlaceholder")}
                  className={`${fieldClass} min-h-12 bg-surface pl-10`}
                />
              </div>
              {isLoading && (
                <div className="space-y-2" aria-busy="true">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
                  ))}
                </div>
              )}
              {!isLoading && materials.length === 0 && (
                <p className="rounded-xl border border-dashed border-line bg-surface p-4 text-center text-sm text-ink-muted">{t("list.empty")}</p>
              )}
              <ul className="space-y-2">
                {materials.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setSheet({ material: m })}
                      disabled={m.stockAvailable <= 0}
                      className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-accent/50 disabled:opacity-60"
                      aria-label={`${t("registerConsumption")}: ${m.name}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">{m.name}</p>
                        <p className="font-mono-data text-sm text-ink-muted">
                          {qty(m.stockAvailable)} {m.unit}
                        </p>
                      </div>
                      <MaterialStatusBadge status={m.status} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </RevealItem>
        </Reveal>
      </main>

      <Modal open={sheet !== null} onClose={() => setSheet(null)} title={t("movement.consumptionTitle")}>
        {sheet && (
          <MovementForm key={sheet.material?.id ?? "none"} mode="resident" defaultMaterial={sheet.material} onDone={() => setSheet(null)} />
        )}
      </Modal>
    </>
  );
}
