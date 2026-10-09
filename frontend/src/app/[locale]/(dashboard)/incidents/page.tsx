"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { AdminIncidents } from "@/components/incidents/admin-incidents";
import { ResidentIncidents } from "@/components/incidents/resident-incidents";
import { IncidentDetailView } from "@/components/incidents/incident-detail";
import { IncidentForm } from "@/components/incidents/incident-form";
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

/** The open incident lives in the URL (?incident=id) so alerts and projects can deep-link to it. */
function IncidentsScreen() {
  const t = useTranslations("incidents");
  const router = useRouter();
  const selectedId = useSearchParams().get("incident");
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [reporting, setReporting] = useState(false);

  const open = (id: string) => router.replace({ pathname: "/incidents", query: { incident: id } }, { scroll: false });
  const close = () => router.replace("/incidents", { scroll: false });

  if (isLoading || !user) return <Skeleton />;

  return (
    <>
      {user.role === "ADMIN" ? (
        <AdminIncidents onOpen={open} onReport={() => setReporting(true)} />
      ) : (
        <ResidentIncidents onOpen={open} onReport={() => setReporting(true)} />
      )}

      <Modal open={reporting} onClose={() => setReporting(false)} title={t("form.title")} size="lg">
        {reporting && (
          <IncidentForm
            onCancel={() => setReporting(false)}
            onDone={(incident) => {
              setReporting(false);
              open(incident.id);
            }}
          />
        )}
      </Modal>

      <Modal open={!!selectedId} onClose={close} title={t("detail.title")} size="lg">
        {selectedId && <IncidentDetailView key={selectedId} id={selectedId} />}
      </Modal>
    </>
  );
}

/** Incidents (CSR): admin control panel or the resident's quick reporting view. */
export default function IncidentsPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <IncidentsScreen />
    </Suspense>
  );
}
