import { simulateLargeInventoryAnalysis } from "../utils/inventory-analysis";
import { runHeavyAnalysisInWorker } from "../workers/heavy-analysis.runner";

export const benchmarkService = {
  runOnMainThread(datasetSize: number) {
    const start = performance.now();
    const result = simulateLargeInventoryAnalysis(datasetSize);
    return { mode: "MAIN_THREAD" as const, ...result, totalDurationMs: performance.now() - start };
  },

  async runOnWorkerThread(datasetSize: number) {
    const start = performance.now();
    const result = await runHeavyAnalysisInWorker(datasetSize);
    return { mode: "WORKER_THREAD" as const, ...result, totalDurationMs: performance.now() - start };
  },
};