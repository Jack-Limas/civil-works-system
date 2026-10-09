"use client";

import { useTranslations } from "next-intl";
import type { WorkerStatus } from "@/lib/workers-service";

export function WorkerStatusBadge({ status }: { status: WorkerStatus }) {
  const t = useTranslations("workers.statuses");
  const tone = status === "ACTIVE" ? "bg-success/15 text-success" : "bg-surface-2 text-ink-muted";
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "ACTIVE" ? "bg-success" : "bg-ink-muted"}`} aria-hidden />
      {t(status)}
    </span>
  );
}
