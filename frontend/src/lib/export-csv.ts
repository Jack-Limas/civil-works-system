/**
 * CSV export without dependencies, tuned for Excel in Colombia:
 * - UTF-8 with BOM so accents and "ñ" open correctly
 * - ";" separator, which is what Excel expects with Spanish regional settings
 * - fields quoted when they contain the separator, quotes or line breaks
 * - values starting with = + - @ are prefixed with ' to prevent CSV/formula injection
 */
export type CsvValue = string | number | null | undefined;

const SEPARATOR = ";";
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function escapeCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let text = typeof value === "number" ? String(value) : value;
  if (typeof value === "string" && FORMULA_PREFIX.test(text)) text = `'${text}`;
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(SEPARATOR)).join("\r\n");
}

/** Builds the CSV and triggers a browser download. */
export function exportCsv(filename: string, headers: string[], rows: CsvValue[][]) {
  const blob = new Blob(["﻿" + toCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
