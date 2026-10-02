"use client";

import { useProjectAnalysis } from "@/hooks/use-project-analysis";
import { useHeartbeat } from "@/hooks/use-heartbeat";

export function AnalysisRunner() {
  const { mainThread, worker, runOnMainThread, runOnWorker } = useProjectAnalysis();
  const heartbeat = useHeartbeat();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-1 text-lg font-semibold">Hilo Principal vs Web Worker</h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Latido: <span className="font-mono">{heartbeat}</span> — si este número se congela, el hilo principal está bloqueado.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-red-200 p-4 dark:border-red-900">
          <h3 className="mb-2 font-medium text-red-600 dark:text-red-400">Hilo Principal (bloqueante)</h3>
          <button
            onClick={() => runOnMainThread(8000)}
            className="mb-3 rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
          >
            Ejecutar análisis
          </button>
          <p className="text-sm">
            {mainThread.status === "running"
              ? "Procesando... (observa si el latido se congela)"
              : mainThread.result
              ? `✅ ${mainThread.totalElapsedMs?.toFixed(0)}ms — ${mainThread.result.anomaliesDetected} anomalías`
              : "Sin ejecutar"}
          </p>
        </div>

        <div className="rounded-lg border border-green-200 p-4 dark:border-green-900">
          <h3 className="mb-2 font-medium text-green-600 dark:text-green-400">Web Worker (segundo plano)</h3>
          <button
            onClick={() => runOnWorker(8000)}
            className="mb-3 rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
          >
            Ejecutar análisis
          </button>
          <p className="text-sm">
            {worker.status === "running"
              ? worker.stage
              : worker.result
              ? `✅ ${worker.totalElapsedMs?.toFixed(0)}ms — ${worker.result.anomaliesDetected} anomalías`
              : "Sin ejecutar"}
          </p>
        </div>
      </div>
    </div>
  );
}