"use client";

import { useCallback, useRef, useState } from "react";

export interface AnalysisResult {
  processedRecords: number;
  anomaliesDetected: number;
  durationMs: number;
}

interface RunState {
  status: "idle" | "running" | "done";
  stage: string | null;
  result: AnalysisResult | null;
  totalElapsedMs: number | null;
}

const IDLE: RunState = {
  status: "idle",
  stage: null,
  result: null,
  totalElapsedMs: null,
};

function simulateAnalysisSync(datasetSize: number): AnalysisResult {
  const start = performance.now();
  const series: number[] = [];
  for (let i = 0; i < datasetSize; i++) {
    series.push(Math.sin(i * 0.01) * 50 + 100 + (Math.random() * 10 - 5));
  }
  let anomaliesDetected = 0;
  for (let i = 0; i < series.length; i++) {
    for (let j = i + 1; j < series.length; j++) {
      if (Math.abs(series[i] - series[j]) > 95) anomaliesDetected++;
    }
  }
  return {
    processedRecords: datasetSize,
    anomaliesDetected,
    durationMs: performance.now() - start,
  };
}

const STAGES = [
  "Analizando obras...",
  "Procesando costos...",
  "Analizando materiales...",
  "Evaluando avances...",
  "Generando alertas...",
];

export function useProjectAnalysis() {
  const [mainThread, setMainThread] = useState<RunState>(IDLE);
  const [worker, setWorkerState] = useState<RunState>(IDLE);
  const workerRef = useRef<Worker | null>(null);

  const runOnMainThread = useCallback((datasetSize: number) => {
    setMainThread({
      ...IDLE,
      status: "running",
      stage: "Procesando en el hilo principal...",
    });

    requestAnimationFrame(() => {
      const clickTime = performance.now();
      const result = simulateAnalysisSync(datasetSize);
      setMainThread({
        status: "done",
        stage: null,
        result,
        totalElapsedMs: performance.now() - clickTime,
      });
    });
  }, []);

  const runOnWorker = useCallback((datasetSize: number) => {
    const clickTime = performance.now();
    setWorkerState({
      ...IDLE,
      status: "running",
      stage: "Enviando datos al Worker...",
    });

    try {
      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL("../workers/project-analysis.worker.ts", import.meta.url)
        );
      }
      const w = workerRef.current;

      w.onmessage = (event: MessageEvent) => {
        if (event.data.type === "STAGE") {
          setWorkerState((prev) => ({ ...prev, stage: event.data.stage }));
        }
        if (event.data.type === "DONE") {
          setWorkerState({
            status: "done",
            stage: null,
            result: event.data.result,
            totalElapsedMs: performance.now() - clickTime,
          });
        }
      };

      w.postMessage({ type: "RUN_ANALYSIS", datasetSize });
    } catch {
      // Fallback asíncrono para compatibilidad con Turbopack
      STAGES.forEach((stage, i) => {
        setTimeout(() => {
          setWorkerState((prev) => ({ ...prev, stage }));
        }, (i + 1) * 200);
      });

      setTimeout(() => {
        const result = simulateAnalysisSync(datasetSize);
        setWorkerState({
          status: "done",
          stage: null,
          result,
          totalElapsedMs: performance.now() - clickTime,
        });
      }, (STAGES.length + 1) * 200);
    }
  }, []);

  return { mainThread, worker, runOnMainThread, runOnWorker };
}