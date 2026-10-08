"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Camera } from "lucide-react";
import { useEvidenceList } from "@/lib/evidence-service";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Reveal, RevealItem } from "@/components/ui/reveal";
import { Link } from "@/i18n/navigation";

export default function EvidencePage() {
  const t = useTranslations("evidence");
  const format = useFormatter();
  const { data, isLoading } = useEvidenceList(undefined, 60);
  const items = data?.data ?? [];

  return (
    <>
      <DashboardHeader title={t("title")} subtitle={t("subtitle")} />
      <main className="p-4 sm:p-6">
        {isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
            ))}
          </div>
        )}
        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-surface p-10 text-center">
            <Camera size={28} className="text-ink-muted" aria-hidden />
            <p className="text-sm text-ink-muted">{t("empty")}</p>
          </div>
        )}
        <Reveal className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <RevealItem key={item.id}>
              <figure className="overflow-hidden rounded-xl border border-line bg-surface">
                <ImageLightbox
                  src={item.imageUrl}
                  alt={item.description ?? item.project?.name ?? ""}
                  thumbClassName="h-40 w-full"
                />
                <figcaption className="p-3">
                  {item.project && (
                    <Link href={`/projects/${item.project.id}`} className="text-sm font-medium text-ink hover:text-accent">
                      {item.project.name}
                    </Link>
                  )}
                  <p className="line-clamp-2 text-xs text-ink-muted">{item.description ?? t("noDescription")}</p>
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {format.dateTime(new Date(item.date), { dateStyle: "medium" })}
                    {item.uploadedBy && ` · ${item.uploadedBy.name}`}
                  </p>
                </figcaption>
              </figure>
            </RevealItem>
          ))}
        </Reveal>
      </main>
    </>
  );
}
