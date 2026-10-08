"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { AdminDailyLog } from "@/components/reports/admin-daily-log";
import { ResidentDailyLog } from "@/components/reports/resident-daily-log";
import { FieldReportDetail } from "@/components/reports/field-report-detail";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/store/auth.store";

function Skeleton() {
  return (
    <main className="space-y-4 p-4 sm:p-6" aria-busy="true">
      <div className="h-24 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
      <div className="h-64 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
    </main>
  );
}

/** The open log lives in the URL (?report=id) so the reports center can deep-link to it. */
function DailyLogScreen() {
  const t = useTranslations("fieldReports");
  const router = useRouter();
  const selectedId = useSearchParams().get("report");
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  const open = (id: string) => router.replace({ pathname: "/reports/daily", query: { report: id } }, { scroll: false });
  const close = () => router.replace("/reports/daily", { scroll: false });

  if (isLoading || !user) return <Skeleton />;

  return (
    <>
      {user.role === "ADMIN" ? <AdminDailyLog onOpen={open} /> : <ResidentDailyLog onOpen={open} />}
      <Modal open={!!selectedId} onClose={close} title={t("title")} size="lg">
        {selectedId && <FieldReportDetail key={selectedId} id={selectedId} onClose={close} />}
      </Modal>
    </>
  );
}

/** Daily site log (CSR): admin review queue or the resident's own log. */
export default function DailyLogPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <DailyLogScreen />
    </Suspense>
  );
}
