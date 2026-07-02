/**
 * Minimal CSV exporter — no deps. Handles commas, quotes, newlines.
 */
export type CsvColumn<T> = {
  key: keyof T | string;
  label: string;
  format?: (row: T) => string | number | null | undefined;
};

function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadCsv<T>(
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[],
): void {
  const header = columns.map((c) => esc(c.label)).join(",");
  const body = rows
    .map((r) =>
      columns
        .map((c) =>
          esc(c.format ? c.format(r) : (r as unknown as Record<string, unknown>)[c.key as string]),
        )
        .join(","),
    )
    .join("\n");
  const csv = `${header}\n${body}`;
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

