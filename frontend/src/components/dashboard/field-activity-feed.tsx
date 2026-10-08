"use client";

import { nameInitial } from "@/lib/initials";
import { useFormatter, useTranslations } from "next-intl";
import { useEvidenceList } from "@/lib/evidence-service";
import { Link } from "@/i18n/navigation";
import { ImageLightbox } from "@/components/ui/image-lightbox";

export function FieldActivityFeed() {
  const t = useTranslations("dashboard.feed");
  const format = useFormatter();
  const { data, isLoading } = useEvidenceList(undefined, 3);
  const items = data?.data ?? [];

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">{t("title")}</h2>
        <Link href="/evidence" className="shrink-0 text-xs text-accent hover:underline">
          {t("seeAll")}
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-4" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-surface-2 motion-reduce:animate-none" />
              <div className="h-24 flex-1 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      )}

      <ul className="space-y-4">
        {items.map((item) => {
          const userName = item.uploadedBy?.name ?? t("unknownUser");
          return (
            <li key={item.id} className="flex gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-medium text-accent"
                aria-hidden
              >
                {nameInitial(userName)}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-ink">
                  {t.rich("entry", {
                    user: userName,
                    project: item.project?.name ?? t("unknownProject"),
                    b: (chunks) => <span className="font-medium">{chunks}</span>,
                  })}
                </p>
                <p className="mb-2 text-xs text-ink-muted">
                  {format.dateTime(new Date(item.date), { day: "numeric", month: "short" })}
                </p>
                {item.imageUrl && (
                  <ImageLightbox
                    src={item.imageUrl}
                    alt={item.description ?? item.project?.name ?? ""}
                    thumbClassName="h-24 w-32 rounded-lg border border-line object-cover"
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {!isLoading && items.length === 0 && <p className="text-sm text-ink-muted">{t("empty")}</p>}
    </section>
  );
}
