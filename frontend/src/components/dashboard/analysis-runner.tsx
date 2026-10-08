"use client";

import { useTranslations } from "next-intl";
import { useProjectAnalysis } from "@/hooks/use-project-analysis";
import { useHeartbeat } from "@/hooks/use-heartbeat";

export function AnalysisRunner() {
  const t = useTranslations("analysis");
  const { mainThread, worker, runOnMainThread, runOnWorker } = useProjectAnalysis();
  const heartbeat = useHeartbeat();

  const resultText = (run: typeof mainThread) =>
    run.result
      ? t("result", { ms: Math.round(run.totalElapsedMs ?? 0), anomalies: run.result.anomaliesDetected })
      : t("idle");

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h2 className="mb-1 text-base font-semibold text-ink">{t("title")}</h2>
      <p className="mb-4 text-sm text-ink-muted">
        {t.rich("heartbeat", {
          tick: heartbeat,
          mono: (chunks) => <span className="font-mono-data text-ink">{chunks}</span>,
        })}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-critical/30 p-4">
          <h3 className="mb-2 text-sm font-medium text-critical">{t("mainThread")}</h3>
          <button
            type="button"
            onClick={() => runOnMainThread(8000)}
            disabled={mainThread.status === "running"}
            className="mb-3 rounded-md bg-critical px-3 py-1.5 text-sm text-white hover:bg-critical/90 disabled:opacity-50"
          >
            {t("run")}
          </button>
          <p className="text-sm text-ink" aria-live="polite">
            {mainThread.status === "running" ? t("mainRunning") : resultText(mainThread)}
          </p>
        </div>

        <div className="rounded-lg border border-success/30 p-4">
          <h3 className="mb-2 text-sm font-medium text-success">{t("worker")}</h3>
          <button
            type="button"
            onClick={() => runOnWorker(8000)}
            disabled={worker.status === "running"}
            className="mb-3 rounded-md bg-success px-3 py-1.5 text-sm text-white hover:bg-success/90 disabled:opacity-50"
          >
            {t("run")}
          </button>
          <p className="text-sm text-ink" aria-live="polite">
            {worker.status === "running" && worker.stage ? t(`stages.${worker.stage}`) : resultText(worker)}
          </p>
        </div>
      </div>
    </div>
  );
}
