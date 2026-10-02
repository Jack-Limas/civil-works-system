import { parentPort, workerData } from "worker_threads";
import { simulateLargeInventoryAnalysis } from "../utils/inventory-analysis";

const { datasetSize } = workerData as { datasetSize: number };
const result = simulateLargeInventoryAnalysis(datasetSize);

parentPort?.postMessage(result);