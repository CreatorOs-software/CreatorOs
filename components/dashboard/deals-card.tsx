"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Deal = {
  id: string;
  title: string;
  budget: number;
  status: string;
  priority: string;
  deadline: string | null;
  campaign_type: string | null;
  brands: { company_name: string; color: string; short_code: string } | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBudget(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(1)}K`;
  return `€${n}`;
}

function fmtDeadline(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DealsCardProps {
  creatorId: string;
  className?: string;
}

export function DealsCard({ creatorId, className }: DealsCardProps) {
  const { data, isPending } = useQuery<{ deals: Deal[] }>({
    queryKey: ["creator-deals", creatorId],
    queryFn: () =>
      fetch(`/api/creators/${creatorId}/deals`).then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const deals = data?.deals ?? [];

  return (
    <Card className={cn("rounded-2xl p-5 gap-0 ring-0 flex flex-col", className)}>
      <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
        <span className="text-sm font-semibold">Deals</span>
        {deals.length > 0 && (
          <span className="text-xs text-muted-foreground">{deals.length}</span>
        )}
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0 overflow-y-auto">
        {isPending ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : deals.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            Noch keine Deals vorhanden
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border-light">
            {deals.map((deal) => {
              const status = STATUS_STYLE[deal.status] ?? STATUS_STYLE.incoming;
              return (
                <div
                  key={deal.id}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  {/* Priority dot */}
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      PRIORITY_DOT[deal.priority] ?? PRIORITY_DOT.low,
                    )}
                  />

                  {/* Brand avatar */}
                  {deal.brands ? (
                    <span
                      className="w-6 h-6 rounded-md shrink-0 inline-flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ background: deal.brands.color }}
                      title={deal.brands.company_name}
                    >
                      {deal.brands.short_code.slice(0, 2).toUpperCase()}
                    </span>
                  ) : (
                    <span className="w-6 h-6 rounded-md shrink-0 bg-muted" />
                  )}

                  {/* Title + campaign type */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-tight">
                      {deal.title}
                    </p>
                    {deal.campaign_type && (
                      <p className="text-[10px] text-muted-foreground leading-tight truncate">
                        {deal.campaign_type}
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <span
                    className={cn(
                      "shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full leading-none",
                      status.bg,
                      status.text,
                    )}
                  >
                    {status.label}
                  </span>

                  {/* Budget */}
                  <span className="shrink-0 text-xs font-medium tabular-nums">
                    {fmtBudget(Number(deal.budget))}
                  </span>

                  {/* Deadline */}
                  {deal.deadline && (
                    <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                      {fmtDeadline(deal.deadline)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
