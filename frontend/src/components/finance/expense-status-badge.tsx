import { useTranslations } from "next-intl";
import { ExpenseStatus } from "@/types/finance";

const STATUS_CLASS: Record<ExpenseStatus, string> = {
  PENDING: "bg-warning/15 text-warning",
  APPROVED: "bg-success/15 text-success",
  REJECTED: "bg-critical/15 text-critical",
};

export function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  const t = useTranslations("expense.status");
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>
      {t(status)}
    </span>
  );
}
