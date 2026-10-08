"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Logo } from "@/components/ui/logo";

/**
 * Header that only appears on paper / PDF: logo, report title, project,
 * period and who generated it. Screen layout is unaffected (hidden print:block).
 */
export function ReportPrintHeader({
  title,
  projectName,
  period,
  generatedBy,
  generatedAt,
}: {
  title: string;
  projectName?: string;
  period?: { from: string; to: string };
  generatedBy?: string;
  generatedAt?: string;
}) {
  const t = useTranslations("reports.printHeader");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const day = (key: string) => format.dateTime(new Date(`${key}T12:00:00Z`), { dateStyle: "medium", timeZone: "UTC" });

  return (
    <div className="mb-6 hidden border-b-2 border-ink pb-4 print:block">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <div>
            <p className="text-lg font-bold text-ink">{tCommon("appShortName")}</p>
            <p className="text-xs text-ink-muted">{tCommon("appTagline")}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-base font-bold text-ink">{title}</p>
          <p className="text-xs text-ink-muted">
            {t("project")}: {projectName ?? t("allProjects")}
          </p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-4 text-xs">
        {period && (
          <div>
            <dt className="text-ink-muted">{t("period")}</dt>
            <dd className="font-medium text-ink">
              {day(period.from)} – {day(period.to)}
            </dd>
          </div>
        )}
        {generatedBy && (
          <div>
            <dt className="text-ink-muted">{t("generatedBy")}</dt>
            <dd className="font-medium text-ink">{generatedBy}</dd>
          </div>
        )}
        {generatedAt && (
          <div>
            <dt className="text-ink-muted">{t("generatedAt")}</dt>
            <dd className="font-medium text-ink">{format.dateTime(new Date(generatedAt), { dateStyle: "medium", timeStyle: "short" })}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
