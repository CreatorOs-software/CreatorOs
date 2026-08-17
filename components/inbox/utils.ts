export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });
}

export function getInitial(name: string): string {
  return (name[0] ?? "?").toUpperCase();
}
