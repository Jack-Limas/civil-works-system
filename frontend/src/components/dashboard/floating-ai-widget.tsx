"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Sparkles, X } from "lucide-react";
import { AssistantChat } from "./assistant-chat";
import { AnalysisRunner } from "./analysis-runner";
import { SharedMemoryDemo } from "./shared-memory-demo";

type WidgetTab = "chat" | "benchmark";
const TABS: WidgetTab[] = ["chat", "benchmark"];

export function FloatingAIWidget() {
  const t = useTranslations("assistant");
  const tCommon = useTranslations("common");
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<WidgetTab>("chat");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileHover={reduceMotion ? undefined : { scale: 1.05 }}
        whileTap={reduceMotion ? undefined : { scale: 0.95 }}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-ai text-bg shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai sm:bottom-6 sm:right-6"
        aria-label={t("open")}
        aria-expanded={open}
      >
        <Sparkles size={22} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/40"
              aria-hidden
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t("title")}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-x-3 bottom-3 z-50 rounded-xl border border-line bg-surface p-4 shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:w-full sm:max-w-md sm:p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-ai" aria-hidden />
                  <h2 className="font-semibold text-ink">{t("title")}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1 text-ink-muted hover:bg-surface-2 hover:text-ink"
                  aria-label={tCommon("close")}
                >
                  <X size={18} />
                </button>
              </div>

              <div role="tablist" className="mb-3 flex gap-1 rounded-lg bg-surface-2 p-1">
                {TABS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                      tab === key ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {key === "chat" ? t("chatTab") : t("benchmarkTab")}
                  </button>
                ))}
              </div>

              {tab === "chat" ? (
                <AssistantChat />
              ) : (
                <div className="max-h-[min(420px,60vh)] space-y-4 overflow-y-auto pr-1">
                  <AnalysisRunner />
                  <SharedMemoryDemo />
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
