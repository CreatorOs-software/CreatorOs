"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBar, StatusBarGroup } from "@/components/dashboard/status-bar";
import { cn } from "@/lib/utils";
import { usePageHeader } from "@/components/layout/page-header-context";
import type { Creator } from "@/domains/creators/types";

import {
  PLATFORM_ICONS,
  PLATFORM_LABEL,
  PLATFORM_KEY,
  fmt,
  fmtMoney,
} from "@/components/creators/dashboard/constants";
import type {
  MetricsResponse,
  DealFull,
  Invoice,
  Anfrage,
} from "@/components/creators/dashboard/types";
import { DashboardSkeleton } from "@/components/creators/dashboard/skeleton";
import {
  PlatformContent,
  DisconnectedPlatformTab,
  InsightsEmptyState,
} from "@/components/creators/dashboard/insights-tab";
import { VertraegeTab } from "@/components/creators/dashboard/vertraege-tab";
import { DealsTab } from "@/components/creators/dashboard/deals-tab";

export default function CreatorDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { setConfig } = usePageHeader();

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: creatorData, isPending: creatorPending } = useQuery<{
    creator: Creator;
  }>({
    queryKey: ["creator", id],
    queryFn: () => fetch(`/api/creators/${id}`).then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const { data: metricsData, isPending: metricsPending } =
    useQuery<MetricsResponse>({
      queryKey: ["creator-metrics", id],
      queryFn: () => fetch(`/api/creators/${id}/metrics`).then((r) => r.json()),
      staleTime: 5 * 60_000,
    });

  const { data: dealsData } = useQuery<{
    deals: DealFull[];
  }>({
    queryKey: ["creator-deals-full", id],
    queryFn: () => fetch(`/api/creators/${id}/deals`).then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const { data: invoicesData } = useQuery<{ invoices: Invoice[] }>({
    queryKey: ["creator-invoices", id],
    queryFn: () => fetch(`/api/creators/${id}/invoices`).then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const { data: anfragenData } = useQuery<{ anfragen: Anfrage[] }>({
    queryKey: ["creator-anfragen", id],
    queryFn: () => fetch(`/api/creators/${id}/anfragen`).then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  // ── Derived state ─────────────────────────────────────────────────────────────

  const creator = creatorData?.creator ?? null;
  const accounts = metricsData?.accounts ?? [];
  const metrics = metricsData?.metrics ?? {};
  const deals = dealsData?.deals ?? [];
  const invoices = invoicesData?.invoices ?? [];
  const anfragen = anfragenData?.anfragen ?? [];

  const activeAccounts = accounts.filter(
    (a) => a.sync_status !== "disconnected",
  );
  const firstAccount = activeAccounts[0];
  const firstCurrent = firstAccount
    ? (metrics[firstAccount.id]?.current ?? null)
    : null;
  const connectedKeys = new Set(
    activeAccounts.map((a) => a.platform as string),
  );
  const disconnectedDisplayNames = (creator?.platforms ?? []).filter(
    (p) => !connectedKeys.has(PLATFORM_KEY[p] ?? p.toLowerCase()),
  );
  const hasPlatforms = (creator?.platforms ?? []).length > 0;
  const disTabValue = (displayName: string) =>
    `dis-${PLATFORM_KEY[displayName] ?? displayName.toLowerCase()}`;
  const defaultInsightsTab =
    firstAccount?.id ??
    (disconnectedDisplayNames[0]
      ? disTabValue(disconnectedDisplayNames[0])
      : undefined);

  // ── Page header ───────────────────────────────────────────────────────────────

  const STATUS_BADGE = {
    active: { label: "Aktiv", bg: "bg-green-500/15", text: "text-green-700" },
    "on-break": {
      label: "Pause",
      bg: "bg-yellow-400/15",
      text: "text-yellow-700",
    },
    inactive: {
      label: "Inaktiv",
      bg: "bg-muted",
      text: "text-muted-foreground",
    },
  } as const;

  useEffect(() => {
    if (!creator) return;
    const badge =
      STATUS_BADGE[creator.status as keyof typeof STATUS_BADGE] ??
      STATUS_BADGE.inactive;
    setConfig({
      onBack: () => router.back(),
      title: (
        <div className="flex items-center gap-2">
          <span
            className="w-8 h-8 rounded-xl inline-flex items-center justify-center font-bold text-white text-xs shrink-0"
            style={{ background: creator.color }}
          >
            {creator.initials}
          </span>
          <span className="text-sm font-semibold">
            {creator.handle ?? creator.full_name}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
              badge.bg,
              badge.text,
            )}
          >
            <span className="w-1 h-1 rounded-full bg-current" />
            {badge.label}
          </span>
        </div>
      ),
      subtitle: [
        ...creator.niche,
        creator.followers ? `${creator.followers} Follower` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });
    return () => setConfig(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creator]);

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (creatorPending) return <DashboardSkeleton />;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      <Tabs
        defaultValue="deals"
        className="flex-1 min-h-0 flex flex-col gap-0"
      >
        {/* Tab bar */}
        <div className="shrink-0 -mx-6 px-6 mb-4 flex items-end justify-between ">
          <TabsList variant="underline">
            <TabsTrigger value="deals">Deals</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="vertraege">Verträge</TabsTrigger>
          </TabsList>

          <div className="flex gap-2 mb-0.5">
            <Button
              variant="outline"
              onClick={() => router.push(`/creators/edit-form/${id}`)}
            >
              <Pencil className="w-3.5 h-3.5" />
              Bearbeiten
            </Button>
            <Button
              variant="default"
              onClick={() => router.push(`/creators/deals/create-deal/${id}`)}
            >
              <Plus className="w-3.5 h-3.5" />
              Neuer Deal
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Deals */}
          <TabsContent value="deals">
            <DealsTab deals={deals} anfragen={anfragen} creator={creator} creatorId={id} />
          </TabsContent>
          {/* Insights */}
          <TabsContent value="insights">
            {metricsPending ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !hasPlatforms ? (
              <InsightsEmptyState />
            ) : (
              <Tabs
                defaultValue={defaultInsightsTab}
                className="flex flex-col gap-6 pb-6"
              >
                <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
                  <div>
                    {firstCurrent && (
                      <StatusBarGroup>
                        <StatusBar
                          label="Abonnenten"
                          value={fmt(firstCurrent.audience)}
                          variant="dark"
                        />
                        <StatusBar
                          label="Views (30d)"
                          value={fmt(firstCurrent.views_30d)}
                          variant="yellow"
                        />
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

          {/* Verträge */}
          <TabsContent value="vertraege">
            <VertraegeTab invoices={invoices} creatorId={id} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
