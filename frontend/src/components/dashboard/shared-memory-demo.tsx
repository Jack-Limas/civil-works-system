"use client";

import { useState } from "react";

export function SharedMemoryDemo() {
  const [isolated, setIsolated] = useState<boolean | null>(null);
  const [result, setResult] = useState<string | null>(null);

  function checkIsolation() {
    setIsolated(typeof window !== "undefined" && window.crossOriginIsolated === true);
  }

  function runSharedBufferDemo() {
    if (typeof window === "undefined" || !window.crossOriginIsolated) {
      setResult("❌ No se puede crear SharedArrayBuffer: la página no está crossOriginIsolated.");
      return;
    }

    try {
      // Reservamos un bloque de memoria compartida para 4 enteros de 32 bits (16 bytes)
      const buffer = new SharedArrayBuffer(4 * Int32Array.BYTES_PER_ELEMENT);
      const sharedArray = new Int32Array(buffer);

      // Asignación inicial en memoria
      sharedArray[0] = 10;

      // Operación atómica de modificación sincrónica en RAM
      Atomics.add(sharedArray, 0, 32);

      setResult(
        `✅ Memoria compartida activa: valor inicial 10, tras Atomics.add(+32) = ${sharedArray[0]} (lectura/escritura en buffer compartido sin clonar datos).`
      );
    } catch (error) {
      setResult(`❌ Error ejecutando SharedArrayBuffer: ${String(error)}`);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-1 text-lg font-semibold">Memoria Compartida: postMessage vs SharedArrayBuffer</h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <code className="font-semibold text-indigo-600 dark:text-indigo-400">postMessage</code> clona y duplica los datos en cada hilo.{" "}
        <code className="font-semibold text-indigo-600 dark:text-indigo-400">SharedArrayBuffer</code> con{" "}
        <code className="font-semibold text-indigo-600 dark:text-indigo-400">Atomics</code> permite lectura y escritura simultánea sobre el mismo espacio de memoria RAM.
      </p>

      <div className="flex gap-2">
        <button
          onClick={checkIsolation}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Verificar crossOriginIsolated
        </button>
        <button
          onClick={runSharedBufferDemo}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
        >
          Probar SharedArrayBuffer
        </button>
      </div>

      {isolated !== null && (
        <p className="mt-3 text-sm">
          window.crossOriginIsolated ={" "}
          <span className={`font-mono font-bold ${isolated ? "text-green-600" : "text-red-500"}`}>
            {String(isolated)}
          </span>
        </p>
      )}

      {result && <p className="mt-2 text-sm font-medium">{result}</p>}
    </div>
  );
}