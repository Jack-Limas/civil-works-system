import { ProjectStatus } from "@/lib/projects-service";

/** Badge colors per project status (tokens only, readable in both themes). */
export const PROJECT_STATUS_CLASS: Record<ProjectStatus, string> = {
  PLANNED: "bg-surface-2 text-ink-muted border border-line",
  IN_PROGRESS: "bg-success/15 text-success",
  SUSPENDED: "bg-warning/15 text-warning",
  FINISHED: "bg-ai/15 text-ai",
};
