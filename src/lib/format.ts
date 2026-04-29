/**
 * Format a number as Kenyan Shillings.
 * Examples:
 *   formatKsh(1250)        -> "Ksh 1,250"
 *   formatKsh(1250, true)  -> "Ksh 1,250.00"
 *   formatKsh(null)        -> "—"
 */
export function formatKsh(
  amount: number | string | null | undefined,
  withCents = false,
): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "—";
  return `Ksh ${n.toLocaleString("en-KE", {
    minimumFractionDigits: withCents ? 2 : 0,
    maximumFractionDigits: withCents ? 2 : 0,
  })}`;
}

/** Plain integer formatting with thousands separators. */
export function formatNumber(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("en-KE");
}

/** ISO/SQL date -> "01 Apr 2026" */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** ISO/SQL date -> "01 Apr 2026, 14:30" */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return `${formatDate(d)}, ${d.toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;
}
