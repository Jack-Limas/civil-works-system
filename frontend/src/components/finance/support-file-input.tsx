"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Camera, FileText, Loader2, Upload, X } from "lucide-react";
import { compressImage } from "@/lib/compress-image";

const MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED = [...IMAGE_TYPES, "application/pdf"];

/**
 * Invoice/receipt picker with two explicit actions: "Take photo" opens the
 * rear camera (capture="environment"), "Upload file" opens the gallery/files.
 * Photos are compressed before being handed to the form. PDFs are never
 * embedded (COEP would block cross-origin frames): they open in a new tab.
 */
export function SupportFileInput({
  file,
  onChange,
  onBusyChange,
  imagesOnly = false,
  hint,
  typeError,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  onBusyChange?: (busy: boolean) => void;
  /** Photos only (e.g. incident evidence): no PDFs. */
  imagesOnly?: boolean;
  /** Replaces the default helper text under the picker. */
  hint?: string;
  /** Replaces the default "format not allowed" message. */
  typeError?: string;
}) {
  const accepted = imagesOnly ? IMAGE_TYPES : ACCEPTED;
  const t = useTranslations("expenseForm");
  const format = useFormatter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savings, setSavings] = useState<{ before: number; after: number } | null>(null);
  // One object URL per selected file (derived, not state), released when it changes
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const size = (bytes: number) =>
    bytes >= 1024 * 1024
      ? `${format.number(bytes / (1024 * 1024), { maximumFractionDigits: 1 })} MB`
      : `${format.number(Math.round(bytes / 1024))} KB`;

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!selected) return;
    setError(null);
    setSavings(null);

    if (!accepted.includes(selected.type)) {
      setError(typeError ?? t("fileType"));
      return;
    }

    setBusy(true);
    onBusyChange?.(true);
    try {
      const result = await compressImage(selected);
      if (result.file.size > MAX_BYTES) {
        setError(t("fileTooLarge"));
        return;
      }
      if (result.compressed) setSavings({ before: result.originalSize, after: result.file.size });
      onChange(result.file);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  function clear() {
    onChange(null);
    setSavings(null);
  }

  const isPdf = file?.type === "application/pdf";

  return (
    <div className="space-y-2">
      {file && previewUrl ? (
        <div className="relative overflow-hidden rounded-xl border border-line bg-surface-2">
          {isPdf ? (
            <div className="flex items-center gap-3 p-4">
              <FileText size={28} className="shrink-0 text-accent" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
                  {t("openPdf")}
                </a>
              </div>
            </div>
          ) : (
            // Local blob preview: next/image cannot optimize blob URLs
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={file.name} className="max-h-72 w-full object-contain" />
          )}
          <button
            type="button"
            onClick={clear}
            aria-label={t("removeFile")}
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 rounded-xl border-2 border-dashed border-line bg-surface-2 p-3">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={busy}
            className="flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-lg bg-surface text-sm font-medium text-ink shadow-sm hover:text-accent disabled:opacity-60"
          >
            <Camera size={24} className="text-accent" aria-hidden />
            {t("takePhoto")}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-lg bg-surface text-sm font-medium text-ink shadow-sm hover:text-accent disabled:opacity-60"
          >
            <Upload size={24} className="text-accent" aria-hidden />
            {t("uploadFile")}
          </button>
        </div>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleSelect} className="sr-only" tabIndex={-1} aria-hidden />
      <input
        ref={fileRef}
        type="file"
        accept={accepted.join(",")}
        onChange={handleSelect}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />

      <div aria-live="polite" className="text-xs">
        {busy && (
          <p className="flex items-center gap-1.5 text-ink-muted">
            <Loader2 size={13} className="animate-spin motion-reduce:animate-none" aria-hidden /> {t("compressing")}
          </p>
        )}
        {!busy && savings && (
          <p className="text-success">{t("compressed", { before: size(savings.before), after: size(savings.after) })}</p>
        )}
        {error && <p className="text-critical" role="alert">{error}</p>}
        {!busy && !error && !savings && <p className="text-ink-muted">{hint ?? t("supportHint")}</p>}
      </div>
    </div>
  );
}
