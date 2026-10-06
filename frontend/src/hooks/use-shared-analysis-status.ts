"use client";

import { useEffect, useRef, useState } from "react";

interface SharedStatus {
  status: "idle" | "running" | "done";
  stage: string | null;
}

export function useSharedAnalysisStatus() {
  const [status, setStatus] = useState<SharedStatus>({ status: "idle", stage: null });
  const portRef = useRef<MessagePort | null>(null);

  useEffect(() => {
    const worker = new SharedWorker("/workers/analysis-broadcast.shared-worker.js");
    const port = worker.port;
    portRef.current = port;
    port.start();

    port.onmessage = (event: MessageEvent<{ type: "STATE"; payload: SharedStatus }>) => {
      if (event.data.type === "STATE") setStatus(event.data.payload);
    };

    return () => port.close();
  }, []);

  function broadcast(newStatus: SharedStatus) {
    portRef.current?.postMessage({ type: "UPDATE_STATE", payload: newStatus });
  }

  return { status, broadcast };
}