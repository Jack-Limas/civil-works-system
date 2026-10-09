"use client";

import type { ReactNode } from "react";
import { Modal } from "./modal";
import { primaryButtonClass, secondaryButtonClass } from "./form";

/** Destructive actions use the critical tone; it replaces window.confirm (never used in the app). */
export const dangerButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-critical px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-critical/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-critical disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10";

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  tone = "accent",
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  tone?: "accent" | "critical";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={busy ? () => undefined : onClose} title={title}>
      {children && <div className="space-y-3 text-sm text-ink-muted">{children}</div>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm} disabled={busy} className={tone === "critical" ? dangerButtonClass : primaryButtonClass}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
