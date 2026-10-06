function simulateAnalysis(datasetSize) {
  const start = performance.now();
  const series = [];
  for (let i = 0; i < datasetSize; i++) {
    series.push(Math.sin(i * 0.01) * 50 + 100 + (Math.random() * 10 - 5));
  }

  let anomaliesDetected = 0;
  for (let i = 0; i < series.length; i++) {
    for (let j = i + 1; j < series.length; j++) {
      if (Math.abs(series[i] - series[j]) > 95) anomaliesDetected++;
    }
  }

  return { processedRecords: datasetSize, anomaliesDetected, durationMs: performance.now() - start };
}

const STAGES = [
  "Analizando obras...",
  "Procesando costos...",
  "Analizando materiales...",
  "Evaluando avances...",
  "Generando alertas...",
];

self.onmessage = function (event) {
  if (event.data.type !== "RUN_ANALYSIS") return;

  // Espaciamos cada etapa a 1.2 segundos (1200 ms) para poder visualizar la sincronización multitabla
  STAGES.forEach((stage, i) => {
    setTimeout(() => {
      self.postMessage({ type: "STAGE", stage });
    }, i * 1200);
  });

  // Enviamos el resultado final cuando completen las 5 etapas (después de 6 segundos)
  setTimeout(() => {
    const result = simulateAnalysis(event.data.datasetSize);
    self.postMessage({ type: "DONE", result });
  }, STAGES.length * 1200 + 100);
};