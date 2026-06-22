"use client";

import { Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Creator } from "@/domains/creators/types";
import type { DealFull } from "./types";
import {
  LAUFEND,
  PIPELINE,
  ALT,
  PLATFORM_ICONS,
  PLATFORM_KEY,
  PRIORITY_DOT,
  STATUS_STYLE,
  fmtMoney,
  fmtDate,
  daysUntil,
} from "./constants";
import { BrandAvatar } from "./shared";

// ── Helpers ────────────────────────────────────────────────────────────────────

const STAGE_ORDER = [
  "incoming", "evaluating", "negotiation", "confirmed",
  "production", "approval", "scheduled", "posted", "invoiced", "paid",
];

function dealProgress(status: string): number {
  const idx = STAGE_ORDER.indexOf(status);
  return idx < 0 ? 0 : Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
}

function sinceLabel(deals: DealFull[]): string | null {
  const paid = deals
    .filter((d) => ALT.has(d.status))
    .map((d) => new Date(d.created_at).getTime())
    .sort((a, b) => a - b);
  if (!paid.length) return null;
  return new Date(paid[0]).toLocaleDateString("de-DE", { month: "short", year: "numeric" });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub: string | null;
}) {
  return (
    <div className="bg-card rounded-2xl px-5 py-4 flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </span>
      <span className="text-2xl font-light leading-tight">{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function LaufendRow({ deal }: { deal: DealFull }) {
  const days = deal.deadline ? daysUntil(deal.deadline) : null;
  const pct = dealProgress(deal.status);
  const style = STATUS_STYLE[deal.status];
  const platformKey = deal.platform
    ? deal.platform
    : deal.deliverables[0]
      ? PLATFORM_KEY[deal.deliverables[0]] ?? null
      : null;

  return (
    <div className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5 w-52 shrink-0">
        {deal.brands ? (
          <BrandAvatar brand={deal.brands} />
        ) : (
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0",
              PRIORITY_DOT[deal.priority] ?? PRIORITY_DOT.low,
            )}
          />
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium truncate leading-tight">{deal.title}</p>
          {deal.brands && (
            <p className="text-[10px] text-muted-foreground truncate">
              {deal.brands.company_name}
            </p>
          )}
        </div>
      </div>

      {/* Platform + progress */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {platformKey ? (
          <div className="flex items-center gap-1.5">
            <span className="text-sm leading-none opacity-50">
              {PLATFORM_ICONS[platformKey] ?? null}
            </span>
            <span className="text-[10px] text-muted-foreground capitalize">
              {platformKey === "youtube"
                ? "YouTube"
                : platformKey.charAt(0).toUpperCase() + platformKey.slice(1)}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground/40">—</span>
        )}
        <div className="h-1 w-full max-w-40 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-400"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Status + amount + deadline */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        {style && (
          <span
            className={cn(
              "text-[9px] font-medium px-2 py-0.5 rounded-full",
              style.bg,
              style.text,
            )}
          >
            {style.label}
          </span>
        )}
        <span className="text-xs font-medium tabular-nums">
          {fmtMoney(Number(deal.budget))}
        </span>
        {days !== null && (
          <span
            className={cn(
              "text-[9px] flex items-center gap-0.5",
              days < 0 || days <= 3
                ? "text-red-500"
                : days <= 7
                  ? "text-yellow-600"
                  : "text-muted-foreground",
            )}
          >
            <Clock className="w-2.5 h-2.5" />
            bis {fmtDate(deal.deadline!)}
          </span>
        )}
      </div>
    </div>
  );
}

function PipelineCard({ deals }: { deals: DealFull[] }) {
  return (
    <div className="bg-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Pipeline</h3>
        {deals.length > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/15 text-blue-600 text-[9px] font-medium">
            {deals.length}
          </span>
        )}
      </div>
      {deals.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          Keine anstehenden Deals
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border-light">
          {deals.map((deal) => {
            const style = STATUS_STYLE[deal.status];
            return (
              <div
                key={deal.id}
                className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0"
              >
                {deal.brands ? (
                  <BrandAvatar brand={deal.brands} />
                ) : (
                  <span className="w-6 h-6 rounded-md shrink-0 bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate leading-tight">
                    {deal.brands?.company_name ?? deal.title}
                  </p>
                  {style && (
                    <p className="text-[10px] text-muted-foreground">{style.label}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {fmtMoney(Number(deal.budget))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AlteDealsCard({ deals }: { deals: DealFull[] }) {
  return (
    <div className="bg-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Alte Deals</h3>
        {deals.length > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground text-[9px] font-medium">
            {deals.length}
          </span>
        )}
      </div>
      {deals.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          Keine abgeschlossenen Deals
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border-light">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0"
            >
              {deal.brands ? (
                <BrandAvatar brand={deal.brands} size="sm" />
              ) : (
                <span className="w-5 h-5 rounded shrink-0 bg-muted opacity-50" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {deal.brands?.company_name ?? deal.title}
                </p>
                {deal.deadline && (
                  <p className="text-[10px] text-muted-foreground/60">
                    {new Date(deal.deadline).toLocaleDateString("de-DE", {
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
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

function KonditionenCard({ creator }: { creator: Creator }) {
  const rates = creator.rates ?? [];
  const dreamBrands = creator.dream_brands ?? [];
  const wishThemes = creator.wish_themes ?? [];
  const noGo = creator.no_go ?? [];
  const hasTags = dreamBrands.length > 0 || wishThemes.length > 0 || noGo.length > 0;

  return (
    <div className="bg-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold">Konditionen</h3>
        <Button variant="ghost" size="sm" className="text-xs h-7">
          Bearbeiten
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Standardpreise */}
        <div className="flex flex-col gap-3">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
            Standardpreise
          </p>
          {rates.length === 0 ? (
            <p className="text-xs text-muted-foreground">Keine Preise hinterlegt</p>
          ) : (
            <div className="flex flex-col divide-y divide-border-light">
              {rates.map((rate, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
                >
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {rate.label}
                    {rate.bundle && (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-600">
                        Bundle
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-medium tabular-nums">
                    {fmtMoney(rate.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Tags */}
        {hasTags && (
          <div className="flex flex-col gap-5">
            {creator.dream_brands.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                  Traumkooperationen
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {creator.dream_brands.map((b) => (
                    <span
                      key={b}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-foreground"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {creator.wish_themes.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                  Wunsch-Themen
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {creator.wish_themes.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {creator.no_go.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                  No-Go
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {creator.no_go.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────────

export function DealsTab({
  deals,
  creator,
}: {
  deals: DealFull[];
  creator: Creator | null;
}) {
  const laufend = deals.filter((d) => LAUFEND.has(d.status));
  const pipeline = deals.filter((d) => PIPELINE.has(d.status));
  const alt = deals.filter((d) => ALT.has(d.status));

  const activeBudget = laufend.reduce((s, d) => s + Number(d.budget), 0);
  const pipelineBudget = pipeline.reduce((s, d) => s + Number(d.budget), 0);
  const since = sinceLabel(deals);
  const verhandlung = pipeline.filter((d) => d.status === "negotiation").length;

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Laufende Deals"
          value={laufend.length}
          sub={`${fmtMoney(activeBudget)} Volumen`}
        />
        <StatCard
          label="Pipeline-Wert"
          value={fmtMoney(pipelineBudget)}
          sub={
            verhandlung > 0
              ? `${verhandlung} Deal${verhandlung > 1 ? "s" : ""} in Verhandlung`
              : `${pipeline.length} Deal${pipeline.length !== 1 ? "s" : ""}`
          }
        />
        <StatCard
          label="Abgeschlossene Kooperationen"
          value={alt.length}
          sub={since ? `seit ${since}` : null}
        />
      </div>

      {/* Laufende Deals */}
      <div className="bg-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Laufende Deals</h3>
          <Button size="sm" variant="default" className="gap-1.5 h-7 text-xs">
            <Plus className="w-3 h-3" />
            Neuer Deal
          </Button>
        </div>
        {laufend.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            Keine laufenden Deals
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border-light">
            {laufend.map((deal) => (
              <LaufendRow key={deal.id} deal={deal} />
            ))}
          </div>
        )}
      </div>

      {/* Pipeline + Alte Deals */}
      <div className="grid grid-cols-2 gap-4">
        <PipelineCard deals={pipeline} />
        <AlteDealsCard deals={alt} />
      </div>

      {/* Konditionen */}
      {creator && <KonditionenCard creator={creator} />}
    </div>
  );
}
