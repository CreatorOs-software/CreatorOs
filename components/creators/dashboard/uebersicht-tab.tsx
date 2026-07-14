"use client";

import { AlertCircle, Clock, Loader2, RefreshCw, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { CalendarCard } from "@/components/dashboard/calendar-card";
import { Card } from "@/components/ui/card";
import type { Creator } from "@/domains/creators/types";
import type { DealFull, Invoice } from "./types";
import {
  LAUFEND,
  PIPELINE,
  ALT,
  PLATFORM_ICONS,
  PLATFORM_KEY,
  PRIORITY_DOT,
  INVOICE_STATUS,
  fmtMoney,
  fmtDate,
  daysUntil,
} from "./constants";
import { BrandAvatar, StatusBadge } from "./shared";

function LaufendeDeals({ deals }: { deals: DealFull[] }) {
  const active = deals.filter((d) => LAUFEND.has(d.status));

  return (
    <Card className="p-5 gap-0 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Laufende Deals</h3>
        {active.length > 0 && (
          <span className="text-xs text-muted-foreground">{active.length}</span>
        )}
      </div>

      {active.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">
          Keine laufenden Deals
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border-light">
          {active.map((deal) => {
            const days = deal.deadline ? daysUntil(deal.deadline) : null;
            return (
              <div
                key={deal.id}
                className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      PRIORITY_DOT[deal.priority] ?? PRIORITY_DOT.low,
                    )}
                  />
                  {deal.brands && <BrandAvatar brand={deal.brands} />}
                  <span className="flex-1 text-xs font-medium truncate">
                    {deal.title}
                  </span>
                  <StatusBadge status={deal.status} />
                  <span className="shrink-0 text-xs font-medium tabular-nums">
                    {fmtMoney(Number(deal.budget))}
                  </span>
                </div>

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

                <div className="flex items-center gap-4 pl-6 text-[10px] text-muted-foreground flex-wrap">
                  {days !== null && (
                    <span
                      className={cn(
                        "flex items-center gap-1",
                        days < 0 || days <= 3
                          ? "text-red-500"
                          : days <= 7
                            ? "text-yellow-600"
                            : "",
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
    </Card>
  );
}

function PipelinePanel({ deals }: { deals: DealFull[] }) {
  const pipeline = deals.filter((d) => PIPELINE.has(d.status));

  return (
    <Card className="p-5 gap-0 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Pipeline</h3>
        {pipeline.length > 0 && (
          <span className="text-xs text-muted-foreground">{pipeline.length}</span>
        )}
      </div>

      {pipeline.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          Keine anstehenden Deals
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border-light">
          {pipeline.map((deal) => (
            <div
              key={deal.id}
              className="flex items-center gap-2 py-2.5 first:pt-0 last:pb-0"
            >
              {deal.brands ? (
                <BrandAvatar brand={deal.brands} />
              ) : (
                <span className="w-6 h-6 rounded-md shrink-0 bg-muted" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate leading-tight">
                  {deal.title}
                </p>
                {deal.brands && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {deal.brands.company_name}
                  </p>
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
    </Card>
  );
}

function AlteDealsPanel({ deals }: { deals: DealFull[] }) {
  const old = deals.filter((d) => ALT.has(d.status));

  return (
    <Card className="p-5 gap-0 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Alte Deals</h3>
        {old.length > 0 && (
          <span className="text-xs text-muted-foreground">{old.length}</span>
        )}
      </div>

      {old.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          Keine abgeschlossenen Deals
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border-light">
          {old.map((deal) => (
            <div
              key={deal.id}
              className="flex items-center gap-2 py-2.5 first:pt-0 last:pb-0"
            >
              {deal.brands ? (
                <BrandAvatar brand={deal.brands} size="sm" />
              ) : (
                <span className="w-5 h-5 rounded shrink-0 bg-muted opacity-50" />
              )}
              <p className="flex-1 text-xs text-muted-foreground truncate">
                {deal.title}
              </p>
              <StatusBadge status={deal.status} />
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {fmtMoney(Number(deal.budget))}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function FinanzenPanel({
  deals,
  invoices,
}: {
  deals: DealFull[];
  invoices: Invoice[];
}) {
  const now = Date.now();
  const earned = deals
    .filter((d) => d.status === "paid")
    .reduce((s, d) => s + Number(d.budget), 0);
  const invoiced = deals
    .filter((d) => d.status === "invoiced")
    .reduce((s, d) => s + Number(d.budget), 0);
  const pipelineVal = deals
    .filter((d) => PIPELINE.has(d.status) || LAUFEND.has(d.status))
    .reduce((s, d) => s + Number(d.budget), 0);
  const overdueCount = invoices.filter(
    (inv) =>
      (inv.status === "sent" || inv.status === "overdue") &&
      inv.due_date &&
      new Date(inv.due_date).getTime() < now,
  ).length;

  return (
    <Card className="p-5 rounded-2xl">
      <h3 className="text-sm font-semibold">Finanzen</h3>

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Umsatz kumuliert</span>
          <span className="text-xl font-light tabular-nums">{fmtMoney(earned)}</span>
        </div>
        <div className="h-px bg-border-light" />
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">In Abrechnung</span>
          <span
            className={cn(
              "text-sm tabular-nums",
              invoiced > 0 ? "text-indigo-600" : "text-muted-foreground",
            )}
          >
            {fmtMoney(invoiced)}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Pipeline-Wert</span>
          <span className="text-sm tabular-nums text-muted-foreground">
            {fmtMoney(pipelineVal)}
          </span>
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
                new Date(inv.due_date).getTime() < now;
              return (
                <div key={inv.id} className="flex items-center gap-2">
                  {inv.brands && <BrandAvatar brand={inv.brands} size="sm" />}
                  <span className="flex-1 text-[10px] text-muted-foreground truncate">
                    {inv.number}
                  </span>
                  {(inv.due_date || inv.paid_at) && (
                    <span
                      className={cn(
                        "text-[9px]",
                        isOverdue ? "text-red-500" : "text-muted-foreground",
                      )}
                    >
                      {inv.paid_at
                        ? fmtDate(inv.paid_at)
                        : inv.due_date
                          ? fmtDate(inv.due_date)
                          : ""}
                    </span>
                  )}
                  <span
                    className={cn("text-xs tabular-nums font-medium", style.color)}
                  >
                    {fmtMoney(Number(inv.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}

function GesamtüberblickPanel({
  creator,
  deals,
}: {
  creator: Creator;
  deals: DealFull[];
}) {
  const totalRevenue = deals
    .filter((d) => d.status === "paid")
    .reduce((s, d) => s + Number(d.budget), 0);
  const activeCount = deals.filter((d) => LAUFEND.has(d.status)).length;
  const paidCount = deals.filter((d) => d.status === "paid").length;

  return (
    <Card className="p-5 rounded-2xl">
      <h3 className="text-sm font-semibold">Gesamtüberblick</h3>

      <div className="flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Plattformen
        </p>
        {creator.platforms.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Keine Plattformen konfiguriert
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {creator.platforms.map((p) => {
              const key = PLATFORM_KEY[p] ?? p.toLowerCase();
              return (
                <div
                  key={p}
                  className="flex items-center gap-1.5 text-xs bg-muted px-2 py-1 rounded-lg"
                >
                  <span className="text-sm leading-none opacity-70">
                    {PLATFORM_ICONS[key] ?? null}
                  </span>
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
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Umsatz kumuliert
        </p>
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
        {creator.status === "active"
          ? "Aktiv"
          : creator.status === "on-break"
            ? "Pause"
            : "Inaktiv"}
      </div>
    </Card>
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
      todos.push({ text: `Freigabe ausstehend: ${deal.title}`, priority: "med" });
    }
  });

  return (
    <Card className="p-5 gap-0 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Aufgaben</h3>
        {todos.length > 0 && (
          <span className="text-xs text-muted-foreground">{todos.length}</span>
        )}
      </div>

      {todos.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          Keine offenen Aufgaben
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border-light">
          {todos.map((todo, i) => (
            <div
              key={i}
              className="flex items-center gap-2 py-2 first:pt-0 last:pb-0"
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  PRIORITY_DOT[todo.priority],
                )}
              />
              <p className="flex-1 text-xs">{todo.text}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function UebersichtTab({
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
      <div className="xl:col-span-7 flex flex-col gap-4">
        <LaufendeDeals deals={deals} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PipelinePanel deals={deals} />
          <AlteDealsPanel deals={deals} />
        </div>
        <CalendarCard creatorId={creatorId} />
      </div>

      <div className="xl:col-span-5 flex flex-col gap-4">
        <GesamtüberblickPanel creator={creator} deals={deals} />
        <FinanzenPanel deals={deals} invoices={invoices} />
        <AufgabenPanel deals={deals} />
      </div>
    </div>
  );
}
