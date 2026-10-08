"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalysisStage } from "./use-project-analysis";

export interface SharedStatus {
  status: "idle" | "running" | "done";
  stage: AnalysisStage | null;
}

export function useSharedAnalysisStatus() {
  const [status, setStatus] = useState<SharedStatus>({ status: "idle", stage: null });
  const portRef = useRef<MessagePort | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("SharedWorker" in window)) return;

    const worker = new SharedWorker("/workers/analysis-broadcast.shared-worker.js");
    const port = worker.port;
    portRef.current = port;
    port.start();

    port.onmessage = (event: MessageEvent<{ type: "STATE"; payload: SharedStatus }>) => {
      if (event.data.type === "STATE") {
        const payload = event.data.payload;
        setStatus(payload);

        // Si el estado pasa a "done", mantenemos el aviso 4 segundos para que dé tiempo de verlo
        if (payload.status === "done") {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            setStatus({ status: "idle", stage: null });
          }, 4000);
        }
      }
    };

    return () => {
      port.close();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function broadcast(newStatus: SharedStatus) {
    portRef.current?.postMessage({ type: "UPDATE_STATE", payload: newStatus });
  }

  return { status, broadcast };
}