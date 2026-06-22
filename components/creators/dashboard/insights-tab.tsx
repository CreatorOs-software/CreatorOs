"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CreatorAccount, MetricsCurrent, MetricsDaily } from "@/domains/social-accounts/types";
import { OAUTH_SUPPORTED, PLATFORM_ICONS, fmt, fmtDuration, fmtMoney, shortDay } from "./constants";

// ─── Shared chart helpers ─────────────────────────────────────────────────────

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
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

export function StatBlock({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
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

export function MiniBarChart({
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
        <span className="text-4xl font-light tracking-tight">
          {formatter(total)}
        </span>
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

export function SubscriberChart({
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

function YouTubeContent({
  current,
  daily,
}: {
  current: MetricsCurrent;
  daily: MetricsDaily[];
}) {
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

function InstagramContent({
  current,
  daily,
}: {
  current: MetricsCurrent;
  daily: MetricsDaily[];
}) {
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

export function PlatformContent({
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
        <p className="text-sm">
          Noch keine Daten — starte den ersten Sync im Creator-Profil.
        </p>
      </div>
    );
  }
  if (account.platform === "instagram")
    return <InstagramContent current={current} daily={daily} />;
  return <YouTubeContent current={current} daily={daily} />;
}

export function DisconnectedPlatformTab({
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
            <p className="text-sm text-muted-foreground">
              Es ist noch kein Account verbunden
            </p>
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
              Teile diesen Link mit dem Creator. Er ist 48 Stunden gültig und
              startet den OAuth-Flow direkt.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2.5">
            <p className="flex-1 text-xs font-mono truncate text-muted-foreground">
              {inviteUrl}
            </p>
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
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
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

export function InsightsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-24">
      <TrendingUp className="w-10 h-10 opacity-20" />
      <p className="text-sm font-medium">Keine Plattform konfiguriert</p>
    </div>
  );
}

export { fmtMoney };
