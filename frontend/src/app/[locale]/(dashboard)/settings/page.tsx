"use client";

import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AdminOnly } from "@/components/auth/admin-only";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { secondaryButtonClass } from "@/components/ui/form";
import { SettingsForm } from "@/components/settings/settings-form";
import { useSettings } from "@/lib/settings-service";
import { useApiErrorMessage } from "@/lib/api-error";

function SettingsScreen() {
  const t = useTranslations("settings");
  const tErrors = useTranslations("errors");
  const errorMessage = useApiErrorMessage();
  const { data, isLoading, isError, error, refetch } = useSettings();

  return (
    <>
      <DashboardHeader title={t("title")} subtitle={t("subtitle")} />
      <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        {isLoading && (
          <div className="space-y-4" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
            ))}
          </div>
        )}
        {isError && (
          <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-critical/30 bg-critical/5 p-8 text-center">
            <p className="text-sm text-critical">{errorMessage(error)}</p>
            <button type="button" onClick={() => refetch()} className={secondaryButtonClass}>
              <RefreshCw size={15} aria-hidden /> {tErrors("retry")}
            </button>
          </div>
        )}
        {data && (
          <Reveal>
            <RevealItem>
              {/* New key after each save/reset: the draft restarts from what the server stored */}
              <SettingsForm key={JSON.stringify(data.values)} payload={data} />
            </RevealItem>
          </Reveal>
        )}
      </main>
    </>
  );
}

/** System settings (CSR, admin only). */
export default function SettingsPage() {
  return (
    <AdminOnly>
      <SettingsScreen />
    </AdminOnly>
  );
}
