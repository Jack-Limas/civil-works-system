"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";

export interface Column<T> {
  /** Stable id (used as React key). */
  id: string;
  header: string;
  accessor: (row: T) => ReactNode;
  align?: "left" | "right";
  /** Shown as the card title on small screens. */
  primary?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  /** Extra cell rendered at the end of each row/card (actions). */
  rowActions?: (row: T) => ReactNode;
  actionsHeader?: string;
}

/**
 * Table on md+ screens and stacked cards on phones, so wide tables never
 * force horizontal scrolling on the devices residents use in the field.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  emptyMessage,
  emptyAction,
  rowActions,
  actionsHeader,
}: DataTableProps<T>) {
  const t = useTranslations("common");

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-xl border border-line bg-surface p-4" aria-busy="true">
        <span className="sr-only">{t("loading")}</span>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-surface-2 motion-reduce:animate-none" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-surface px-6 py-10 text-center">
        <p className="text-sm text-ink-muted">{emptyMessage ?? t("noRecords")}</p>
        {emptyAction}
      </div>
    );
  }

  const primary = columns.find((c) => c.primary) ?? columns[0];
  const secondary = columns.filter((c) => c !== primary);

  return (
    <>
      <ul className="space-y-2 md:hidden">
        {rows.map((row) => {
          const actions = rowActions?.(row);
          return (
            <li key={rowKey(row)} className="rounded-xl border border-line bg-surface p-4">
              <div className="mb-2 font-medium text-ink">{primary.accessor(row)}</div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                {secondary.map((col) => (
                  <div key={col.id} className="min-w-0">
                    <dt className="text-xs text-ink-muted">{col.header}</dt>
                    <dd className="truncate text-ink">{col.accessor(row)}</dd>
                  </div>
                ))}
              </dl>
              {actions && <div className="mt-3 flex justify-end gap-2 border-t border-line pt-3">{actions}</div>}
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface md:block">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              {columns.map((col) => (
                <th key={col.id} scope="col" className={`px-4 py-3 font-medium ${col.align === "right" ? "text-right" : "text-left"}`}>
                  {col.header}
                </th>
              ))}
              {rowActions && (
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  {actionsHeader ?? t("actions")}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="transition-colors hover:bg-surface-2">
                {columns.map((col) => (
                  <td key={col.id} className={`px-4 py-3 text-ink ${col.align === "right" ? "text-right" : ""}`}>
                    {col.accessor(row)}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">{rowActions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
