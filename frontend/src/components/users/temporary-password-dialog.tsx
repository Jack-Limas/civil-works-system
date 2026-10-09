"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";

/**
 * Shows a temporary password exactly once. The parent drops it from state on
 * close, so it never survives in memory, storage or the query cache.
 */
export function TemporaryPasswordDialog({
  data,
  onClose,
}: {
  data: { title: "created" | "reset"; name: string; password: string } | null;
  onClose: () => void;
}) {
  const t = useTranslations("users.tempPassword");
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const fieldRef = useRef<HTMLInputElement>(null);

  async function copy() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.password);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      // Clipboard can be blocked (permissions, http): select it so a manual copy is one keystroke
      fieldRef.current?.select();
      setCopyFailed(true);
    }
  }

  function close() {
    setCopied(false);
    setCopyFailed(false);
    onClose();
  }

  return (
    <Modal open={data !== null} onClose={close} title={data?.title === "reset" ? t("resetTitle") : t("createdTitle")}>
      {data && (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">{t("for", { name: data.name })}</p>
          <div className="flex items-stretch gap-2">
            <label className="sr-only" htmlFor="temp-password">
              {t("label")}
            </label>
            <input
              ref={fieldRef}
              id="temp-password"
              readOnly
              value={data.password}
              onFocus={(e) => e.currentTarget.select()}
              className="min-h-12 w-full rounded-lg border border-line bg-surface-2 px-3 text-center font-mono-data text-lg tracking-wider text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            />
            <button type="button" onClick={copy} className={`${secondaryButtonClass} min-h-12 shrink-0`} aria-live="polite">
              {copied ? <Check size={16} className="text-success" aria-hidden /> : <Copy size={16} aria-hidden />}
              {copied ? t("copied") : t("copy")}
            </button>
          </div>
          {copyFailed && <p className="text-xs text-critical">{t("copyFailed")}</p>}
          <p role="note" className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-ink">
            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden /> {t("warning")}
          </p>
          <div className="flex justify-end">
            <button type="button" onClick={close} className={primaryButtonClass}>
              {t("done")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
