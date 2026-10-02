export interface InventoryAnalysisResult {
  processedRecords: number;
  anomaliesDetected: number;
  durationMs: number;
}

/**
 * Simula el análisis de un histórico grande de consumo de materiales.
 * Compara cada registro contra todos los demás para detectar anomalías
 * (patrón O(n²), intencional): con pocos datos es trivial, pero con el
 * volumen real que tendría una constructora con muchas obras y meses de
 * histórico, se vuelve costoso — exactamente el escenario que tu documento
 * describe como justificación para usar un Worker.
 */
export function simulateLargeInventoryAnalysis(datasetSize: number): InventoryAnalysisResult {
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

  const durationMs = performance.now() - start;
  return { processedRecords: datasetSize, anomaliesDetected, durationMs };
}