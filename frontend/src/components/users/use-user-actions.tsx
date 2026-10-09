"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useResetUserPassword, useSetUserActive } from "@/lib/users-service";
import { apiErrorCode } from "@/lib/api-client";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";
import { TemporaryPasswordDialog } from "./temporary-password-dialog";

export type UserAction = "deactivate" | "activate" | "reset";
type Target = { id: string; name: string; projectsInCharge?: number };

/**
 * Confirmation + mutation + one-time password dialog for the destructive user
 * actions, shared by the list and the detail screen.
 */
export function useUserActions(): { ask: (action: UserAction, user: Target) => void; dialogs: ReactNode; busy: boolean } {
  const t = useTranslations("users");
  const errorMessage = useApiErrorMessage();
  const setActive = useSetUserActive();
  const reset = useResetUserPassword();
  const [pending, setPending] = useState<{ action: UserAction; user: Target } | null>(null);
  const [temporary, setTemporary] = useState<{ title: "created" | "reset"; name: string; password: string } | null>(null);
  const busy = setActive.isPending || reset.isPending;

  async function confirm() {
    if (!pending) return;
    const { action, user } = pending;
    try {
      if (action === "reset") {
        const password = await reset.mutateAsync(user.id);
        setPending(null);
        setTemporary({ title: "reset", name: user.name, password });
        return;
      }
      await setActive.mutateAsync({ id: user.id, active: action === "activate" });
      toast.success(action === "activate" ? t("toasts.activated") : t("toasts.deactivated"));
      setPending(null);
    } catch (error) {
      const code = apiErrorCode(error);
      toast.error(code === "SELF_ACTION" ? t("errors.selfAction") : code === "LAST_ADMIN" ? t("errors.lastAdmin") : errorMessage(error));
    }
  }

  const titles: Record<UserAction, string> = {
    deactivate: "confirm.deactivateTitle",
    activate: "confirm.activateTitle",
    reset: "confirm.resetTitle",
  };
  const bodies: Record<UserAction, string> = {
    deactivate: "confirm.deactivateBody",
    activate: "confirm.activateBody",
    reset: "confirm.resetBody",
  };

  const dialogs = (
    <>
      <ConfirmDialog
        open={pending !== null}
        title={pending ? t(titles[pending.action], { name: pending.user.name }) : ""}
        confirmLabel={t("confirm.confirm")}
        cancelLabel={t("confirm.cancel")}
        tone={pending?.action === "activate" ? "accent" : "critical"}
        busy={busy}
        onConfirm={confirm}
        onClose={() => setPending(null)}
      >
        {pending && <p>{t(bodies[pending.action])}</p>}
        {pending?.action === "deactivate" && !!pending.user.projectsInCharge && (
          <p className="rounded-lg bg-warning/10 px-3 py-2 text-ink">{t("confirm.deactivateProjects", { count: pending.user.projectsInCharge })}</p>
        )}
      </ConfirmDialog>
      <TemporaryPasswordDialog data={temporary} onClose={() => setTemporary(null)} />
    </>
  );

  return { ask: (action, user) => setPending({ action, user }), dialogs, busy };
}
