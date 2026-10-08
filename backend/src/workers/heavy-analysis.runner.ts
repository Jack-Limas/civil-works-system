import { Worker } from "worker_threads";
import path from "path";
import { InventoryAnalysisResult } from "../utils/inventory-analysis";

export function runHeavyAnalysisInWorker(datasetSize: number): Promise<InventoryAnalysisResult> {
  return new Promise((resolve, reject) => {
    // En desarrollo (ts-node-dev) el archivo activo es .ts y necesita
    // ts-node/register para que el Worker (un proceso V8 nuevo) pueda
    // interpretarlo. En producción (tsc ya compiló a dist/) es .js puro
    // y no necesita nada extra.
    const isTs = __filename.endsWith(".ts");
    const workerFile = path.resolve(__dirname, isTs ? "heavy-analysis.worker.ts" : "heavy-analysis.worker.js");

    const worker = new Worker(workerFile, {
      workerData: { datasetSize },
      execArgv: isTs ? ["-r", "ts-node/register/transpile-only"] : [],
    });

    worker.on("message", (result: InventoryAnalysisResult) => {
      resolve(result);
      worker.terminate();
    });

    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}