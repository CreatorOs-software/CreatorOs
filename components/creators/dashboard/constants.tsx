import {
  SiInstagram,
  SiOnlyfans,
  SiSpotify,
  SiTiktok,
  SiX,
  SiYoutube,
} from "react-icons/si";

export {
  fmt,
  fmtMoney,
  formatMoney,
  fmtDate,
  shortDay,
  daysUntil,
  fmtDuration,
} from "@/lib/formatters";

export const OAUTH_SUPPORTED = new Set(["youtube", "instagram"]);

// ─── Creator status ───────────────────────────────────────────────────────────

export const CREATOR_STATUS_CLASS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  "on-break": "bg-yellow-100 text-yellow-700",
  inactive: "bg-muted text-muted-foreground",
};

export const CREATOR_STATUS_LABEL: Record<string, string> = {
  active: "Aktiv",
  "on-break": "Pause",
  inactive: "Inaktiv",
};

export const STATUS_STYLE: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  incoming: { label: "Eingang", bg: "bg-muted", text: "text-muted-foreground" },
  evaluating: { label: "Prüfung", bg: "bg-blue-500/10", text: "text-blue-600" },
  negotiation: { label: "Verhandlung", bg: "bg-yellow-400/15", text: "text-yellow-700" },
  confirmed: { label: "Bestätigt", bg: "bg-green-500/10", text: "text-green-700" },
  production: { label: "Produktion", bg: "bg-orange-500/10", text: "text-orange-600" },
  approval: { label: "Freigabe", bg: "bg-purple-500/10", text: "text-purple-600" },
  scheduled: { label: "Geplant", bg: "bg-cyan-500/10", text: "text-cyan-600" },
  posted: { label: "Gepostet", bg: "bg-green-500/15", text: "text-green-600" },
  invoiced: { label: "Rechnung", bg: "bg-indigo-500/10", text: "text-indigo-600" },
  paid: { label: "Bezahlt", bg: "bg-green-500/20", text: "text-green-700" },
};

export const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  med: "bg-yellow-400",
  low: "bg-muted-foreground/40",
};

export const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: "Entwurf", color: "text-muted-foreground" },
  sent: { label: "Gestellt", color: "text-blue-600" },
  overdue: { label: "Überfällig", color: "text-red-500" },
  paid: { label: "Bezahlt", color: "text-green-700" },
};

export const LAUFEND = new Set([
  "confirmed",
  "production",
  "approval",
  "scheduled",
  "posted",
]);
export const PIPELINE = new Set(["incoming", "evaluating", "negotiation"]);
export const ALT = new Set(["invoiced", "paid"]);

export const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube: <SiYoutube />,
  instagram: <SiInstagram />,
  tiktok: <SiTiktok />,
  spotify: <SiSpotify />,
  onlyfans: <SiOnlyfans />,
  x: <SiX />,
};

export const PLATFORM_LABEL: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  spotify: "Spotify",
  onlyfans: "OnlyFans",
  x: "X",
};

export const PLATFORM_KEY: Record<string, string> = {
  YouTube: "youtube",
  Instagram: "instagram",
  TikTok: "tiktok",
  Spotify: "spotify",
  OnlyFans: "onlyfans",
  X: "x",
};

