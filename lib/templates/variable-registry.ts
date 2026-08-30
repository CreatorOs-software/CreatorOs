import type { Platform } from "@/lib/platforms/types";
import type { TemplateContext } from "@/domains/templates";

export type VariableGroup = "creator" | "brand" | "account";

export type VariableEntry = {
  path: string;
  label: string;
  group: VariableGroup;
  resolve: (ctx: TemplateContext) => string | number | null;
  format?: (value: string | number) => string;
};

const percent = (v: string | number) => `${Number(v).toFixed(1)}%`;
const number = (v: string | number) => Number(v).toLocaleString("de-DE");
const money = (v: string | number) => `${Number(v).toLocaleString("de-DE")} €`;

const PLATFORMS: Platform[] = ["instagram", "youtube", "tiktok", "spotify", "onlyfans", "x"];

const PLATFORM_FIELDS: {
  key: "audience" | "engagementRate" | "views30d" | "audienceGrowth7d" | "audienceGrowth30d" | "monthlyRevenue";
  label: string;
  format?: (v: string | number) => string;
}[] = [
  { key: "audience", label: "Follower/Abonnenten", format: number },
  { key: "engagementRate", label: "Engagement-Rate", format: percent },
  { key: "views30d", label: "Views (30 Tage)", format: number },
  { key: "audienceGrowth7d", label: "Wachstum (7 Tage)", format: number },
  { key: "audienceGrowth30d", label: "Wachstum (30 Tage)", format: number },
  { key: "monthlyRevenue", label: "Monatsumsatz", format: money },
];

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  spotify: "Spotify",
  onlyfans: "OnlyFans",
  x: "X",
};

const platformEntries: VariableEntry[] = PLATFORMS.flatMap((platform) =>
  PLATFORM_FIELDS.map(({ key, label, format }) => ({
    path: `creator.platform.${platform}.${key}`,
    label: `Creator – ${PLATFORM_LABELS[platform]} ${label}`,
    group: "creator" as const,
    resolve: (ctx: TemplateContext) => ctx.creator?.platform[platform]?.[key] ?? null,
    format,
  })),
);

export const VARIABLE_REGISTRY: VariableEntry[] = [
  // ── creator ──────────────────────────────────────────────────────────────────
  { path: "creator.name", label: "Creator – Name", group: "creator", resolve: (ctx) => ctx.creator?.name ?? null },
  { path: "creator.firstName", label: "Creator – Vorname", group: "creator", resolve: (ctx) => ctx.creator?.firstName ?? null },
  { path: "creator.email", label: "Creator – E-Mail", group: "creator", resolve: (ctx) => ctx.creator?.email ?? null },
  { path: "creator.handle", label: "Creator – Handle", group: "creator", resolve: (ctx) => ctx.creator?.handle ?? null },
  { path: "creator.followers", label: "Creator – Follower (gesamt)", group: "creator", resolve: (ctx) => ctx.creator?.followers ?? null },
  { path: "creator.monthlyRevenue", label: "Creator – Monatsumsatz", group: "creator", resolve: (ctx) => ctx.creator?.monthlyRevenue ?? null, format: money },
  ...platformEntries,

  // ── brand ────────────────────────────────────────────────────────────────────
  { path: "brand.name", label: "Brand – Name", group: "brand", resolve: (ctx) => ctx.brand?.name ?? null },
  { path: "brand.shortCode", label: "Brand – Kürzel", group: "brand", resolve: (ctx) => ctx.brand?.shortCode ?? null },
  { path: "brand.industry", label: "Brand – Branche", group: "brand", resolve: (ctx) => ctx.brand?.industry ?? null },
  { path: "brand.contactName", label: "Brand – Ansprechpartner", group: "brand", resolve: (ctx) => ctx.brand?.contactName ?? null },
  { path: "brand.contactEmail", label: "Brand – Kontakt-E-Mail", group: "brand", resolve: (ctx) => ctx.brand?.contactEmail ?? null },

  // ── account (eigenes Profil / Agentur) ──────────────────────────────────────
  { path: "account.agencyName", label: "Account – Agenturname", group: "account", resolve: (ctx) => ctx.account.agencyName || null },
  { path: "account.userName", label: "Account – Dein Name", group: "account", resolve: (ctx) => ctx.account.userName || null },
  { path: "account.userEmail", label: "Account – Deine E-Mail", group: "account", resolve: (ctx) => ctx.account.userEmail || null },
];

export const VARIABLE_MAP: Map<string, VariableEntry> = new Map(
  VARIABLE_REGISTRY.map((entry) => [entry.path, entry]),
);
