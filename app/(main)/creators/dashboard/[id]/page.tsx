"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  TrendingUp,
  User,
} from "lucide-react";
import { useState } from "react";
import {
  SiInstagram,
  SiOnlyfans,
  SiSpotify,
  SiTiktok,
  SiX,
  SiYoutube,
} from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBar, StatusBarGroup } from "@/components/dashboard/status-bar";
import { CalendarCard } from "@/components/dashboard/calendar-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  CreatorAccount,
  MetricsCurrent,
  MetricsDaily,
} from "@/domains/social-accounts/types";
import type { Creator } from "@/domains/creators/types";

const OAUTH_SUPPORTED = new Set(["youtube"]);

const NOW = Date.now();

// ─── Status / Priority Maps ───────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  incoming:    { label: "Eingang",     bg: "bg-muted",           text: "text-muted-foreground" },
  evaluating:  { label: "Prüfung",     bg: "bg-blue-500/10",     text: "text-blue-600" },
  negotiation: { label: "Verhandlung", bg: "bg-yellow-400/15",   text: "text-yellow-700" },
  confirmed:   { label: "Bestätigt",   bg: "bg-green-500/10",    text: "text-green-700" },
  production:  { label: "Produktion",  bg: "bg-orange-500/10",   text: "text-orange-600" },
  approval:    { label: "Freigabe",    bg: "bg-purple-500/10",   text: "text-purple-600" },
  scheduled:   { label: "Geplant",     bg: "bg-cyan-500/10",     text: "text-cyan-600" },
  posted:      { label: "Gepostet",    bg: "bg-green-500/15",    text: "text-green-600" },
  invoiced:    { label: "Rechnung",    bg: "bg-indigo-500/10",   text: "text-indigo-600" },
  paid:        { label: "Bezahlt",     bg: "bg-green-500/20",    text: "text-green-700" },
};

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  med:  "bg-yellow-400",
  low:  "bg-muted-foreground/40",
};

const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  draft:   { label: "Entwurf",    color: "text-muted-foreground" },
  sent:    { label: "Gestellt",   color: "text-blue-600" },
  overdue: { label: "Überfällig", color: "text-red-500" },
  paid:    { label: "Bezahlt",    color: "text-green-700" },
};

// ─── Status Groupings ─────────────────────────────────────────────────────────

const LAUFEND = new Set(["confirmed", "production", "approval", "scheduled", "posted"]);
const PIPELINE = new Set(["incoming", "evaluating", "negotiation"]);
const ALT = new Set(["invoiced", "paid"]);

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube:   <SiYoutube />,
  instagram: <SiInstagram />,
  tiktok:    <SiTiktok />,
  spotify:   <SiSpotify />,
  onlyfans:  <SiOnlyfans />,
  x:         <SiX />,
};

const PLATFORM_LABEL: Record<string, string> = {
  youtube:   "YouTube",
  instagram: "Instagram",
  tiktok:    "TikTok",
  spotify:   "Spotify",
  onlyfans:  "OnlyFans",
  x:         "X",
};

