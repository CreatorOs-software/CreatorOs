"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  DollarSign,
  Eye,
  Loader2,
  Pencil,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  SiInstagram,
  SiOnlyfans,
  SiSpotify,
  SiTiktok,
  SiX,
  SiYoutube,
} from "react-icons/si";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { CreatorAccount, MetricsCurrent, MetricsDaily } from "@/domains/social-accounts/types";
import type { Creator } from "@/domains/creators/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type MetricsResponse = {
  accounts: CreatorAccount[];
  metrics: Record<string, { current: MetricsCurrent | null; daily: MetricsDaily[] }>;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube: <SiYoutube />,
  instagram: <SiInstagram />,
  tiktok: <SiTiktok />,
  spotify: <SiSpotify />,
  onlyfans: <SiOnlyfans />,
  x: <SiX />,
};

const PLATFORM_LABEL: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  spotify: "Spotify",
  onlyfans: "OnlyFans",
  x: "X",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="flex-1 min-w-0 rounded-xl border border-border-light bg-card px-5 py-4 flex gap-4 items-start">
      <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 text-base">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
  formatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border-light bg-card shadow-md px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold">
          {formatter ? formatter(p.value) : fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Platform Content ─────────────────────────────────────────────────────────

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
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
        <TrendingUp className="w-8 h-8 opacity-20" />
        <p className="text-sm">Noch keine Daten.</p>
        <p className="text-xs">Starte den ersten Sync im Creator-Profil.</p>
      </div>
    );
  }

  const audienceData = daily.map((d) => ({
    date: fmtDate(d.date),
    value: d.audience ?? 0,
  }));

  const viewsData = daily.map((d) => ({
    date: fmtDate(d.date),
    value: d.views ?? 0,
  }));

  const hasDaily = daily.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Stats row */}
      <div className="flex gap-3 flex-wrap">
        <StatCard
          label="Abonnenten"
          value={fmt(current.audience)}
          icon={<Users className="w-4 h-4" />}
          sub={
            current.audience_growth_30d
              ? `${current.audience_growth_30d > 0 ? "+" : ""}${fmt(current.audience_growth_30d)} (30d)`
              : undefined
          }
        />
        <StatCard
          label="Views (30d)"
          value={fmt(current.views_30d)}
          icon={<Eye className="w-4 h-4" />}
        />
        <StatCard
          label="Engagement Rate"
          value={`${current.engagement_rate?.toFixed(1) ?? "0"}%`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        {current.monthly_revenue != null && (
          <StatCard
            label="MTD Revenue"
            value={`$${(current.monthly_revenue / 1000).toFixed(1)}k`}
            icon={<DollarSign className="w-4 h-4" />}
          />
        )}
        {current.subscribers_gained_30d > 0 && (
          <StatCard
            label="Abo-Gewinn (30d)"
            value={`+${fmt(current.subscribers_gained_30d)}`}
            icon={<Users className="w-4 h-4" />}
            sub={
              current.subscribers_lost_30d > 0
                ? `−${fmt(current.subscribers_lost_30d)} verloren`
                : undefined
            }
          />
        )}
        {current.avg_view_duration_secs > 0 && (
          <StatCard
            label="Avg. View-Zeit"
            value={`${Math.floor(current.avg_view_duration_secs / 60)}:${String(Math.round(current.avg_view_duration_secs % 60)).padStart(2, "0")}`}
            icon={<Eye className="w-4 h-4" />}
            sub={
              current.watch_time_hours_30d > 0
                ? `${current.watch_time_hours_30d.toFixed(0)}h gesamt (30d)`
                : undefined
            }
          />
        )}
      </div>

      {hasDaily ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Audience Trend */}
          <div className="rounded-xl border border-border-light bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-4">
              Abonnenten (30d)
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={audienceData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="colorAudience" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-yellow)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--chart-yellow)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={fmt}
                  width={40}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--chart-yellow)"
                  strokeWidth={2}
                  fill="url(#colorAudience)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Views per day */}
          <div className="rounded-xl border border-border-light bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-4">
              Views pro Tag (30d)
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={viewsData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={fmt}
                  width={40}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="value"
                  fill="var(--chart-yellow)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border-light bg-muted/30 flex items-center justify-center py-12 text-xs text-muted-foreground">
          Noch keine Verlaufsdaten. Daten erscheinen nach dem ersten Sync.
        </div>
      )}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreatorDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: creatorData } = useQuery<{ creator: Creator }>({
    queryKey: ["creator", id],
    queryFn: () => fetch(`/api/creators/${id}`).then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const { data: metricsData, isPending } = useQuery<MetricsResponse>({
    queryKey: ["creator-metrics", id],
    queryFn: () => fetch(`/api/creators/${id}/metrics`).then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const creator = creatorData?.creator ?? null;
  const accounts = metricsData?.accounts ?? [];
  const metrics = metricsData?.metrics ?? {};

  const activeAccounts = accounts.filter((a) => a.sync_status !== "disconnected");

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        {creator ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar c={creator} />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">
                {creator.full_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {creator.handle ?? "—"} · {creator.niche ?? "—"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(`/creators/edit-form/${id}`)}
          className="shrink-0"
        >
          <Pencil className="w-3.5 h-3.5 mr-1.5" />
          Bearbeiten
        </Button>
      </div>

      {/* Content */}
      {isPending ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : activeAccounts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <TrendingUp className="w-10 h-10 opacity-20" />
          <p className="text-sm font-medium">Keine Plattform verbunden</p>
          <p className="text-xs">Verbinde eine Plattform im Creator-Profil.</p>
        </div>
      ) : (
        <Tabs
          defaultValue={activeAccounts[0]?.id}
          className="flex-1 min-h-0 flex flex-col"
        >
          <TabsList variant="line" className="shrink-0 mb-5">
            {activeAccounts.map((a) => (
              <TabsTrigger key={a.id} value={a.id} className="gap-1.5 px-3">
                <span className="text-base leading-none">
                  {PLATFORM_ICONS[a.platform] ?? null}
                </span>
                {PLATFORM_LABEL[a.platform] ?? a.platform}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 min-h-0 overflow-y-auto pb-4">
            {activeAccounts.map((a) => (
              <TabsContent key={a.id} value={a.id}>
                <PlatformContent
                  account={a}
                  current={metrics[a.id]?.current ?? null}
                  daily={metrics[a.id]?.daily ?? []}
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      )}
    </div>
  );
}
