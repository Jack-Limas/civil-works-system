"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, PlayCircle, RotateCcw } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Field, fieldClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { useChangeIncidentStatus, type Incident, type IncidentStatus } from "@/lib/incidents-service";
import { apiErrorCode } from "@/lib/api-client";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";

type ActionKind = "start" | "resolve" | "reopen" | "toOpen";
const ACTION_TARGET: Record<ActionKind, IncidentStatus> = { start: "IN_REVIEW", resolve: "RESOLVED", reopen: "OPEN", toOpen: "OPEN" };
const ACTION_ICON = { start: PlayCircle, resolve: CheckCircle2, reopen: RotateCcw, toOpen: RotateCcw } as const;

/**
 * Same rules as the API: anyone allowed on the project moves an incident
 * forward; only admins reopen it or move it back.
 */
export function allowedActions(status: IncidentStatus, isAdmin: boolean): ActionKind[] {
  if (status === "OPEN") return ["start", "resolve"];
  if (status === "IN_REVIEW") return isAdmin ? ["resolve", "toOpen"] : ["resolve"];
  return isAdmin ? ["reopen"] : [];
}

export function IncidentStatusActions({
  incident,
  isAdmin,
  size = "md",
  onChanged,
}: {
  incident: Pick<Incident, "id" | "status">;
  isAdmin: boolean;
  size?: "md" | "lg";
  onChanged?: () => void;
}) {
  const t = useTranslations("incidents.transition");
  const errorMessage = useApiErrorMessage();
  const change = useChangeIncidentStatus();
  const noteId = useId();
  const [pending, setPending] = useState<ActionKind | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState(false);

  const actions = allowedActions(incident.status, isAdmin);
  if (actions.length === 0) return null;

  function open(kind: ActionKind) {
    setPending(kind);
    setNote("");
    setNoteError(false);
  }

  async function confirm() {
    if (!pending) return;
    const trimmed = note.trim();
    if (pending === "resolve" && trimmed.length < 3) {
      setNoteError(true);
      return;
    }
    try {
      await change.mutateAsync({ id: incident.id, status: ACTION_TARGET[pending], note: trimmed || undefined });
      toast.success(t("changed"));
      setPending(null);
      onChanged?.();
    } catch (error) {
      const code = apiErrorCode(error);
      toast.error(
        code === "REOPEN_ADMIN_ONLY" ? t("reopenAdminOnly") : code === "STALE_STATUS" ? t("stale") : code === "SAME_STATUS" ? t("sameStatus") : errorMessage(error)
      );
    }
  }

  const sizeClass = size === "lg" ? "min-h-12 flex-1" : "";
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {actions.map((kind) => {
          const Icon = ACTION_ICON[kind];
          return (
            <button
              key={kind}
              type="button"
              onClick={() => open(kind)}
              className={`${kind === "resolve" ? primaryButtonClass : secondaryButtonClass} ${sizeClass}`}
            >
              <Icon size={16} aria-hidden /> {t(kind)}
            </button>
          );
        })}
      </div>

      <Modal open={pending !== null} onClose={() => (change.isPending ? undefined : setPending(null))} title={pending ? t(pending) : ""}>
        <Field
          id={noteId}
          label={pending === "resolve" ? t("resolutionNote") : t("note")}
          error={noteError ? t("noteRequired") : undefined}
        >
          <textarea
            id={noteId}
            rows={3}
            maxLength={1000}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (noteError) setNoteError(false);
            }}
            placeholder={pending === "resolve" ? t("resolutionPlaceholder") : t("notePlaceholder")}
            aria-invalid={noteError}
            className={fieldClass}
          />
        </Field>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setPending(null)} disabled={change.isPending} className={secondaryButtonClass}>
            {t("cancel")}
          </button>
          <button type="button" onClick={confirm} disabled={change.isPending} className={primaryButtonClass}>
            {t("confirm")}
          </button>
        </div>
      </Modal>
    </>
  );
}
