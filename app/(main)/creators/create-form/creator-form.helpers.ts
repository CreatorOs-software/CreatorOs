import { CREATOR_COLORS } from "./creator-form.constants";

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function pickColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return CREATOR_COLORS[Math.abs(hash) % CREATOR_COLORS.length];
}

export function fullName(vorname: string, nachname: string): string {
  return [vorname, nachname].filter(Boolean).join(" ").trim();
}
