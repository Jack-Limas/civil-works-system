"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle } from "lucide-react";

type DemoResult = { ok: true; value: number } | { ok: false; message: string | null };

export function SharedMemoryDemo() {
  const t = useTranslations("sharedMemory");
  const [isolated, setIsolated] = useState<boolean | null>(null);
  const [result, setResult] = useState<DemoResult | null>(null);

  function checkIsolation() {
    setIsolated(typeof window !== "undefined" && window.crossOriginIsolated === true);
  }

  function runSharedBufferDemo() {
    if (typeof window === "undefined" || !window.crossOriginIsolated) {
      setResult({ ok: false, message: null });
      return;
    }

    try {
      // Shared block for 4 Int32 values (16 bytes); no copy is made between threads
      const buffer = new SharedArrayBuffer(4 * Int32Array.BYTES_PER_ELEMENT);
      const sharedArray = new Int32Array(buffer);
      sharedArray[0] = 10;
      // Atomic read-modify-write on shared memory
      Atomics.add(sharedArray, 0, 32);
      setResult({ ok: true, value: sharedArray[0] });
    } catch (error) {
      setResult({ ok: false, message: String(error) });
    }
  }

  const code = (chunks: React.ReactNode) => <code className="font-mono-data font-semibold text-ai">{chunks}</code>;

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h2 className="mb-1 text-base font-semibold text-ink">{t("title")}</h2>
      <p className="mb-4 text-sm text-ink-muted">{t.rich("description", { code })}</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={checkIsolation}
          className="rounded-md border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-2"
        >
          {t("checkIsolation")}
        </button>
        <button
          type="button"
          onClick={runSharedBufferDemo}
          className="rounded-md bg-ai px-3 py-1.5 text-sm text-bg hover:opacity-90"
        >
          {t("tryBuffer")}
        </button>
      </div>

      {isolated !== null && (
        <p className="mt-3 text-sm text-ink">
          window.crossOriginIsolated ={" "}
          <span className={`font-mono-data font-bold ${isolated ? "text-success" : "text-critical"}`}>
            {String(isolated)}
          </span>
        </p>
      )}

      {result && (
        <p className="mt-2 flex items-start gap-2 text-sm font-medium text-ink" aria-live="polite">
          {result.ok ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" aria-hidden />
          ) : (
            <XCircle size={16} className="mt-0.5 shrink-0 text-critical" aria-hidden />
          )}
          {result.ok
            ? t("success", { value: result.value })
            : result.message
              ? t("error", { message: result.message })
              : t("notIsolated")}
        </p>
      )}
    </div>
  );
}
