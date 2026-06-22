"use client";

import { cn } from "@/lib/utils";
import type { Invoice } from "./types";
import { INVOICE_STATUS, fmtDate, fmtMoney } from "./constants";
import { BrandAvatar } from "./shared";

export function VertraegeTab({ invoices }: { invoices: Invoice[] }) {
  const now = Date.now();

  return (
    <div className="bg-card rounded-2xl p-5 pb-6">
      <h3 className="text-sm font-semibold mb-4">Rechnungen</h3>
      {invoices.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">
          Keine Rechnungen vorhanden
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border-light">
          {invoices.map((inv) => {
            const style = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.draft;
            const isOverdue =
              (inv.status === "sent" || inv.status === "overdue") &&
              inv.due_date &&
              new Date(inv.due_date).getTime() < now;
            return (
              <div
                key={inv.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                {inv.brands && <BrandAvatar brand={inv.brands} />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{inv.number}</p>
                  {inv.brands && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {inv.brands.company_name}
                    </p>
                  )}
                </div>
                {(inv.due_date || inv.paid_at) && (
                  <span
                    className={cn(
                      "text-[10px] shrink-0",
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
                  className={cn(
                    "shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                    inv.status === "paid"
                      ? "bg-green-500/10 text-green-700"
                      : inv.status === "overdue" || isOverdue
                        ? "bg-red-500/10 text-red-500"
                        : inv.status === "sent"
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-muted text-muted-foreground",
                  )}
                >
                  {style.label}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-xs tabular-nums font-medium",
                    style.color,
                  )}
                >
                  {fmtMoney(Number(inv.amount))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
