"use client";

import { useTranslations } from "next-intl";
import { ArrowLeftRight } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AdminOnly } from "@/components/auth/admin-only";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { InventoryTabs } from "@/components/inventory/inventory-tabs";
import { MovementForm } from "@/components/inventory/movement-form";
import { MovementsLedger } from "@/components/inventory/movements-ledger";

/** Admin movements (CSR): registration form next to the append-only ledger. */
function MovementsScreen() {
  const t = useTranslations("inventory");

  return (
    <>
      <DashboardHeader title={t("tabs.movements")} subtitle={t("ledger.subtitle")} />
      <main className="space-y-5 p-4 sm:p-6">
        <InventoryTabs />
        <Reveal className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_1fr] 2xl:grid-cols-[400px_1fr]">
          <RevealItem>
            <section className="rounded-xl border border-line bg-surface p-5 xl:sticky xl:top-4">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink">
                <ArrowLeftRight size={17} className="text-accent" aria-hidden /> {t("movement.title")}
              </h2>
              <MovementForm mode="admin" defaultType="IN" />
            </section>
          </RevealItem>
          <RevealItem className="min-w-0">
            <MovementsLedger />
          </RevealItem>
        </Reveal>
      </main>
    </>
  );
}

export default function MovementsPage() {
  return (
    <AdminOnly>
      <MovementsScreen />
    </AdminOnly>
  );
}
