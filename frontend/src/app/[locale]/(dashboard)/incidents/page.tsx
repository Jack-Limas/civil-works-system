"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFormatter, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Field, fieldClass, primaryButtonClass } from "@/components/ui/form";
import { Reveal } from "@/components/ui/reveal";
import { ProjectSelect } from "@/components/projects/project-select";
import {
  useIncidents,
  useCreateIncident,
  useUpdateIncident,
  Incident,
  IncidentPriority,
  IncidentStatus,
  INCIDENT_TYPES,
  INCIDENT_PRIORITIES,
  INCIDENT_STATUSES,
} from "@/lib/incidents-service";
import { useAuthStore } from "@/store/auth.store";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";

const schema = z.object({
  projectId: z.string().uuid(),
  type: z.enum(INCIDENT_TYPES),
  priority: z.enum(INCIDENT_PRIORITIES),
  description: z.string().min(5),
});

type FormValues = z.infer<typeof schema>;

const PRIORITY_CLASS: Record<IncidentPriority, string> = {
  HIGH: "bg-critical/15 text-critical",
  MEDIUM: "bg-warning/15 text-warning",
  LOW: "bg-surface-2 text-ink-muted border border-line",
};

const STATUS_CLASS: Record<IncidentStatus, string> = {
  OPEN: "text-critical",
  IN_REVIEW: "text-warning",
  RESOLVED: "text-success",
};

export default function IncidentsPage() {
  const t = useTranslations("incidents");
  const tv = useTranslations("validation");
  const tCommon = useTranslations("common");
  const tPicker = useTranslations("projectPicker");
  const format = useFormatter();
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");
  const errorMessage = useApiErrorMessage();
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading } = useIncidents({ limit: 100 });
  const createIncident = useCreateIncident();
  const updateIncident = useUpdateIncident();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { projectId: "", type: "OTHER", priority: "MEDIUM", description: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createIncident.mutateAsync(values);
      toast.success(t("created"));
      reset();
      setModalOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  function changeStatus(id: string, status: IncidentStatus) {
    updateIncident.mutate(
      { id, input: { status } },
      {
        onSuccess: () => toast.success(t("updated")),
        onError: (error) => toast.error(errorMessage(error)),
      }
    );
  }

  return (
    <>
      <DashboardHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <button type="button" onClick={() => setModalOpen(true)} className={primaryButtonClass}>
            <Plus size={15} aria-hidden /> {t("newIncident")}
          </button>
        }
      />

      <main className="p-4 sm:p-6">
        <Reveal>
          <DataTable<Incident>
            rows={data?.data ?? []}
            isLoading={isLoading}
            rowKey={(i) => i.id}
            emptyMessage={t("empty")}
            columns={[
              { id: "type", header: t("type"), accessor: (i) => t(`types.${i.type}`), primary: true },
              { id: "project", header: t("project"), accessor: (i) => i.project?.name ?? tCommon("noData") },
              {
                id: "priority",
                header: t("priority"),
                accessor: (i) => (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_CLASS[i.priority]}`}>
                    {t(`priorities.${i.priority}`)}
                  </span>
                ),
              },
              {
                id: "status",
                header: t("status"),
                accessor: (i) =>
                  isAdmin ? (
                    <select
                      aria-label={t("status")}
                      value={i.status}
                      onChange={(e) => changeStatus(i.id, e.target.value as IncidentStatus)}
                      disabled={updateIncident.isPending}
                      className={`rounded-md border border-line bg-surface-2 px-2 py-1 text-xs font-medium ${STATUS_CLASS[i.status]}`}
                    >
                      {INCIDENT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {t(`statuses.${s}`)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`text-xs font-medium ${STATUS_CLASS[i.status]}`}>{t(`statuses.${i.status}`)}</span>
                  ),
              },
              {
                id: "date",
                header: t("date"),
                accessor: (i) => format.dateTime(new Date(i.date), { dateStyle: "medium" }),
              },
              {
                id: "description",
                header: t("description"),
                accessor: (i) => <span className="line-clamp-2 whitespace-normal text-ink-muted">{i.description}</span>,
              },
            ]}
          />
        </Reveal>
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("newIncident")}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <Field id="incident-project" label={tPicker("label")} error={errors.projectId && tv("uuid")}>
            <ProjectSelect id="incident-project" {...register("projectId")} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field id="incident-type" label={t("type")}>
              <select id="incident-type" {...register("type")} className={fieldClass}>
                {INCIDENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`types.${type}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="incident-priority" label={t("priority")}>
              <select id="incident-priority" {...register("priority")} className={fieldClass}>
                {INCIDENT_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {t(`priorities.${p}`)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field id="incident-description" label={t("description")} error={errors.description && tv("minChars", { min: 5 })}>
            <textarea
              id="incident-description"
              rows={3}
              {...register("description")}
              placeholder={t("descriptionPlaceholder")}
              className={fieldClass}
            />
          </Field>
          <button type="submit" disabled={createIncident.isPending} className={`${primaryButtonClass} w-full`}>
            {createIncident.isPending ? tCommon("saving") : t("create")}
          </button>
        </form>
      </Modal>
    </>
  );
}
