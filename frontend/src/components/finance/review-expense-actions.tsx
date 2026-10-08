"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Field, fieldClass, primaryButtonClass } from "@/components/ui/form";
import { useReviewExpense } from "@/lib/expenses-service";
import { useApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/store/toast.store";

/** Approve / reject buttons for a PENDING expense (admin only; the API enforces it too). */
export function ReviewExpenseActions({ expenseId, label }: { expenseId: string; label: string }) {
  const t = useTranslations("finance.queue");
  const tv = useTranslations("validation");
  const review = useReviewExpense();
  const errorMessage = useApiErrorMessage();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const busy = review.isPending && review.variables?.id === expenseId;

  function approve() {
    review.mutate(
      { id: expenseId, decision: "APPROVE" },
      {
        onSuccess: () => toast.success(t("approved")),
        onError: (error) => toast.error(errorMessage(error)),
      }
    );
  }

  function reject(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 3) return;
    review.mutate(
      { id: expenseId, decision: "REJECT", reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(t("rejected"));
          setRejectOpen(false);
          setReason("");
        },
        onError: (error) => toast.error(errorMessage(error)),
      }
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={approve}
          disabled={busy}
          aria-label={`${t("approve")}: ${label}`}
          className="inline-flex min-h-9 items-center gap-1 rounded-md bg-success px-3 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Check size={14} aria-hidden /> {t("approve")}
        </button>
        <button
          type="button"
          onClick={() => setRejectOpen(true)}
          disabled={busy}
          aria-label={`${t("reject")}: ${label}`}
          className="inline-flex min-h-9 items-center gap-1 rounded-md border border-critical/40 px-3 text-xs font-medium text-critical transition-colors hover:bg-critical/10 disabled:opacity-50"
        >
          <X size={14} aria-hidden /> {t("reject")}
        </button>
      </div>

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title={t("rejectTitle")}>
        <form onSubmit={reject} className="space-y-3">
          <p className="text-sm text-ink-muted">{label}</p>
          <Field
            id={`reject-${expenseId}`}
            label={t("rejectReason")}
            error={reason.length > 0 && reason.trim().length < 3 ? tv("minChars", { min: 3 }) : undefined}
          >
            <textarea
              id={`reject-${expenseId}`}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("rejectPlaceholder")}
              maxLength={300}
              className={fieldClass}
            />
          </Field>
          <button
            type="submit"
            disabled={busy || reason.trim().length < 3}
            className={`${primaryButtonClass} w-full bg-critical hover:bg-critical/90`}
          >
            {t("confirmReject")}
          </button>
        </form>
      </Modal>
    </>
  );
}
