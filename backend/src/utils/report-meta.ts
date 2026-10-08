import { performance } from "perf_hooks";
import { FastifyReply } from "fastify";
import { userRepository } from "../repositories/user.repository";
import { RequestUser } from "../types/auth";

export interface ReportMeta {
  generatedAt: string;
  generatedBy: { id: string; name: string };
  durationMs: number;
  recordCount: number;
}

/**
 * Runs a report builder and attaches the generation metadata the course asks
 * for ("report generation time"): when, by whom, how long and how many records.
 * The builder returns its payload plus the number of records it processed.
 */
export async function withReportMeta<T extends object>(
  requester: RequestUser,
  build: () => Promise<{ payload: T; recordCount: number }>
): Promise<T & { meta: ReportMeta }> {
  const start = performance.now();
  const [{ payload, recordCount }, user] = await Promise.all([build(), userRepository.findById(requester.sub)]);
  const durationMs = Math.round((performance.now() - start) * 10) / 10;
  return {
    ...payload,
    meta: {
      generatedAt: new Date().toISOString(),
      generatedBy: { id: requester.sub, name: user?.name ?? "" },
      durationMs,
      recordCount,
    },
  };
}

/**
 * Exposes the measured time to the browser DevTools (Network > Timing).
 * Timing-Allow-Origin is set by the CORS-aware caller so the frontend origin can read it.
 */
export function setServerTiming(reply: FastifyReply, name: string, meta: ReportMeta) {
  reply.header("Server-Timing", `${name};desc="report generation";dur=${meta.durationMs}`);
}
