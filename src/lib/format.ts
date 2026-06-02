/**
 * Format a number as Kenyan Shillings.
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

export function formatNumber(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("en-KE");
}

/**
 * Parse a timestamp as Africa/Nairobi (UTC+3).
 * - Naive strings (no TZ suffix) from MySQL are treated as already Kenya local.
 * - Strings/Date objects with timezone info are converted to Kenya time.
 */
function toKenyaParts(value: string | Date | null | undefined):
  | { y: number; mo: number; d: number; h: number; mi: number }
  | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const u = new Date(value.getTime() + 3 * 60 * 60 * 1000);
    return { y: u.getUTCFullYear(), mo: u.getUTCMonth(), d: u.getUTCDate(), h: u.getUTCHours(), mi: u.getUTCMinutes() };
  }
  const s = String(value).trim();
  const naive = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (naive) {
    return { y: +naive[1], mo: +naive[2] - 1, d: +naive[3], h: +naive[4], mi: +naive[5] };
  }
  const dOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dOnly) return { y: +dOnly[1], mo: +dOnly[2] - 1, d: +dOnly[3], h: 0, mi: 0 };
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const u = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  return { y: u.getUTCFullYear(), mo: u.getUTCMonth(), d: u.getUTCDate(), h: u.getUTCHours(), mi: u.getUTCMinutes() };
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

/** "01 Apr 2026" — Kenya time */
export function formatDate(value: string | Date | null | undefined): string {
  const p = toKenyaParts(value);
  if (!p) return "—";
  return `${pad(p.d)} ${MONTHS[p.mo]} ${p.y}`;
}

/** "01 Apr 2026, 14:30" — Kenya time */
export function formatDateTime(value: string | Date | null | undefined): string {
  const p = toKenyaParts(value);
  if (!p) return "—";
  return `${pad(p.d)} ${MONTHS[p.mo]} ${p.y}, ${pad(p.h)}:${pad(p.mi)}`;
}
