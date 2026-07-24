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

// ─── Duration formatting ──────────────────────────────────────────────────────

/** Seconds → "M:SS": 125 → "2:05" */
export function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
