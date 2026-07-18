"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CalendarCard } from "@/components/dashboard/calendar-card";
import { Card } from "@/components/ui/card";
import type { DealFull, Invoice } from "./types";
import {
  LAUFEND,
  PIPELINE,
  INVOICE_STATUS,
  fmtMoney,
  fmtDate,
} from "./constants";
import { BrandAvatar } from "./shared";

function countOverdueInvoices(invoices: Invoice[]): number {
  const now = Date.now();
  return invoices.filter(
    (inv) =>
      (inv.status === "sent" || inv.status === "overdue") &&
      inv.due_date != null &&
      new Date(inv.due_date).getTime() < now,
  ).length;
}

function FinanzenPanel({
  deals,
  invoices,
}: {
  deals: DealFull[];
  invoices: Invoice[];
}) {
  const earned = deals
    .filter((d) => d.status === "paid")
    .reduce((s, d) => s + Number(d.budget), 0);
  const invoiced = deals
    .filter((d) => d.status === "invoiced")
    .reduce((s, d) => s + Number(d.budget), 0);
  const pipelineVal = deals
    .filter((d) => PIPELINE.has(d.status) || LAUFEND.has(d.status))
    .reduce((s, d) => s + Number(d.budget), 0);
  const overdueCount = countOverdueInvoices(invoices);

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
              const isOverdue = countOverdueInvoices([inv]) > 0;
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

export function UebersichtTab({
  creator,
  creatorId,
  deals,
  invoices,
  isPending,
}: {
  creator: import("@/domains/creators/types").Creator | null;
  creatorId: string;
  deals: DealFull[];
  invoices: Invoice[];
  isPending: boolean;
}) {
  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      {creator && (
        <div className="flex items-center gap-4 py-2">
          <span
            className="w-14 h-14 rounded-2xl shrink-0 inline-flex items-center justify-center font-bold text-white text-lg"
            style={{ background: creator.color }}
          >
            {creator.initials}
          </span>
          <div>
            <h2 className="text-2xl font-semibold leading-tight">{creator.full_name}</h2>
            {creator.handle && (
              <p className="text-sm text-muted-foreground">@{creator.handle}</p>
            )}
          </div>
        </div>
      )}
      <FinanzenPanel deals={deals} invoices={invoices} />
      <CalendarCard creatorId={creatorId} />
    </div>
  );
}
