export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function fullName(vorname: string, nachname: string): string {
  return [vorname, nachname].filter(Boolean).join(" ").trim();
}
