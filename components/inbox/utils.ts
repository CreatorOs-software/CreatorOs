export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86_400_000 && d.getDate() === now.getDate())
    return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (diff < 7 * 86_400_000)
    return d.toLocaleDateString("de-DE", { weekday: "short" });
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
}

export function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getInitial(name: string | null | undefined, fallback: string): string {
  const src = name?.trim() || fallback;
  return (src[0] ?? "?").toUpperCase();
}

export function getDisplayName(name: string | null | undefined, email: string): string {
  return name?.trim() || email;
}