const PLATFORM_KEY: Record<string, string> = {
  YouTube:   "youtube",
  Instagram: "instagram",
  TikTok:    "tiktok",
  Spotify:   "spotify",
  OnlyFans:  "onlyfans",
  X:         "x",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type MetricsResponse = {
  accounts: CreatorAccount[];
  metrics: Record<string, { current: MetricsCurrent | null; daily: MetricsDaily[] }>;
};

type DealFull = {
  id: string;
  title: string;
  budget: number;
  status: string;
  priority: string;
  deadline: string | null;
  campaign_type: string | null;
  deliverables: string[];
  description: string | null;
  created_at: string;
  brands: {
    company_name: string;
    color: string;
    short_code: string;
    contact_name: string | null;
    contact_email: string | null;
  } | null;
};

type Invoice = {
  id: string;
  number: string;
  amount: number;
  status: string;
  issued_at: string | null;
  due_date: string | null;
  paid_at: string | null;
  brands: { company_name: string; color: string; short_code: string } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(1)}K`;
  return `€${Math.round(n)}`;
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function shortDay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", { weekday: "short" });
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title="Kopieren"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function Avatar({ c }: { c: Creator }) {
  return (
    <span
      className="w-10 h-10 rounded-xl inline-flex items-center justify-center font-bold text-white text-sm shrink-0"
      style={{ background: c.color }}
    >
      {c.initials}
    </span>
  );
}

function BrandAvatar({
  brand,
  size = "md",
}: {
  brand: { color: string; short_code: string; company_name: string };
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "rounded-md shrink-0 inline-flex items-center justify-center font-bold text-white",
        size === "sm" ? "w-5 h-5 text-[8px]" : "w-6 h-6 text-[9px]",
      )}
      style={{ background: brand.color }}
      title={brand.company_name}
    >
      {brand.short_code.slice(0, 2).toUpperCase()}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.incoming;
  return (
    <span className={cn("shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full leading-none", s.bg, s.text)}>
      {s.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSIGHTS TAB — chart & metric components
// ═══════════════════════════════════════════════════════════════════════════════

function MiniBarChart({
  title,
  data,
  valueKey,
  formatter = fmt,
  className,
}: {
  title: string;
  data: MetricsDaily[];
  valueKey: keyof MetricsDaily;
  formatter?: (v: number) => string;
  className?: string;
}) {
  const [days, setDays] = useState<7 | 30>(7);
  const slice = data.slice(-days);
  const values = slice.map((d) => Number(d[valueKey] ?? 0));
  const max = Math.max(...values, 1);
  const total = values.reduce((s, v) => s + v, 0);

  return (
    <div className={cn("bg-card rounded-2xl p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-lg font-semibold">{title}</p>
        <div className="flex items-center gap-1">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-md transition-colors",
                days === d
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {d}T
            </button>
          ))}
          <CopyButton value={formatter(total)} />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-4xl font-light tracking-tight">{formatter(total)}</span>
        <div className="ml-1">
          <p className="text-xs text-muted-foreground">Letzte</p>
          <p className="text-xs text-muted-foreground">{days} Tage</p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-1 h-24">
        {slice.map((d, idx) => {
          const val = Number(d[valueKey] ?? 0);
          const heightPct = max > 0 ? (val / max) * 100 : 0;
          return (
            <div key={idx} className="flex flex-col items-center flex-1 group">
              <div className="relative flex items-end justify-center w-full h-20">
                <div
                  className="rounded-full w-full bg-secondary group-hover:bg-primary transition-colors duration-150"
                  style={{
                    height: `${Math.max(heightPct, 6)}%`,
                    maxWidth: days === 30 ? "4px" : "10px",
                  }}
                />
              </div>
              {days === 7 && (
                <span className="text-[10px] mt-1.5 text-muted-foreground">
                  {shortDay(d.date)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubscriberChart({
  data,
  className,
  title = "Abonnenten",
  color = "var(--chart-yellow)",
  gradientId = "subGrad",
}: {
  data: MetricsDaily[];
  className?: string;
  title?: string;
  color?: string;
  gradientId?: string;
}) {
  const last7 = data.slice(-7);
  const values = last7.map((d) => d.audience ?? 0);
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  const range = max - min || 1;

  return (
    <div className={cn("bg-card rounded-2xl p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-lg font-semibold">{title}</p>
        <CopyButton value={fmt(values[values.length - 1] ?? 0)} />
      </div>

      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-4xl font-light tracking-tight">
          {fmt(values[values.length - 1] ?? 0)}
        </span>
        <div className="ml-1">
          <p className="text-xs text-muted-foreground">Aktuell</p>
          <p className="text-xs text-muted-foreground">Gesamt</p>
        </div>
      </div>

      <div className="h-24 w-full">
        {values.length > 1 && (
          <svg
            viewBox={`0 0 ${(last7.length - 1) * 40} 80`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={[
                ...values.map(
                  (v, i) =>
                    `${i === 0 ? "M" : "L"} ${i * 40} ${80 - ((v - min) / range) * 70}`,
                ),
                `L ${(values.length - 1) * 40} 80`,
                "L 0 80 Z",
              ].join(" ")}
              fill={`url(#${gradientId})`}
            />
            <path
              d={values
                .map(
                  (v, i) =>
                    `${i === 0 ? "M" : "L"} ${i * 40} ${80 - ((v - min) / range) * 70}`,
                )
                .join(" ")}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      <div className="flex justify-between mt-1">
        {last7.map((d, i) => (
          <span key={i} className="text-[10px] text-muted-foreground">
            {shortDay(d.date)}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <CopyButton value={value} />
      </div>
      <p className="text-4xl font-light tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function YouTubeContent({ current, daily }: { current: MetricsCurrent; daily: MetricsDaily[] }) {
  const hasDaily = daily.length >= 2;
  const ytRaw = (current.raw ?? {}) as {
    avgViewDurationSecs?: number;
    watchTimeHours30d?: number;
    subscribersGained30d?: number;
    subscribersLost30d?: number;
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      {hasDaily ? (
        <MiniBarChart title="Views" data={daily} valueKey="views" className="col-span-12 lg:col-span-4" />
      ) : (
        <div className="col-span-12 lg:col-span-4 bg-card rounded-2xl p-5 flex items-center justify-center text-sm text-muted-foreground">
          Noch keine Verlaufsdaten
        </div>
      )}

      {hasDaily ? (
        <SubscriberChart data={daily} className="col-span-12 lg:col-span-4" />
      ) : (
        <div className="col-span-12 lg:col-span-4 bg-card rounded-2xl p-5 flex items-center justify-center text-sm text-muted-foreground">
          Noch keine Verlaufsdaten
        </div>
      )}

      <div className="col-span-12 lg:col-span-4 bg-card rounded-2xl p-5 flex flex-col justify-between gap-6">
        <StatBlock
          label="Avg. View-Zeit"
          value={fmtDuration(ytRaw.avgViewDurationSecs ?? 0)}
          sub={`${(ytRaw.watchTimeHours30d ?? 0).toFixed(0)}h Watch Time (30d)`}
        />
        <div className="h-px bg-border-light" />
        <StatBlock
          label="Abo-Gewinn (30d)"
          value={`+${fmt(ytRaw.subscribersGained30d ?? 0)}`}
          sub={
            (ytRaw.subscribersLost30d ?? 0) > 0
              ? `−${fmt(ytRaw.subscribersLost30d ?? 0)} verloren`
              : undefined
          }
        />
      </div>

      {hasDaily && (
        <MiniBarChart title="Likes" data={daily} valueKey="likes" className="col-span-12 lg:col-span-4" />
      )}
      {hasDaily && (
        <MiniBarChart title="Kommentare" data={daily} valueKey="comments" className="col-span-12 lg:col-span-4" />
      )}

      <div className="col-span-12 lg:col-span-4 bg-card rounded-2xl p-5 flex flex-col justify-between gap-6">
        <StatBlock label="Views (30d)" value={fmt(current.views_30d)} />
        <div className="h-px bg-border-light" />
        <StatBlock
          label="Engagement Rate"
          value={`${current.engagement_rate?.toFixed(1) ?? "0"}%`}
          sub="Likes + Kommentare / Views"
        />
      </div>
    </div>
  );
}

function InstagramContent({ current, daily }: { current: MetricsCurrent; daily: MetricsDaily[] }) {
  const hasDaily = daily.length >= 2;
  const raw = (current.raw ?? {}) as {
    reach30d?: number;
    profileViews30d?: number;
    mediaCount?: number;
    websiteClicks7d?: number;
    websiteClicks30d?: number;
    storyViews?: number;
    reelReach30d?: number;
    feedPosts30d?: number;
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      {hasDaily ? (
        <SubscriberChart
          data={daily}
          title="Follower"
          color="var(--color-primary)"
          gradientId="igFollowerGrad"
          className="col-span-12 lg:col-span-4"
        />
      ) : (
        <div className="col-span-12 lg:col-span-4 bg-card rounded-2xl p-5 flex flex-col justify-between gap-6">
          <StatBlock
            label="Follower"
            value={fmt(current.audience)}
            sub={
              current.audience_growth_7d !== 0
                ? `${current.audience_growth_7d >= 0 ? "+" : ""}${fmt(current.audience_growth_7d)} diese Woche`
                : undefined
            }
          />
        </div>
      )}

      {hasDaily ? (
        <MiniBarChart title="Views" data={daily} valueKey="views" className="col-span-12 lg:col-span-4" />
      ) : (
        <div className="col-span-12 lg:col-span-4 bg-card rounded-2xl p-5 flex flex-col justify-between gap-6">
          <StatBlock label="Views (30d)" value={fmt(current.views_30d)} />
        </div>
      )}

      <div className="col-span-12 lg:col-span-4 bg-card rounded-2xl p-5 flex flex-col justify-between gap-6">
        <StatBlock label="Reach (30d)" value={fmt(raw.reach30d ?? 0)} />
        <div className="h-px bg-border-light" />
        <StatBlock label="Profilbesuche (30d)" value={fmt(raw.profileViews30d ?? 0)} />
      </div>

      <div className="col-span-12 lg:col-span-4 bg-card rounded-2xl p-5 flex flex-col justify-between gap-6">
        <StatBlock label="Story Views (live)" value={fmt(raw.storyViews ?? 0)} sub="Aktuell laufende Stories" />
        <div className="h-px bg-border-light" />
        <StatBlock label="Reel Reichweite (30d)" value={fmt(raw.reelReach30d ?? 0)} />
      </div>

      <div className="col-span-12 lg:col-span-4 bg-card rounded-2xl p-5 flex flex-col justify-between gap-6">
        <StatBlock
          label="Linkklicks (7d)"
          value={fmt(raw.websiteClicks7d ?? 0)}
          sub={`${fmt(raw.websiteClicks30d ?? 0)} in 30d`}
        />
        <div className="h-px bg-border-light" />
        <StatBlock
          label="Feed Posts (30d)"
          value={fmt(raw.feedPosts30d ?? 0)}
          sub={`${fmt(raw.mediaCount ?? 0)} Beiträge gesamt`}
        />
      </div>

      <div className="col-span-12 lg:col-span-4 bg-card rounded-2xl p-5 flex flex-col justify-between gap-6">
        <StatBlock
          label="Follower-Wachstum (7d)"
          value={`${current.audience_growth_7d >= 0 ? "+" : ""}${fmt(current.audience_growth_7d)}`}
          sub={`${current.audience_growth_30d >= 0 ? "+" : ""}${fmt(current.audience_growth_30d)} (30d)`}
        />
      </div>
    </div>
  );
}

function PlatformContent({
  account,
  current,
  daily,
}: {
  account: CreatorAccount;
  current: MetricsCurrent | null;
  daily: MetricsDaily[];
}) {
  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <TrendingUp className="w-10 h-10 opacity-20" />
        <p className="text-sm">Noch keine Daten — starte den ersten Sync im Creator-Profil.</p>
      </div>
    );
  }
  if (account.platform === "instagram") return <InstagramContent current={current} daily={daily} />;
  return <YouTubeContent current={current} daily={daily} />;
}

function DisconnectedPlatformTab({
  creatorId,
  platformKey,
  platformLabel,
}: {
  creatorId: string;
  platformKey: string;
  platformLabel: string;
}) {
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const supported = OAUTH_SUPPORTED.has(platformKey);

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creator_id: creatorId, platform: platformKey }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Fehler beim Erstellen des Links");
      else setInviteUrl(data.invite_url);
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center py-24 gap-5">
        <div className="flex flex-col items-center gap-4 max-w-xs text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-2xl text-muted-foreground">
            {PLATFORM_ICONS[platformKey] ?? null}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold">Achtung!</p>
            <p className="text-sm text-muted-foreground">Es ist noch kein Account verbunden</p>
          </div>
          {supported ? (
            <Button onClick={handleConnect} disabled={loading} className="gap-2 mt-1">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Jetzt {platformLabel} verbinden
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              OAuth für {platformLabel} wird demnächst unterstützt.
            </p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>

      <Dialog open={!!inviteUrl} onOpenChange={(o) => !o && setInviteUrl(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{platformLabel} verbinden</DialogTitle>
            <DialogDescription>
              Teile diesen Link mit dem Creator. Er ist 48 Stunden gültig und startet den OAuth-Flow direkt.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2.5">
            <p className="flex-1 text-xs font-mono truncate text-muted-foreground">{inviteUrl}</p>
            <button
              onClick={() => {
                if (!inviteUrl) return;
                navigator.clipboard.writeText(inviteUrl).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
              className="shrink-0 p-1 rounded hover:bg-background transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
          <a
            href={inviteUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Link im Browser öffnen
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ÜBERSICHT TAB — deal / finance panels
// ═══════════════════════════════════════════════════════════════════════════════

function LaufendeDeals({ deals }: { deals: DealFull[] }) {
  const active = deals.filter((d) => LAUFEND.has(d.status));

  return (
    <div className="bg-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Laufende Deals</h3>
        {active.length > 0 && <span className="text-xs text-muted-foreground">{active.length}</span>}
      </div>

      {active.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Keine laufenden Deals</p>
      ) : (
        <div className="flex flex-col divide-y divide-border-light">
          {active.map((deal) => {
            const days = deal.deadline ? daysUntil(deal.deadline) : null;
            return (
              <div key={deal.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-2">
                {/* Header row */}
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      PRIORITY_DOT[deal.priority] ?? PRIORITY_DOT.low,
                    )}
                  />
                  {deal.brands && <BrandAvatar brand={deal.brands} />}
                  <span className="flex-1 text-xs font-medium truncate">{deal.title}</span>
                  <StatusBadge status={deal.status} />
                  <span className="shrink-0 text-xs font-medium tabular-nums">
                    {fmtMoney(Number(deal.budget))}
                  </span>
                </div>

                {/* Deliverables / Erfüllungskriterien */}
                {deal.deliverables.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-6">
                    {deal.deliverables.map((d, i) => (
                      <span
                        key={i}
                        className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}

                {/* Meta row */}
                <div className="flex items-center gap-4 pl-6 text-[10px] text-muted-foreground flex-wrap">
                  {days !== null && (
                    <span
                      className={cn(
                        "flex items-center gap-1",
                        days < 0 ? "text-red-500" : days <= 3 ? "text-red-500" : days <= 7 ? "text-yellow-600" : "",
                      )}
                    >
                      <Clock className="w-3 h-3" />
                      {days < 0
                        ? `${Math.abs(days)}d überfällig`
                        : days === 0
                          ? "Heute fällig"
                          : `${days}d — ${fmtDate(deal.deadline!)}`}
                    </span>
                  )}
                  {deal.brands?.contact_name && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {deal.brands.contact_name}
                    </span>
                  )}
                  <span className="flex items-center gap-1 ml-auto opacity-40">
                    <RefreshCw className="w-3 h-3" />
                    Nachverhandlung: —
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PipelinePanel({ deals }: { deals: DealFull[] }) {
  const pipeline = deals.filter((d) => PIPELINE.has(d.status));

  return (
    <div className="bg-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Pipeline</h3>
        {pipeline.length > 0 && <span className="text-xs text-muted-foreground">{pipeline.length}</span>}
      </div>

      {pipeline.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Keine anstehenden Deals</p>
      ) : (
        <div className="flex flex-col divide-y divide-border-light">
          {pipeline.map((deal) => (
            <div key={deal.id} className="flex items-center gap-2 py-2.5 first:pt-0 last:pb-0">
              {deal.brands ? (
                <BrandAvatar brand={deal.brands} />
              ) : (
                <span className="w-6 h-6 rounded-md shrink-0 bg-muted" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate leading-tight">{deal.title}</p>
                {deal.brands && (
                  <p className="text-[10px] text-muted-foreground truncate">{deal.brands.company_name}</p>
                )}
              </div>
              <StatusBadge status={deal.status} />
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {fmtMoney(Number(deal.budget))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AlteDealsPanel({ deals }: { deals: DealFull[] }) {
  const old = deals.filter((d) => ALT.has(d.status));

  return (
    <div className="bg-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Alte Deals</h3>
        {old.length > 0 && <span className="text-xs text-muted-foreground">{old.length}</span>}
      </div>

      {old.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Keine abgeschlossenen Deals</p>
      ) : (
        <div className="flex flex-col divide-y divide-border-light">
          {old.map((deal) => (
            <div key={deal.id} className="flex items-center gap-2 py-2.5 first:pt-0 last:pb-0">
              {deal.brands ? (
                <BrandAvatar brand={deal.brands} size="sm" />
              ) : (
                <span className="w-5 h-5 rounded shrink-0 bg-muted opacity-50" />
              )}
              <p className="flex-1 text-xs text-muted-foreground truncate">{deal.title}</p>
              <StatusBadge status={deal.status} />
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {fmtMoney(Number(deal.budget))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FinanzenPanel({ deals, invoices }: { deals: DealFull[]; invoices: Invoice[] }) {
  const earned = deals.filter((d) => d.status === "paid").reduce((s, d) => s + Number(d.budget), 0);
  const invoiced = deals.filter((d) => d.status === "invoiced").reduce((s, d) => s + Number(d.budget), 0);
  const pipelineVal = deals
    .filter((d) => PIPELINE.has(d.status) || LAUFEND.has(d.status))
    .reduce((s, d) => s + Number(d.budget), 0);

  const overdueCount = invoices.filter(
    (inv) =>
      (inv.status === "sent" || inv.status === "overdue") &&
      inv.due_date &&
      new Date(inv.due_date).getTime() < NOW,
  ).length;

  return (
    <div className="bg-card rounded-2xl p-5 flex flex-col gap-4">
      <h3 className="text-sm font-semibold">Finanzen</h3>

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Umsatz kumuliert</span>
          <span className="text-xl font-light tabular-nums">{fmtMoney(earned)}</span>
        </div>
        <div className="h-px bg-border-light" />
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">In Abrechnung</span>
          <span className={cn("text-sm tabular-nums", invoiced > 0 ? "text-indigo-600" : "text-muted-foreground")}>
            {fmtMoney(invoiced)}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Pipeline-Wert</span>
          <span className="text-sm tabular-nums text-muted-foreground">{fmtMoney(pipelineVal)}</span>
        </div>
        {overdueCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-red-500 bg-red-500/5 rounded-lg px-2.5 py-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {overdueCount} Rechnung{overdueCount > 1 ? "en" : ""} überfällig
          </div>
        )}
      </div>

      {invoices.length > 0 && (
        <>
          <div className="h-px bg-border-light" />
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-medium">Rechnungen</p>
            {invoices.slice(0, 6).map((inv) => {
              const style = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.draft;
              const isOverdue =
                (inv.status === "sent" || inv.status === "overdue") &&
                inv.due_date &&
                new Date(inv.due_date).getTime() < NOW;
              return (
                <div key={inv.id} className="flex items-center gap-2">
                  {inv.brands && <BrandAvatar brand={inv.brands} size="sm" />}
                  <span className="flex-1 text-[10px] text-muted-foreground truncate">{inv.number}</span>
                  {(inv.due_date || inv.paid_at) && (
                    <span className={cn("text-[9px]", isOverdue ? "text-red-500" : "text-muted-foreground")}>
                      {inv.paid_at ? fmtDate(inv.paid_at) : inv.due_date ? fmtDate(inv.due_date) : ""}
                    </span>
                  )}
                  <span className={cn("text-xs tabular-nums font-medium", style.color)}>
                    {fmtMoney(Number(inv.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function GesamtüberblickPanel({ creator, deals }: { creator: Creator; deals: DealFull[] }) {
  const totalRevenue = deals.filter((d) => d.status === "paid").reduce((s, d) => s + Number(d.budget), 0);
  const activeCount = deals.filter((d) => LAUFEND.has(d.status)).length;
  const paidCount = deals.filter((d) => d.status === "paid").length;

  return (
    <div className="bg-card rounded-2xl p-5 flex flex-col gap-4">
      <h3 className="text-sm font-semibold">Gesamtüberblick</h3>

      <div className="flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Plattformen</p>
        {creator.platforms.length === 0 ? (
          <p className="text-xs text-muted-foreground">Keine Plattformen konfiguriert</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {creator.platforms.map((p) => {
              const key = PLATFORM_KEY[p] ?? p.toLowerCase();
              return (
                <div key={p} className="flex items-center gap-1.5 text-xs bg-muted px-2 py-1 rounded-lg">
                  <span className="text-sm leading-none opacity-70">{PLATFORM_ICONS[key] ?? null}</span>
                  {p}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-px bg-border-light" />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] text-muted-foreground">Laufende Deals</p>
          <p className="text-2xl font-light">{activeCount}</p>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] text-muted-foreground">Abgeschlossen</p>
          <p className="text-2xl font-light">{paidCount}</p>
        </div>
      </div>

      <div className="h-px bg-border-light" />

      <div className="flex flex-col gap-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Umsatz kumuliert</p>
        <p className="text-3xl font-light tracking-tight">{fmtMoney(totalRevenue)}</p>
        {paidCount > 0 && (
          <p className="text-[10px] text-muted-foreground">aus {paidCount} Deals</p>
        )}
      </div>

      <div
        className={cn(
          "text-[10px] font-medium px-2 py-1 rounded-lg w-fit",
          creator.status === "active"
            ? "bg-green-500/10 text-green-700"
            : creator.status === "on-break"
              ? "bg-yellow-400/15 text-yellow-700"
              : "bg-muted text-muted-foreground",
        )}
      >
        {creator.status === "active" ? "Aktiv" : creator.status === "on-break" ? "Pause" : "Inaktiv"}
      </div>
    </div>
  );
}

function AufgabenPanel({ deals }: { deals: DealFull[] }) {
  type Todo = { text: string; priority: "high" | "med" | "low" };
  const todos: Todo[] = [];

  deals.forEach((deal) => {
    if (deal.deadline && LAUFEND.has(deal.status)) {
      const days = daysUntil(deal.deadline);
      if (days >= 0 && days <= 7) {
        todos.push({
          text: `Deadline in ${days}d: ${deal.title}`,
          priority: days <= 3 ? "high" : "med",
        });
      }
    }
    if (deal.status === "negotiation") {
      todos.push({
        text: `Verhandlung läuft: ${deal.brands?.company_name ?? deal.title}`,
        priority: deal.priority as "high" | "med" | "low",
      });
    }
    if (deal.status === "approval") {
      todos.push({
        text: `Freigabe ausstehend: ${deal.title}`,
        priority: "med",
      });
    }
  });

  return (
    <div className="bg-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Aufgaben</h3>
        {todos.length > 0 && <span className="text-xs text-muted-foreground">{todos.length}</span>}
      </div>

      {todos.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Keine offenen Aufgaben</p>
      ) : (
        <div className="flex flex-col divide-y divide-border-light">
          {todos.map((todo, i) => (
            <div key={i} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", PRIORITY_DOT[todo.priority])} />
              <p className="flex-1 text-xs">{todo.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UebersichtTab({
  creator,
  creatorId,
  deals,
  invoices,
  isPending,
}: {
  creator: Creator | null;
  creatorId: string;
  deals: DealFull[];
  invoices: Invoice[];
  isPending: boolean;
}) {
  if (isPending || !creator) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 pb-6">
      {/* Left column — deals + calendar */}
      <div className="xl:col-span-7 flex flex-col gap-4">
        <LaufendeDeals deals={deals} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PipelinePanel deals={deals} />
          <AlteDealsPanel deals={deals} />
        </div>
        <CalendarCard creatorId={creatorId} />
      </div>

      {/* Right column — overview, finance, todos */}
      <div className="xl:col-span-5 flex flex-col gap-4">
        <GesamtüberblickPanel creator={creator} deals={deals} />
        <FinanzenPanel deals={deals} invoices={invoices} />
        <AufgabenPanel deals={deals} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function CreatorDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: creatorData } = useQuery<{ creator: Creator }>({
    queryKey: ["creator", id],
    queryFn: () => fetch(`/api/creators/${id}`).then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const { data: metricsData, isPending: metricsPending } = useQuery<MetricsResponse>({
    queryKey: ["creator-metrics", id],
    queryFn: () => fetch(`/api/creators/${id}/metrics`).then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const { data: dealsData, isPending: dealsPending } = useQuery<{ deals: DealFull[] }>({
    queryKey: ["creator-deals-full", id],
    queryFn: () => fetch(`/api/creators/${id}/deals`).then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const { data: invoicesData } = useQuery<{ invoices: Invoice[] }>({
    queryKey: ["creator-invoices", id],
    queryFn: () => fetch(`/api/creators/${id}/invoices`).then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const creator = creatorData?.creator ?? null;
  const accounts = metricsData?.accounts ?? [];
  const metrics = metricsData?.metrics ?? {};
  const deals = dealsData?.deals ?? [];
  const invoices = invoicesData?.invoices ?? [];

  // Insights tab — platform tab logic
  const activeAccounts = accounts.filter((a) => a.sync_status !== "disconnected");
  const firstAccount = activeAccounts[0];
  const firstCurrent = firstAccount ? (metrics[firstAccount.id]?.current ?? null) : null;
  const connectedKeys = new Set(activeAccounts.map((a) => a.platform as string));
  const disconnectedDisplayNames = (creator?.platforms ?? []).filter(
    (p) => !connectedKeys.has(PLATFORM_KEY[p] ?? p.toLowerCase()),
  );
  const hasPlatforms = (creator?.platforms ?? []).length > 0;
  const disTabValue = (displayName: string) =>
    `dis-${PLATFORM_KEY[displayName] ?? displayName.toLowerCase()}`;
  const defaultInsightsTab =
    firstAccount?.id ??
    (disconnectedDisplayNames[0] ? disTabValue(disconnectedDisplayNames[0]) : undefined);

  return (
    <div className="h-full flex flex-col">
      {/* Nav */}
      <div className="shrink-0 flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        {creator && (
          <div className="flex items-center gap-2">
            <Avatar c={creator} />
            <span className="text-sm text-muted-foreground">
              {creator.handle ?? creator.full_name}
            </span>
          </div>
        )}
      </div>

      {/* Top-level tabs */}
      <Tabs defaultValue="uebersicht" className="flex-1 min-h-0 flex flex-col gap-0">
        <TabsList variant="underline" className="shrink-0 mb-6">
          <TabsTrigger value="uebersicht">Übersicht</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* ── Übersicht ─────────────────────────────────────────────────── */}
          <TabsContent value="uebersicht">
            <UebersichtTab
              creator={creator}
              creatorId={id}
              deals={deals}
              invoices={invoices}
              isPending={dealsPending}
            />
          </TabsContent>

          {/* ── Insights ──────────────────────────────────────────────────── */}
          <TabsContent value="insights">
            {metricsPending ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !hasPlatforms ? (
              <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-24">
                <TrendingUp className="w-10 h-10 opacity-20" />
                <p className="text-sm font-medium">Keine Plattform konfiguriert</p>
              </div>
            ) : (
              <Tabs defaultValue={defaultInsightsTab} className="flex flex-col gap-6 pb-6">
                <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
                  <div>
                    {firstCurrent && (
                      <StatusBarGroup>
                        <StatusBar label="Abonnenten" value={fmt(firstCurrent.audience)} variant="dark" />
                        <StatusBar label="Views (30d)" value={fmt(firstCurrent.views_30d)} variant="yellow" />
                        <StatusBar
                          label="Engagement"
                          value={`${firstCurrent.engagement_rate?.toFixed(1) ?? "0"}%`}
                          variant="striped"
                        />
                        {firstCurrent.monthly_revenue != null && (
                          <StatusBar
                            label="MTD Revenue"
                            value={fmtMoney(firstCurrent.monthly_revenue)}
                            variant="light"
                          />
                        )}
                      </StatusBarGroup>
                    )}
                  </div>

                  <TabsList variant="underline">
                    {activeAccounts.map((a) => (
                      <TabsTrigger key={a.id} value={a.id}>
                        <span className="text-lg leading-none opacity-60">
                          {PLATFORM_ICONS[a.platform] ?? null}
                        </span>
                        {PLATFORM_LABEL[a.platform] ?? a.platform}
                      </TabsTrigger>
                    ))}
                    {disconnectedDisplayNames.map((p) => {
                      const key = PLATFORM_KEY[p] ?? p.toLowerCase();
                      return (
                        <TabsTrigger key={key} value={disTabValue(p)}>
                          <span className="text-lg leading-none opacity-60">
                            {PLATFORM_ICONS[key] ?? null}
                          </span>
                          {p}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>

                {activeAccounts.map((a) => (
                  <TabsContent key={a.id} value={a.id}>
                    <PlatformContent
                      account={a}
                      current={metrics[a.id]?.current ?? null}
                      daily={metrics[a.id]?.daily ?? []}
                    />
                  </TabsContent>
                ))}

                {disconnectedDisplayNames.map((p) => {
                  const key = PLATFORM_KEY[p] ?? p.toLowerCase();
                  return (
                    <TabsContent key={key} value={disTabValue(p)}>
                      <DisconnectedPlatformTab
                        creatorId={id}
                        platformKey={key}
                        platformLabel={p}
                      />
                    </TabsContent>
                  );
                })}

              </Tabs>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
