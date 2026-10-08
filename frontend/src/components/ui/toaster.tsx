"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToastStore, ToastKind } from "@/store/toast.store";

const ICON: Record<ToastKind, typeof Info> = { success: CheckCircle2, error: XCircle, info: Info };
const TONE: Record<ToastKind, string> = {
  success: "text-success",
  error: "text-critical",
  info: "text-accent",
};

export function Toaster() {
  const t = useTranslations("common");
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((item) => {
          const Icon = ICON[item.kind];
          return (
            <motion.div
              key={item.id}
              layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface p-3 text-sm text-ink shadow-lg"
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${TONE[item.kind]}`} aria-hidden />
              <p className="flex-1">{item.message}</p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded p-0.5 text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
                aria-label={t("close")}
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
