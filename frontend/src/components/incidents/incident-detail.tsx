"use client";

import { useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CalendarDays, Camera, MapPin, UserRound } from "lucide-react";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { secondaryButtonClass } from "@/components/ui/form";
import { Link } from "@/i18n/navigation";
import { useAddIncidentPhoto, useIncidentDetail } from "@/lib/incidents-service";
import { compressImage } from "@/lib/compress-image";
import { useApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import { IncidentPriorityBadge, IncidentStatusBadge, IncidentTypeIcon, STATUS_TONE } from "./incident-badges";
import { IncidentStatusActions } from "./incident-status-actions";

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Modal body: what happened, photos, resolution and the status history (who and when). */
export function IncidentDetailView({ id }: { id: string }) {
  const t = useTranslations("incidents");
  const tDetail = useTranslations("incidents.detail");
  const tForm = useTranslations("incidents.form");
  const tErrors = useTranslations("errors");
  const format = useFormatter();
  const errorMessage = useApiErrorMessage();
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");
  const { data: incident, isLoading, isError, error } = useIncidentDetail(id);
  const addPhoto = useAddIncidentPhoto();
  const cameraRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const day = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "long", year: "numeric" });
  const moment = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" });

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !incident) return;
    if (!PHOTO_TYPES.includes(file.type)) return toast.error(tForm("photoType"));
    setUploading(true);
    try {
      const { file: compressed } = await compressImage(file);
      if (compressed.size > MAX_PHOTO_BYTES) return toast.error(tErrors("fileTooLarge"));
      await addPhoto.mutateAsync({ incident, file: compressed });
      toast.success(tDetail("photoAdded"));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
        ))}
      </div>
    );
  }
  if (isError || !incident) return <p className="text-sm text-critical">{isError ? errorMessage(error) : tDetail("notFound")}</p>;

  const history = incident.statusChanges;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <IncidentTypeIcon type={incident.type} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-ink">{t(`types.${incident.type}`)}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <IncidentStatusBadge status={incident.status} />
            <IncidentPriorityBadge priority={incident.priority} />
          </div>
        </div>
      </div>

      <p className="whitespace-pre-line text-sm text-ink">{incident.description}</p>

      <ul className="grid grid-cols-1 gap-2 text-sm text-ink-muted sm:grid-cols-2">
        <li className="flex items-center gap-2">
          <MapPin size={15} aria-hidden />
          <Link href={`/projects/${incident.project.id}`} className="truncate hover:text-accent">
            {incident.project.name}
          </Link>
        </li>
        <li className="flex items-center gap-2">
          <CalendarDays size={15} aria-hidden /> {tDetail("eventDate", { date: day(incident.date) })}
        </li>
        {incident.reportedBy && (
          <li className="flex items-center gap-2">
            <UserRound size={15} aria-hidden /> {tDetail("reportedBy", { name: incident.reportedBy.name })}
          </li>
        )}
      </ul>

      {incident.status === "RESOLVED" && (
        <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm">
          <p className="font-medium text-success">{tDetail("resolution")}</p>
          {incident.resolutionNote && <p className="mt-1 whitespace-pre-line text-ink">{incident.resolutionNote}</p>}
          {incident.resolvedAt && (
            <p className="mt-1 text-xs text-ink-muted">
              {tDetail("resolvedBy", { name: incident.resolvedBy?.name ?? tDetail("unknownUser"), date: moment(incident.resolvedAt) })}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <IncidentStatusActions incident={incident} isAdmin={isAdmin} size="lg" />
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">{tDetail("photos")}</h3>
          <button type="button" onClick={() => cameraRef.current?.click()} disabled={uploading} className={secondaryButtonClass}>
            <Camera size={15} aria-hidden /> {uploading ? tForm("saving") : tDetail("addPhoto")}
          </button>
          <input ref={cameraRef} type="file" accept={PHOTO_TYPES.join(",")} capture="environment" onChange={handlePhoto} className="sr-only" tabIndex={-1} aria-hidden />
        </div>
        {incident.evidence.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-ink-muted">{tDetail("noPhotos")}</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {incident.evidence.map((photo) => (
              <li key={photo.id}>
                <ImageLightbox src={photo.imageUrl} alt={photo.description ?? t(`types.${incident.type}`)} thumbClassName="aspect-square w-full rounded-lg border border-line" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-ink">{tDetail("history")}</h3>
        {history.length === 0 ? (
          <p className="text-sm text-ink-muted">{tDetail("historyLegacy")}</p>
        ) : (
          <ol className="relative space-y-4 border-l border-line pl-5">
            {history.map((change) => (
              <li key={change.id} className="relative">
                <span className={`absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-surface ${STATUS_TONE[change.toStatus].dot}`} aria-hidden />
                <p className="text-sm font-medium text-ink">
                  {change.fromStatus
                    ? tDetail("historyChange", { from: t(`statuses.${change.fromStatus}`), to: t(`statuses.${change.toStatus}`) })
                    : tDetail("historyCreated")}
                </p>
                <p className="text-xs text-ink-muted">
                  {change.changedBy?.name ?? tDetail("unknownUser")} · {moment(change.createdAt)}
                </p>
                {change.note && <p className="mt-1 whitespace-pre-line rounded-md bg-surface-2 px-3 py-2 text-sm text-ink">{change.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
