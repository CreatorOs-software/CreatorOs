// ─── Number formatting ────────────────────────────────────────────────────────

/** Compact number: 1500 → "1.5K", 1_500_000 → "1.5M" */
export function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** EUR currency with scale: 1500 → "€1.5K", 1_500_000 → "€1.5M" */
export function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(1)}K`;
  return `€${Math.round(n)}`;
}

/** USD compact: 1500 → "$1.5k" (creator monthly revenue display) */
export function formatMoney(n: number): string {
  return `$${(n / 1000).toFixed(1)}k`;
}

// ─── Date formatting ──────────────────────────────────────────────────────────

/** "2024-01-15" → "15. Jan. 24" */
export function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

/** Short weekday: "2024-01-15" → "Mo" */
export function shortDay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", { weekday: "short" });
}

/** Days remaining until date (negative if past) */
export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

// ─── Phone numbers (E.164) ───────────────────────────────────────────────────

/** `true` for a well-formed E.164 number like "+4915112345678". */
export function isValidE164(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value);
}

/**
 * Best-effort cleanup of a hand-typed phone number into E.164.
 * Strips spaces / dashes / parens / slashes, turns a leading "00" into "+".
 * Returns `null` when the result still isn't valid E.164 (e.g. a national
 * "0…" number with no country code — we don't guess a country).
 */
export function normalizeE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.replace(/[\s()/\-.]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  return isValidE164(s) ? s : null;
}

// ─── Duration formatting ──────────────────────────────────────────────────────

/** Seconds → "M:SS": 125 → "2:05" */
export function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
